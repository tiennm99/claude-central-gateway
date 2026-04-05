# Code Standards & Architecture

## Codebase Structure

```
src/
├── index.js                    # Hono app entry point, middleware setup
├── auth-middleware.js          # Authentication logic, timing-safe comparison
├── openai-client.js            # Cached OpenAI client, model mapping
├── transform-request.js        # Anthropic → OpenAI request transformation
├── transform-response.js       # OpenAI → Anthropic response streaming
└── routes/
    └── messages.js             # POST /v1/messages handler
```

## Module Responsibilities

### index.js
- Creates Hono application instance
- Registers middleware (logging, CORS)
- Mounts auth middleware for `/v1/*` routes
- Registers message routes
- Handles 404 and error cases

### auth-middleware.js
- **timingSafeEqual()**: Constant-time string comparison using byte-level XOR
  - Works cross-platform: Node.js 18+, Cloudflare Workers, Deno, Bun
  - No dependency on native crypto module (cross-platform safe)
  - Takes two strings, returns boolean

- **authMiddleware()**: Hono middleware factory
  - Extracts token from `x-api-key` header or `Authorization: Bearer`
  - Compares against `GATEWAY_TOKEN` env var using timing-safe comparison
  - Returns 401 if missing or invalid
  - Returns 500 if GATEWAY_TOKEN not configured

### openai-client.js
- Creates and caches OpenAI client instance
- Handles model name mapping via `MODEL_MAP` env var
- Format: `claude-sonnet-4:gpt-4o,claude-3-opus:gpt-4-turbo`
- Falls back to model name from request if no mapping found

### transform-request.js
Converts Anthropic Messages API request format → OpenAI Chat Completions format.

**Main export: buildOpenAIRequest(anthropicRequest, model)**
- Input: Anthropic request object + mapped model name
- Output: OpenAI request payload (plain object, not yet stringified)

**Key transformations:**
- `max_tokens`, `temperature`, `top_p`: Pass through unchanged
- `stream`: If true, sets `stream: true` and `stream_options: { include_usage: true }`
- `stop_sequences`: Maps to OpenAI `stop` array parameter
- `tools`: Converts Anthropic tool definitions to OpenAI `tools` array with `type: 'function'`
- `tool_choice`: Maps Anthropic tool_choice enum to OpenAI tool_choice format
- `system`: Handles both string and array of text blocks
- `messages`: Transforms message array with special handling for content types

**Message transformation details:**
- **User messages**: Handles text, images, and tool_result blocks
  - Images: base64 and URL sources supported, converted to `image_url` format
  - tool_result blocks: Split into separate tool messages (OpenAI format)
  - Text content: Preserved in order

- **Assistant messages**: Handles text and tool_use blocks
  - tool_use blocks: Converted to OpenAI tool_calls format
  - Text content: Merged into `content` field
  - Result: Single message with optional `tool_calls` array

**Implementation notes:**
- System message: Joins array blocks with `\n\n` separator
- tool_result content: Supports string or array of text blocks; prepends `[ERROR]` if `is_error: true`
- Filters out unsupported blocks (thinking, cache_control, etc.)

### transform-response.js
Converts OpenAI Chat Completions responses → Anthropic Messages API format.

**Exports:**
- **transformResponse(openaiResponse, anthropicRequest)**: Non-streaming response conversion
  - Input: OpenAI response object, original Anthropic request
  - Output: Anthropic message response object with `id`, `type`, `role`, `content`, `stop_reason`, `usage`

- **streamAnthropicResponse(c, openaiStream, anthropicRequest)**: Streaming response handler
  - Input: Hono context, async iterable of OpenAI chunks, original Anthropic request
  - Outputs: Server-sent events in Anthropic SSE format
  - Emits: `message_start` → content blocks → `message_delta` → `message_stop`

**Response building:**
- **Content blocks**: Anthropic format uses array of content objects with `type` field
  - `text`: Standard text content
  - `tool_use`: Tool calls with `id`, `name`, `input` (parsed JSON object)

**Stop reason mapping:**
- `finish_reason: 'stop'` → `'end_turn'` (or `'stop_sequence'` if stop_sequences were used)
- `finish_reason: 'length'` → `'max_tokens'`
- `finish_reason: 'tool_calls'` → `'tool_use'`
- `finish_reason: 'content_filter'` → `'end_turn'`

