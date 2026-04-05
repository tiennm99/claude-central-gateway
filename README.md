# Claude Central Gateway

A lightweight proxy that translates Claude API requests to OpenAI's API, enabling cost optimization through cheaper third-party providers. Deploy on Vercel, Cloudflare Workers, or any Hono-compatible platform with zero configuration beyond environment variables.

**Key Features:**
- ✅ Full tool use/tool result support with proper round-trip handling
- ✅ Streaming responses with Anthropic SSE format
- ✅ Image content (base64 and URLs)
- ✅ System message arrays
- ✅ Timing-safe authentication (x-api-key header)
- ✅ Stop sequences and stop reason mapping
- ✅ Token usage tracking

## Where to Find Cheap LLM Providers?

Check out [this repo](https://github.com/tiennm99/penny-pincher-provider) for a list of affordable OpenAI-compatible providers.

## Philosophy

Minimal, simple, deploy anywhere. No GUI, no database, no complexity.

## Quick Start

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tiennm99/claude-central-gateway)

Or manually:

```bash
git clone https://github.com/tiennm99/claude-central-gateway
cd claude-central-gateway
npm install
vercel
```

### Deploy to Cloudflare Workers

```bash
git clone https://github.com/tiennm99/claude-central-gateway
cd claude-central-gateway
npm install
npm run deploy:cf
```

### Set Environment Variables

**Vercel**: Dashboard → Settings → Environment Variables

**Cloudflare**: `wrangler.toml` or Dashboard → Workers → Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GATEWAY_TOKEN` | Shared token for authentication | `my-secret-token` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `MODEL_MAP` | Model name mapping | `claude-sonnet-4-20250514:gpt-4o` |

### Configure Claude Code

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.vercel.app
export ANTHROPIC_AUTH_TOKEN=my-secret-token
claude
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GATEWAY_TOKEN` | Yes | Shared token for authentication via `x-api-key` header | `my-secret-token-123` |
| `OPENAI_API_KEY` | Yes | OpenAI API key (with usage credits) | `sk-proj-...` |
| `MODEL_MAP` | No | Model name mappings (comma-separated, format: `claude-model:openai-model`) | `claude-sonnet-4-20250514:gpt-4o,claude-opus:gpt-4-turbo` |

## Features & Compatibility

### Fully Supported
- **Messages**: Text, images (base64 & URLs), tool results
- **Tools**: Tool definitions, tool_use/tool_result round-trips, tool_choice constraints
- **System**: String or array of text blocks
- **Streaming**: Full SSE support with proper event sequencing
- **Parameters**: `max_tokens`, `temperature`, `top_p`, `stop_sequences`
- **Metadata**: Token usage counting, stop_reason mapping

### Unsupported (Filtered Out)
- Thinking blocks (Claude-specific)
- Cache control directives
- Vision-specific parameters

See [API Reference](./docs/api-reference.md) for complete endpoint documentation.

## Why This Project?

### Why not use a local proxy, like [Claude Code Router](https://github.com/musistudio/claude-code-router)?

Local proxies only work on a single machine. This project serves multiple machines simultaneously.

### Why not use [LiteLLM](https://github.com/BerriAI/litellm)?

LiteLLM requires a dedicated VPS, consumes more resources, and costs more to deploy.

### Why no advanced features like routing or GUI management?

Built for personal use. Simplicity over features.

## Not Suitable For

- **Single-machine localhost proxy** → Use [Claude Code Router](https://github.com/musistudio/claude-code-router)
- **Enterprise/Team usage with GUI management** → Use [LiteLLM](https://github.com/BerriAI/litellm)
- **Advanced routing, load balancing, rate limiting, per-user auth** → Use [LiteLLM](https://github.com/BerriAI/litellm) or similar

## Documentation

- **[API Reference](./docs/api-reference.md)** - Complete endpoint documentation and examples
- **[System Architecture](./docs/system-architecture.md)** - Request flow, data structures, deployment topology
- **[Code Standards](./docs/code-standards.md)** - Module responsibilities, naming conventions, security practices
- **[Project Overview & PDR](./docs/project-overview-pdr.md)** - Requirements, roadmap, product strategy

## Development

### Project Structure
```
src/
├── index.js                  # Hono app entry point
├── auth-middleware.js        # x-api-key validation with timing-safe comparison
├── openai-client.js          # Cached OpenAI client, model mapping
├── transform-request.js      # Anthropic → OpenAI transformation
├── transform-response.js     # OpenAI → Anthropic SSE streaming
└── routes/
    └── messages.js           # POST /v1/messages handler
```

### Building Locally
```bash
npm install
npm run dev              # Start local server (localhost:5173)
```

### Testing
```bash
# Manual test with curl
curl -X POST http://localhost:5173/v1/messages \
  -H "x-api-key: test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Deployment Checklist
- [ ] Set `GATEWAY_TOKEN` to a strong random value (32+ characters)
- [ ] Set `OPENAI_API_KEY` to your actual OpenAI API key
- [ ] Configure `MODEL_MAP` if using non-standard model names
- [ ] Test with Claude Code: `export ANTHROPIC_BASE_URL=...` and `export ANTHROPIC_AUTH_TOKEN=...`
- [ ] Monitor OpenAI API usage and costs
- [ ] Rotate `GATEWAY_TOKEN` periodically
- [ ] Consider rate limiting if exposed to untrusted networks
