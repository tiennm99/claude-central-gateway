import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import OpenAI from 'openai';

const app = new Hono();

// Parse model mapping from env var
function parseModelMap(envVar) {
  if (!envVar) return {};
  return Object.fromEntries(
    envVar.split(',').map(pair => {
      const [claude, provider] = pair.trim().split(':');
      return [claude, provider];
    })
  );
}

// Map Claude model to provider model
function mapModel(claudeModel, env) {
  const modelMap = parseModelMap(env.MODEL_MAP);
  return modelMap[claudeModel] || claudeModel;
}

// Transform Anthropic messages to OpenAI format
function transformMessages(request) {
  const messages = [];

  // Add system message if present
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }

  // Transform messages array
  for (const msg of request.messages || []) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      // Handle multi-part content
      const content = [];

      for (const part of msg.content) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
        } else if (part.type === 'image') {
          if (part.source?.type === 'base64') {
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${part.source.media_type};base64,${part.source.data}`
              }
            });
          } else if (part.source?.type === 'url') {
            content.push({
              type: 'image_url',
              image_url: { url: part.source.url }
            });
          }
        }
      }

      messages.push({ role: msg.role, content });
    }
  }

  return messages;
}

// Format Anthropic SSE event
function formatSSE(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Auth middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (token !== c.env.GATEWAY_TOKEN) {
    return c.json({ type: 'error', error: { type: 'authentication_error', message: 'Unauthorized' } }, 401);
  }

  await next();
});

// POST /v1/messages
app.post('/messages', async (c) => {
  const env = c.env;

  // Validate OpenAI API key
  if (!env.OPENAI_API_KEY) {
    return c.json({ type: 'error', error: { type: 'api_error', message: 'OPENAI_API_KEY not configured' } }, 500);
  }

  try {
    const anthropicRequest = await c.req.json();
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });

    const messages = transformMessages(anthropicRequest);
    const model = mapModel(anthropicRequest.model, env);
    const streamResponse = anthropicRequest.stream !== false;

    if (streamResponse) {
      // Streaming response
      const streamResponse = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: anthropicRequest.max_tokens,
        temperature: anthropicRequest.temperature,
        top_p: anthropicRequest.top_p
      });

      let messageId = `msg_${Date.now()}`;
      let outputTokens = 0;

      return stream(c, async (s) => {
        // Send message_start event
        s.write(formatSSE('message_start', {
          type: 'message_start',
          message: {
            id: messageId,
            type: 'message',
            role: 'assistant',
            content: [],
            model: anthropicRequest.model,
            stop_reason: null,
            usage: { input_tokens: 0, output_tokens: 0 }
          }
        }));

        // Send content_block_start
        s.write(formatSSE('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' }
        }));

        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            s.write(formatSSE('content_block_delta', {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: delta.content }
            }));
          }

          if (chunk.usage) {
            outputTokens = chunk.usage.completion_tokens || outputTokens;
          }
        }

        // Send content_block_stop
        s.write(formatSSE('content_block_stop', {
          type: 'content_block_stop',
          index: 0
        }));

        // Send message_delta with final usage
        s.write(formatSSE('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn' },
          usage: { output_tokens: outputTokens }
        }));

        // Send message_stop
        s.write(formatSSE('message_stop', { type: 'message_stop' }));
      });
    } else {
      // Non-streaming response
      const response = await openai.chat.completions.create({
        model,
        messages,
        stream: false,
        max_tokens: anthropicRequest.max_tokens,
        temperature: anthropicRequest.temperature,
        top_p: anthropicRequest.top_p
      });

      const content = response.choices[0]?.message?.content || '';

      return c.json({
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: content }],
        model: anthropicRequest.model,
        stop_reason: 'end_turn',
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0
        }
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);

    if (error.status) {
      return c.json({
        type: 'error',
        error: {
          type: 'api_error',
          message: error.message
        }
      }, error.status);
    }

    return c.json({
      type: 'error',
      error: {
        type: 'internal_error',
        message: 'Internal server error'
      }
    }, 500);
  }
});

export default app;
