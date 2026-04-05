# System Architecture

## High-Level Overview

Claude Central Gateway acts as a protocol translator between Anthropic's Messages API and OpenAI's Chat Completions API. Requests flow through a series of transformation stages with minimal overhead.

```
Client (Claude Code)
    ↓
HTTP Request (Anthropic API format)
    ↓
[Auth Middleware] → Validates x-api-key token
    ↓
[Model Mapping] → Maps claude-* model names to openai models
    ↓
[Request Transformation] → Anthropic format → OpenAI format
    ↓
[OpenAI Client] → Sends request to OpenAI API
    ↓
OpenAI Response Stream
    ↓
[Response Transformation] → OpenAI format → Anthropic SSE format
    ↓
HTTP Response (Anthropic SSE or JSON)
    ↓
Client receives response
```

## Request Flow (Detailed)

### 1. Incoming Request
```
POST /v1/messages HTTP/1.1
Host: gateway.example.com
x-api-key: my-secret-token
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "messages": [...],
  "tools": [...],
  "stream": true,
  ...
}
```

### 2. Authentication Stage
- **Middleware**: `authMiddleware()` from `auth-middleware.js`
- **Input**: HTTP request with headers
- **Process**:
  1. Extract `x-api-key` header or `Authorization: Bearer` header
  2. Compare against `GATEWAY_TOKEN` using `timingSafeEqual()` (constant-time comparison)
  3. If invalid: Return 401 Unauthorized
  4. If valid: Proceed to next middleware

### 3. Model Mapping
- **Module**: `openai-client.js`
- **Input**: Model name from request (e.g., `claude-sonnet-4-20250514`)
- **Process**:
  1. Check `MODEL_MAP` environment variable (format: `claude:gpt-4o,claude-opus:gpt-4-turbo`)
  2. If mapping found: Use mapped model name
  3. If no mapping: Use original model name as fallback
- **Output**: Canonical OpenAI model name (e.g., `gpt-4o`)

### 4. Request Transformation
- **Module**: `transform-request.js`, function `buildOpenAIRequest()`
- **Input**: Anthropic request body + mapped model name
- **Transformations**:

  **Parameters** (direct pass-through with mappings):
  - `max_tokens` → `max_tokens`
  - `temperature` → `temperature`
  - `top_p` → `top_p`
  - `stream` → `stream` (and adds `stream_options: { include_usage: true }`)
  - `stop_sequences` → `stop` array

  **Tools**:
  - Convert Anthropic tool definitions to OpenAI function tools
  - Map `tool_choice` enum to OpenAI tool_choice format

  **Messages Array** (complex transformation):
  - **System message**: String or array of text blocks → Single system message
  - **User messages**: Handle text, images, and tool_result blocks
  - **Assistant messages**: Handle text and tool_use blocks

  **Content Block Handling**:
  - `text`: Preserved as-is
  - `image` (base64 or URL): Converted to `image_url` format
  - `tool_use`: Converted to OpenAI `tool_calls`
  - `tool_result`: Split into separate tool messages
  - Other blocks (thinking, cache_control): Filtered out

- **Output**: OpenAI Chat Completions request payload (object, not stringified)

### 5. OpenAI API Call
- **Module**: `routes/messages.js` route handler
- **Process**:
  1. Serialize payload to JSON
  2. Send to OpenAI API with authentication header
  3. If streaming: Request returns async iterable of chunks
  4. If non-streaming: Request returns single response object

### 6. Response Transformation

#### Non-Streaming Path
- **Module**: `transform-response.js`, function `transformResponse()`
- **Input**: OpenAI response object + original Anthropic request
- **Process**:
  1. Extract first choice from OpenAI response
  2. Build content blocks array:
     - Extract text from `message.content` if present
     - Extract tool_calls and convert to Anthropic `tool_use` format
  3. Map OpenAI `finish_reason` to Anthropic `stop_reason`
  4. Build response envelope with message metadata
  5. Convert usage tokens (prompt/completion → input/output)
- **Output**: Single Anthropic message response object

