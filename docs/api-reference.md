# API Reference

## Overview

Claude Central Gateway implements the Anthropic Messages API, making it a drop-in replacement for the official Anthropic API. All endpoints and request/response formats match the [Anthropic API specification](https://docs.anthropic.com/en/docs/about/api-overview).

## Endpoints

### POST /v1/messages

Create a message and get a response from the model.

#### Authentication

All requests to `/v1/messages` require authentication via the `x-api-key` header:

```bash
curl -X POST https://gateway.example.com/v1/messages \
  -H "x-api-key: my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Alternatively, use `Authorization: Bearer` header:

```bash
curl -X POST https://gateway.example.com/v1/messages \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

#### Request Body

```json
{
  "model": "claude-sonnet-4-20250514",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Hello, how are you?"
        }
      ]
    }
  ],
  "max_tokens": 1024,
  "stream": false,
  "temperature": 0.7,
  "top_p": 1.0,
  "stop_sequences": null,
  "system": "You are a helpful assistant.",
  "tools": null,
  "tool_choice": null
}
```

##### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model identifier (e.g., `claude-sonnet-4-20250514`). Gateway maps to OpenAI model via `MODEL_MAP` env var. |
| `messages` | array | Yes | Array of message objects with conversation history. |
| `max_tokens` | integer | Yes | Maximum tokens to generate (1-4096 typical). |
| `stream` | boolean | No | If `true`, stream response as Server-Sent Events. Default: `false`. |
| `temperature` | number | No | Sampling temperature (0.0-1.0). Higher = more random. Default: `1.0`. |
| `top_p` | number | No | Nucleus sampling parameter (0.0-1.0). Default: `1.0`. |
| `stop_sequences` | array | No | Array of strings; generation stops when any is encountered. Max 5 sequences. |
| `system` | string or array | No | System prompt. String or array of text blocks. |
| `tools` | array | No | Array of tool definitions the model can call. |
| `tool_choice` | object | No | Constraints on which tool to use. |

##### Message Object

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What is 2 + 2?"
    },
    {
      "type": "image",
      "source": {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": "base64-encoded-image-data"
      }
    },
    {
      "type": "tool_result",
      "tool_use_id": "tool_call_123",
      "content": "Result from tool execution",
      "is_error": false
    }
  ]
}
```

###### Message Content Types

**text**
```json
{
  "type": "text",
  "text": "String content"
}
```

**image** (user messages only)
```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/jpeg",
    "data": "base64-encoded-image"
  }
}
```

Or from URL:
```json
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://example.com/image.jpg"
  }
}
```

**tool_use** (assistant messages only, in responses)
```json
{
  "type": "tool_use",
  "id": "call_123",
  "name": "search",
  "input": {
    "query": "capital of France"
  }
}
```

**tool_result** (user messages only, after tool_use)
```json
{
  "type": "tool_result",
  "tool_use_id": "call_123",
  "content": "The capital of France is Paris.",
  "is_error": false
}
```

##### Tool Definition

```json
{
  "name": "search",
  "description": "Search the web for information",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      }
    },
    "required": ["query"]
  }
}
```

##### Tool Choice

Control which tool the model uses.

Auto (default):
```json
{
  "type": "auto"
}
```

Model must use a tool:
```json
{
  "type": "any"
}
```

Model cannot use tools:
```json
{
  "type": "none"
}
```

Model must use specific tool:
```json
{
  "type": "tool",
  "name": "search"
}
```

#### Response (Non-Streaming)

```json
{
  "id": "msg_1234567890abcdef",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "2 + 2 = 4"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 5
  }
}
```

##### Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique message identifier. |
| `type` | string | Always `"message"`. |
| `role` | string | Always `"assistant"`. |
| `content` | array | Array of content blocks (text or tool_use). |
| `model` | string | Model identifier that processed the request. |
| `stop_reason` | string | Reason generation stopped (see Stop Reasons). |
| `usage` | object | Token usage: `input_tokens`, `output_tokens`. |

#### Response (Streaming)

Stream responses as Server-Sent Events when `stream: true`:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"usage":{"input_tokens":0,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" How"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" are"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}

event: message_stop
data: {"type":"message_stop"}
```

###### Stream Event Types

**message_start**
First event, contains message envelope.

**content_block_start**
New content block begins (text or tool_use).
- `index`: Position in content array.
- `content_block`: Block metadata.

**content_block_delta**
Incremental update to current block.
- Text blocks: `delta.type: "text_delta"`, `delta.text: string`
- Tool blocks: `delta.type: "input_json_delta"`, `delta.partial_json: string`

**content_block_stop**
Current block complete.

