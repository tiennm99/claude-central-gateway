import { Hono } from 'hono';
import { getOpenAIClient, mapModel } from '../openai-client.js';
import { buildOpenAIRequest } from '../transform-request.js';
import { transformResponse, streamAnthropicResponse } from '../transform-response.js';

const app = new Hono();

// POST /v1/messages — proxy Anthropic Messages API to OpenAI Chat Completions
app.post('/messages', async (c) => {
  const env = c.env;

  if (!env.OPENAI_API_KEY) {
    return c.json({
      type: 'error',
      error: { type: 'api_error', message: 'Provider API key not configured' },
    }, 500);
  }

  try {
    const anthropicRequest = await c.req.json();
    const openai = getOpenAIClient(env);
    const model = mapModel(anthropicRequest.model, env);
    const isStreaming = anthropicRequest.stream === true;
    const openaiPayload = buildOpenAIRequest(anthropicRequest, model);

    if (isStreaming) {
      const openaiStream = await openai.chat.completions.create(openaiPayload);
      return streamAnthropicResponse(c, openaiStream, anthropicRequest);
    }

    const response = await openai.chat.completions.create(openaiPayload);
    return c.json(transformResponse(response, anthropicRequest));
  } catch (error) {
    console.error('Proxy error:', error);
    const status = error.status || 500;
    return c.json({
      type: 'error',
      error: {
        type: status >= 500 ? 'api_error' : 'invalid_request_error',
        message: 'Request failed',
      },
    }, status);
  }
});

export default app;
