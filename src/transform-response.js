import { streamSSE } from 'hono/streaming';

// Map OpenAI finish_reason → Anthropic stop_reason
function mapStopReason(finishReason, hadStopSequences) {
  if (finishReason === 'stop' && hadStopSequences) return 'stop_sequence';
  const map = {
    stop: 'end_turn',
    length: 'max_tokens',
    tool_calls: 'tool_use',
    content_filter: 'end_turn',
  };
  return map[finishReason] || 'end_turn';
}

// Build Anthropic content array from OpenAI response message
function buildContentBlocks(message) {
  const content = [];
  if (message?.content) {
    content.push({ type: 'text', text: message.content });
  }
  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      let input = {};
      try {
        input = JSON.parse(tc.function.arguments || '{}');
      } catch {
        input = {};
      }
      content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input });
    }
  }
  return content.length ? content : [{ type: 'text', text: '' }];
}

// Transform non-streaming OpenAI response → Anthropic response
export function transformResponse(openaiResponse, anthropicRequest) {
  const choice = openaiResponse.choices[0];
  const hadStopSequences = Boolean(anthropicRequest.stop_sequences?.length);

  return {
    id: `msg_${crypto.randomUUID()}`,
    type: 'message',
    role: 'assistant',
    content: buildContentBlocks(choice?.message),
    model: anthropicRequest.model,
    stop_reason: mapStopReason(choice?.finish_reason, hadStopSequences),
    usage: {
      input_tokens: openaiResponse.usage?.prompt_tokens || 0,
      output_tokens: openaiResponse.usage?.completion_tokens || 0,
    },
  };
}

// Write a single SSE event
async function writeEvent(stream, event, data) {
  await stream.writeSSE({ event, data: JSON.stringify(data) });
}

// Stream OpenAI response → Anthropic SSE events
export function streamAnthropicResponse(c, openaiStream, anthropicRequest) {
  const hadStopSequences = Boolean(anthropicRequest.stop_sequences?.length);

  return streamSSE(c, async (stream) => {
    const messageId = `msg_${crypto.randomUUID()}`;
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = null;

    // Streaming state for content blocks
    let blockIndex = 0;
    let textBlockStarted = false;
    const toolCallBuffers = {}; // index → { id, name, arguments }

    // Send message_start
    await writeEvent(stream, 'message_start', {
      type: 'message_start',
      message: {
        id: messageId, type: 'message', role: 'assistant',
        content: [], model: anthropicRequest.model,
        stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 },
      },
    });

    for await (const chunk of openaiStream) {
      const choice = chunk.choices[0];
      const delta = choice?.delta;

      // Track finish_reason from final chunk
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }

      // Handle text content delta
      if (delta?.content) {
        if (!textBlockStarted) {
          await writeEvent(stream, 'content_block_start', {
            type: 'content_block_start', index: blockIndex,
            content_block: { type: 'text', text: '' },
          });
          textBlockStarted = true;
        }
        await writeEvent(stream, 'content_block_delta', {
          type: 'content_block_delta', index: blockIndex,
          delta: { type: 'text_delta', text: delta.content },
        });
      }

      // Handle tool_calls delta
      if (delta?.tool_calls) {
        // Close text block before starting tool blocks
        if (textBlockStarted) {
          await writeEvent(stream, 'content_block_stop', {
            type: 'content_block_stop', index: blockIndex,
          });
          textBlockStarted = false;
          blockIndex++;
        }

        for (const tc of delta.tool_calls) {
          const idx = tc.index;

          if (tc.id) {
            // New tool call starting
            toolCallBuffers[idx] = { id: tc.id, name: tc.function?.name || '', arguments: '' };
            await writeEvent(stream, 'content_block_start', {
              type: 'content_block_start', index: blockIndex + idx,
              content_block: { type: 'tool_use', id: tc.id, name: tc.function?.name || '' },
            });
          }

          if (tc.function?.arguments) {
            toolCallBuffers[idx].arguments += tc.function.arguments;
            await writeEvent(stream, 'content_block_delta', {
              type: 'content_block_delta', index: blockIndex + idx,
              delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
            });
          }
        }
      }

      // Capture usage from final chunk (requires stream_options.include_usage)
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || inputTokens;
        outputTokens = chunk.usage.completion_tokens || outputTokens;
      }
    }

    // Close any open text block
    if (textBlockStarted) {
      await writeEvent(stream, 'content_block_stop', {
        type: 'content_block_stop', index: blockIndex,
      });
    }

    // Close any open tool call blocks
    for (const idx of Object.keys(toolCallBuffers)) {
      await writeEvent(stream, 'content_block_stop', {
        type: 'content_block_stop', index: blockIndex + Number(idx),
      });
    }

    // Send message_delta with final stop_reason and usage
    await writeEvent(stream, 'message_delta', {
      type: 'message_delta',
      delta: { stop_reason: mapStopReason(finishReason, hadStopSequences) },
      usage: { output_tokens: outputTokens },
    });

    // Send message_stop
    await writeEvent(stream, 'message_stop', { type: 'message_stop' });
  });
}