#### Streaming Path
- **Module**: `transform-response.js`, function `streamAnthropicResponse()`
- **Input**: Hono context + OpenAI response stream + original Anthropic request
- **Process**:
  1. Emit `message_start` event with empty message envelope
  2. For each OpenAI chunk:
     - Track `finish_reason` for final stop_reason
     - Handle text deltas: Send `content_block_start`, `content_block_delta`, `content_block_stop`
     - Handle tool_calls deltas: Similar sequencing, buffer arguments
     - Track usage tokens from final chunk
  3. Emit `message_delta` with final stop_reason and output tokens
  4. Emit `message_stop` to mark end of stream
- **Output**: Server-Sent Events stream (Content-Type: text/event-stream)

### 7. HTTP Response
```
HTTP/1.1 200 OK
Content-Type: text/event-stream (streaming) or application/json (non-streaming)

event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_start
data: {"type":"content_block_start",...}

event: content_block_delta
data: {"type":"content_block_delta",...}

event: message_delta
data: {"type":"message_delta",...}

event: message_stop
data: {"type":"message_stop"}
```

## Tool Use Round-Trip (Special Case)

Complete workflow for tool execution:

### Step 1: Initial Request with Tools
```
Client sends:
{
  "messages": [{"role": "user", "content": "Search for X"}],
  "tools": [{"name": "search", "description": "...", "input_schema": {...}}]
}
```

### Step 2: Model Selects Tool
```
OpenAI responds:
{
  "choices": [{
    "message": {
      "content": null,
      "tool_calls": [{"id": "call_123", "function": {"name": "search", "arguments": "{..."}}]
    }
  }]
}
```

### Step 3: Transform & Return to Client
```
Gateway converts:
{
  "content": [
    {"type": "tool_use", "id": "call_123", "name": "search", "input": {...}}
  ],
  "stop_reason": "tool_use"
}
```

### Step 4: Client Executes Tool and Responds
```
Client sends:
{
  "messages": [
    {"role": "user", "content": "Search for X"},
    {"role": "assistant", "content": [{"type": "tool_use", "id": "call_123", ...}]},
    {"role": "user", "content": [
      {"type": "tool_result", "tool_use_id": "call_123", "content": "Result: ..."}
    ]}
  ]
}
```

### Step 5: Transform & Forward to OpenAI
```
Gateway converts:
{
  "messages": [
    {"role": "user", "content": "Search for X"},
    {"role": "assistant", "content": null, "tool_calls": [...]},
    {"role": "tool", "tool_call_id": "call_123", "content": "Result: ..."}
  ]
}
```

### Step 6: Model Continues
OpenAI processes tool result and continues conversation.

## Stop Reason Mapping

| OpenAI `finish_reason` | Anthropic `stop_reason` | Notes |
|----------------------|----------------------|-------|
| `stop` | `end_turn` | Normal completion |
| `stop` (with stop_sequences) | `stop_sequence` | Hit user-specified stop sequence |
| `length` | `max_tokens` | Hit max_tokens limit |
| `tool_calls` | `tool_use` | Model selected a tool |
| `content_filter` | `end_turn` | Content filtered by safety filters |

## Data Structures

### Request Object (Anthropic format)
```javascript
{
  model: string,
  messages: [{
    role: "user" | "assistant",
    content: string | [{
      type: "text" | "image" | "tool_use" | "tool_result",
      text?: string,
      source?: {type: "base64" | "url", media_type?: string, data?: string, url?: string},
      id?: string,
      name?: string,
      input?: object,
      tool_use_id?: string,
      is_error?: boolean
    }]
  }],
  system?: string | [{type: "text", text: string}],
  tools?: [{
    name: string,
    description: string,
    input_schema: object
  }],
  tool_choice?: {type: "auto" | "any" | "none" | "tool", name?: string},
  max_tokens: number,
  temperature?: number,
  top_p?: number,
  stop_sequences?: string[],
  stream?: boolean
}
```

### Response Object (Anthropic format)
```javascript
{
  id: string,
  type: "message",
  role: "assistant",
  content: [{
    type: "text" | "tool_use",
    text?: string,
    id?: string,
    name?: string,
    input?: object
  }],
  model: string,
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use",
  usage: {
    input_tokens: number,
    output_tokens: number
  }
}
```

## Deployment Topology