**Streaming behavior:**
1. Sends `message_start` event with empty content array
2. For text delta: Sends `content_block_start`, then `content_block_delta` events
3. For tool_calls delta: Sends `content_block_start`, then `content_block_delta` with `input_json_delta`
4. Tracks text and tool blocks separately to avoid mixing in output
5. Closes blocks before transitioning between text and tool content
6. Captures usage from final chunk (requires `stream_options.include_usage`)
7. Sends `message_delta` with stop_reason and output tokens
8. Sends `message_stop` to mark stream end

**Implementation notes:**
- Tool call buffering: Accumulates arguments across multiple chunks before outputting deltas
- Block indexing: Separate indices for text blocks (0-n) and tool blocks (offset by text count)
- Tool result content extraction: Handles string or text-block-array formats

### routes/messages.js
HTTP handler for `POST /v1/messages`.

**Request flow:**
1. Extract `model` from body
2. Map model name via `openai-client`
3. Build OpenAI request via `transform-request`
4. If streaming: Use `streamAnthropicResponse()`, set `Content-Type: text/event-stream`
5. If non-streaming: Transform response via `transformResponse()`

**Error handling:**
- Catches OpenAI API errors, returns formatted Anthropic error response
- Catches transform errors, returns 400 Bad Request

## Naming Conventions

### Functions
- **camelCase**: `buildOpenAIRequest`, `timingSafeEqual`, `transformMessages`
- **Descriptive verbs**: build, transform, map, extract, handle
- **Prefixes for private functions**: None (all functions are internal to modules)

### Variables
- **camelCase**: `messageId`, `toolCallBuffers`, `inputTokens`
- **Constants**: UPPERCASE with underscores for env vars only (`GATEWAY_TOKEN`, `OPENAI_API_KEY`, `MODEL_MAP`)
- **Booleans**: Prefix with `is`, `had`, `should`: `isError`, `hadStopSequences`, `textBlockStarted`

### Files
- **kebab-case with descriptive names**: `auth-middleware.js`, `transform-request.js`, `transform-response.js`
- **Purpose clear from name**: No abbreviations

## Error Handling

### Authentication Failures
- 401 Unauthorized: Invalid or missing token
- 500 Internal Server Error: GATEWAY_TOKEN not configured

### API Errors
- Forward OpenAI errors to client in Anthropic error format
- Log error details for debugging
- Return 500 for unexpected errors

### Transform Errors
- Catch JSON parsing errors (tool arguments)
- Provide fallback values (empty objects, empty strings)
- Log parsing failures with context

## Security Practices

1. **Timing-Safe Authentication**: `timingSafeEqual()` prevents timing attacks
2. **Header Validation**: Checks both `x-api-key` and `Authorization` headers
3. **Token Comparison**: Constant-time comparison regardless of token length
4. **No Logging of Sensitive Data**: Auth tokens not logged

## Testing Strategy

### Unit Tests (Recommended)
- Test transformations with sample Anthropic/OpenAI payloads
- Test edge cases: empty messages, tool calls without text, images only
- Test error scenarios: malformed JSON, missing required fields
- Test utility functions: `timingSafeEqual`, `mapStopReason`

### Integration Tests (Recommended)
- Mock OpenAI API responses
- Test full request/response cycle with streaming and non-streaming
- Test model mapping

### Manual Testing
- Deploy to Vercel/Cloudflare and test with Claude Code
- Verify streaming works correctly
- Test tool use workflows (request → tool_use → tool_result → response)

## Performance Considerations

1. **Client Caching**: OpenAI client created once and reused
2. **Streaming Efficiency**: Response streamed directly from OpenAI to client (no buffering)
3. **String Operations**: Minimal string concatenation, uses joins for system message
4. **JSON Parsing**: Lazy parsed only when needed (tool arguments)

## Compatibility Notes

- **Runtime**: Works on Node.js 18+, Cloudflare Workers, Deno, Bun (via Hono)
- **APIs**: Uses standard JavaScript TextEncoder (not Node.js crypto for auth)
- **Framework**: Hono provides multi-platform support, no custom server implementation

## Code Quality Standards

1. **No External Dependencies**: Only Hono for framework (included in package.json)
2. **Readable Over Clever**: Prefer explicit logic over compact code
3. **Comments for Non-Obvious Logic**: Transformation rules, SSE event sequencing
4. **Self-Documenting Names**: Function names describe purpose, no abbreviations
5. **Modular Structure**: Single responsibility per file
