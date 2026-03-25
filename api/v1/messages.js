import OpenAI from 'openai';

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
function mapModel(claudeModel) {
  const modelMap = parseModelMap(process.env.MODEL_MAP);
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
      const textParts = msg.content.filter(c => c.type === 'text');
      const imageParts = msg.content.filter(c => c.type === 'image');

      const content = [];
      for (const part of textParts) {
        content.push({ type: 'text', text: part.text });
      }
      for (const part of imageParts) {
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

      messages.push({ role: msg.role, content });
    }
  }

  return messages;
}

// Format Anthropic SSE event
function formatSSE(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate auth token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (token !== process.env.GATEWAY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  try {
    const anthropicRequest = req.body;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const messages = transformMessages(anthropicRequest);
    const model = mapModel(anthropicRequest.model);
    const stream = anthropicRequest.stream !== false;

    if (stream) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: anthropicRequest.max_tokens,
        temperature: anthropicRequest.temperature,
        top_p: anthropicRequest.top_p
      });

      let messageId = `msg_${Date.now()}`;
      let inputTokens = 0;
      let outputTokens = 0;

      // Send message_start event
      res.write(formatSSE('message_start', {
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
      res.write(formatSSE('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' }
      }));

      let textIndex = 0;

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          res.write(formatSSE('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: delta.content }
          }));
        }

        // Track usage if available
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || inputTokens;
          outputTokens = chunk.usage.completion_tokens || outputTokens;
        }
      }

      // Send content_block_stop
      res.write(formatSSE('content_block_stop', {
        type: 'content_block_stop',
        index: 0
      }));

      // Send message_delta with final usage
      res.write(formatSSE('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: outputTokens }
      }));

      // Send message_stop
      res.write(formatSSE('message_stop', { type: 'message_stop' }));

      res.end();
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

      res.json({
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

    // Handle OpenAI API errors
    if (error.status) {
      return res.status(error.status).json({
        type: 'error',
        error: {
          type: 'api_error',
          message: error.message
        }
      });
    }

    return res.status(500).json({
      type: 'error',
      error: {
        type: 'internal_error',
        message: 'Internal server error'
      }
    });
  }
}