**message_delta**
Final message metadata.
- `delta.stop_reason`: Reason generation stopped.
- `usage.output_tokens`: Total output tokens.

**message_stop**
Stream ended.

#### Stop Reasons

| Stop Reason | Meaning |
|------------|---------|
| `end_turn` | Model completed generation naturally. |
| `max_tokens` | Hit `max_tokens` limit. |
| `stop_sequence` | Generation hit user-specified `stop_sequences`. |
| `tool_use` | Model selected a tool to call. |

#### Error Responses

**401 Unauthorized** (invalid token)
```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "Unauthorized"
  }
}
```

**400 Bad Request** (malformed request)
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Bad Request"
  }
}
```

**500 Internal Server Error** (server misconfiguration or API error)
```json
{
  "type": "error",
  "error": {
    "type": "api_error",
    "message": "Internal server error"
  }
}
```

## Health Check Endpoint

### GET /

Returns gateway status (no authentication required).

```bash
curl https://gateway.example.com/
```

Response:
```json
{
  "status": "ok",
  "name": "Claude Central Gateway"
}
```

## Configuration

Gateway behavior controlled via environment variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GATEWAY_TOKEN` | Yes | Shared token for authentication. | `sk-gatewaytoken123...` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for authentication. | `sk-proj-...` |
| `MODEL_MAP` | No | Comma-separated model name mappings. | `claude-sonnet-4-20250514:gpt-4o,claude-opus:gpt-4-turbo` |

## Usage Examples

### Simple Text Request

```bash
curl -X POST https://gateway.example.com/v1/messages \
  -H "x-api-key: my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 256,
    "messages": [
      {"role": "user", "content": "Say hello!"}
    ]
  }'
```

### Streaming Response

```bash
curl -X POST https://gateway.example.com/v1/messages \
  -H "x-api-key: my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 256,
    "stream": true,
    "messages": [
      {"role": "user", "content": "Count to 5"}
    ]
  }' \
  -N
```

### Tool Use Workflow

**Request with tools:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "tools": [
    {
      "name": "search",
      "description": "Search the web",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {"type": "string"}
        },
        "required": ["query"]
      }
    }
  ],
  "messages": [
    {"role": "user", "content": "What is the capital of France?"}
  ]
}
```

**Response with tool_use:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "call_123",
      "name": "search",
      "input": {"query": "capital of France"}
    }
  ],
  "stop_reason": "tool_use",
  "usage": {"input_tokens": 50, "output_tokens": 25}
}
```

**Follow-up request with tool result:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "messages": [
    {"role": "user", "content": "What is the capital of France?"},
    {
      "role": "assistant",
      "content": [
        {
          "type": "tool_use",
          "id": "call_123",
          "name": "search",
          "input": {"query": "capital of France"}
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "tool_result",
          "tool_use_id": "call_123",
          "content": "Paris is the capital of France"
        }
      ]
    }
  ]
}
```

**Final response:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Paris is the capital of France."
    }
  ],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 100, "output_tokens": 15}
}
```

### Image Request

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          }
        },
        {
          "type": "text",
          "text": "Describe this image"
        }
      ]
    }
  ]
}
```

### Using Claude SDK (Recommended)

Set environment variables:
```bash
export ANTHROPIC_BASE_URL=https://gateway.example.com
export ANTHROPIC_AUTH_TOKEN=my-secret-token
```

Then use normally:
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
});

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    { role: "user", content: "Say hello!" }
  ],
});

console.log(message.content[0].text);
```

## Limitations & Compatibility

### Fully Supported
- Text messages
- Image content (base64 and URLs)
- Tool definitions and tool use/tool result round-trips
- System messages (string or array)
- Streaming responses with proper SSE format
- Stop sequences
- Temperature, top_p, max_tokens
- Usage token counts

### Unsupported (Filtered Out)
- Thinking blocks (Claude 3.7+)
- Cache control directives
- Multi-modal tool inputs (tools receive text input only)
- Vision-specific model parameters

### Behavioral Differences from Anthropic API
- Single shared token (no per-user auth)
- No rate limiting (implement on your end if needed)
- No request logging/audit trail
- Error messages may differ (OpenAI error format converted)
- Latency slightly higher due to proxying

## Rate Limiting Notes

Gateway itself has no rate limits. Limits come from:
1. **OpenAI API quota**: Based on your API tier
2. **Network throughput**: Hono/platform limits
3. **Token count**: OpenAI pricing

Recommendations:
- Implement client-side rate limiting
- Monitor token usage via `usage` field in responses
- Set aggressive `max_tokens` limits if cost is concern
- Use smaller models in `MODEL_MAP` for cost reduction
