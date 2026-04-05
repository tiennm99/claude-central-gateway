// Transform Anthropic Messages API request → OpenAI Chat Completions API request

// Build complete OpenAI request payload from Anthropic request
export function buildOpenAIRequest(anthropicRequest, model) {
  const payload = {
    model,
    messages: transformMessages(anthropicRequest),
    max_tokens: anthropicRequest.max_tokens,
    temperature: anthropicRequest.temperature,
    top_p: anthropicRequest.top_p,
  };

  if (anthropicRequest.stream === true) {
    payload.stream = true;
    payload.stream_options = { include_usage: true };
  }

  if (anthropicRequest.stop_sequences?.length) {
    payload.stop = anthropicRequest.stop_sequences;
  }

  if (anthropicRequest.tools?.length) {
    payload.tools = anthropicRequest.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));
  }

  if (anthropicRequest.tool_choice) {
    payload.tool_choice = mapToolChoice(anthropicRequest.tool_choice);
  }

  return payload;
}

// Map Anthropic tool_choice → OpenAI tool_choice
function mapToolChoice(tc) {
  if (tc.type === 'auto') return 'auto';
  if (tc.type === 'any') return 'required';
  if (tc.type === 'none') return 'none';
  if (tc.type === 'tool') return { type: 'function', function: { name: tc.name } };
  return 'auto';
}

// Transform Anthropic messages array → OpenAI messages array
function transformMessages(request) {
  const messages = [];

  // System message: string or array of text blocks
  if (request.system) {
    const systemText = typeof request.system === 'string'
      ? request.system
      : request.system.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n');
    if (systemText) {
      messages.push({ role: 'system', content: systemText });
    }
  }

  for (const msg of request.messages || []) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
      continue;
    }

    if (!Array.isArray(msg.content)) continue;

    if (msg.role === 'assistant') {
      transformAssistantMessage(msg, messages);
    } else {
      transformUserMessage(msg, messages);
    }
  }

  return messages;
}

// Transform assistant message with potential tool_use blocks
function transformAssistantMessage(msg, messages) {
  const content = [];
  const toolCalls = [];

  for (const part of msg.content) {
    if (part.type === 'text') {
      content.push({ type: 'text', text: part.text });
    } else if (part.type === 'tool_use') {
      toolCalls.push({
        id: part.id,
        type: 'function',
        function: { name: part.name, arguments: JSON.stringify(part.input) },
      });
    }
    // Skip thinking, cache_control, and other unsupported blocks
  }

  const openaiMsg = { role: 'assistant' };

  // Set content: string for text-only, null if only tool_calls
  if (content.length === 1 && content[0].type === 'text') {
    openaiMsg.content = content[0].text;
  } else if (content.length > 1) {
    openaiMsg.content = content;
  } else {
    openaiMsg.content = null;
  }

  if (toolCalls.length) {
    openaiMsg.tool_calls = toolCalls;
  }

  messages.push(openaiMsg);
}

// Transform user message with potential tool_result and mixed content blocks
function transformUserMessage(msg, messages) {
  const content = [];
  const toolResults = [];

  for (const part of msg.content) {
    if (part.type === 'text') {
      content.push({ type: 'text', text: part.text });
    } else if (part.type === 'image') {
      if (part.source?.type === 'base64') {
        content.push({
          type: 'image_url',
          image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` },
        });
      } else if (part.source?.type === 'url') {
        content.push({ type: 'image_url', image_url: { url: part.source.url } });
      }
    } else if (part.type === 'tool_result') {
      const resultContent = extractToolResultContent(part);
      toolResults.push({
        role: 'tool',
        tool_call_id: part.tool_use_id,
        content: resultContent,
      });
    }
  }

  // Each tool_result becomes a separate OpenAI tool message
  for (const tr of toolResults) {
    messages.push(tr);
  }

  // Non-tool content becomes a user message
  if (content.length === 1 && content[0].type === 'text') {
    messages.push({ role: 'user', content: content[0].text });
  } else if (content.length > 0) {
    messages.push({ role: 'user', content });
  }
}

// Extract text content from tool_result (string, array, or undefined)
function extractToolResultContent(part) {
  const prefix = part.is_error ? '[ERROR] ' : '';
  if (typeof part.content === 'string') return prefix + part.content;
  if (!part.content) return prefix || '';
  const text = part.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return prefix + text;
}