### Single-Instance Deployment (Typical)
```
                    ┌─────────────────────┐
                    │   Claude Code       │
                    │   (Claude IDE)      │
                    └──────────┬──────────┘
                               │ HTTP/HTTPS
                               ▼
                    ┌─────────────────────┐
                    │  Claude Central     │
                    │  Gateway (Vercel)   │
                    │  ┌────────────────┐ │
                    │  │ Auth            │ │
                    │  │ Transform Req   │ │
                    │  │ Transform Resp  │ │
                    │  └────────────────┘ │
                    └──────────┬──────────┘
                               │ HTTP/HTTPS
                               ▼
                    ┌─────────────────────┐
                    │   OpenAI API        │
                    │   chat/completions  │
                    └─────────────────────┘
```

### Multi-Instance Deployment (Stateless)
Multiple gateway instances can run independently. Requests distribute via:
- Load balancer (Vercel built-in, Cloudflare routing)
- Client-side retry on failure

Each instance:
- Shares same `GATEWAY_TOKEN` for authentication
- Shares same `MODEL_MAP` for consistent routing
- Connects independently to OpenAI

No coordination required between instances.

## Scalability Characteristics

### Horizontal Scaling
- ✅ Fully stateless: Add more instances without coordination
- ✅ No shared state: Each instance owns only active requests
- ✅ Database-free: No bottleneck or single point of failure

### Rate Limiting
- ⚠️ Currently none: Single token shared across all users
- Recommendation: Implement per-token or per-IP rate limiting if needed

### Performance
- Latency: ~50-200ms overhead per request (serialization + HTTP)
- Throughput: Limited by OpenAI API tier, not gateway capacity
- Memory: ~20MB per instance (Hono + dependencies)

## Error Handling Architecture

### Authentication Errors
```
Client → Gateway (missing/invalid token)
         └→ Return 401 with error details
            No API call made
```

### Transform Errors
```
Client → Gateway → Transform fails (malformed request)
                   └→ Return 400 Bad Request
                      No API call made
```

### OpenAI API Errors
```
Client → Gateway → OpenAI API returns error
                   └→ Convert to Anthropic error format
                      └→ Return to client
```

### Network Errors
```
Client → Gateway → OpenAI unreachable
                   └→ Timeout or connection error
                      └→ Return 500 Internal Server Error
```

## Security Model

### Authentication
- **Method**: Single shared token (`GATEWAY_TOKEN`)
- **Comparison**: Timing-safe to prevent brute-force via timing attacks
- **Suitable for**: Personal use, small teams with trusted members
- **Not suitable for**: Multi-tenant, public access, high-security requirements

### Token Locations
- Client stores in `ANTHROPIC_AUTH_TOKEN` environment variable
- Server validates against `GATEWAY_TOKEN` environment variable
- Never logged or exposed in error messages

### Recommendations for Production
1. Use strong, randomly generated token (32+ characters)
2. Rotate token periodically
3. Use HTTPS only (Vercel provides free HTTPS)
4. Consider rate limiting by IP if exposed to untrusted networks
5. Monitor token usage logs for suspicious patterns

## Monitoring & Observability

### Built-in Logging
- Hono logger middleware logs all requests (method, path, status, latency)
- Errors logged to console with stack traces

### Recommended Additions
- Request/response body logging (for debugging, exclude in production)
- Token usage tracking (prompt/completion tokens)
- API error rate monitoring
- Latency percentiles (p50, p95, p99)
- OpenAI API quota tracking

## Future Architecture Considerations

### Potential Enhancements
1. **Per-request authentication**: Support API keys per user/token
2. **Request routing**: Route based on model, user, or other properties
3. **Response caching**: Cache repeated identical requests
4. **Rate limiting**: Token bucket or sliding window per client
5. **Webhook logging**: Send detailed logs to external system
6. **Provider abstraction**: Support multiple backends (Google, Anthropic, etc.)

### Current Constraints Preventing Enhancement
- Single-token auth: No per-user isolation
- Minimal state: Cannot track usage per user
- Stateless design: Cannot implement caching or rate limiting without storage
- Simple model mapping: Cannot route intelligently

These are intentional trade-offs prioritizing simplicity over flexibility.
