---
name: Implementation Plan
description: Architecture and design decisions for Claude Central Gateway
type: project
---

## Claude Central Gateway - Implementation

**Why:** A lightweight proxy for Claude Code that routes requests to third-party API providers, deployable to Vercel without needing a VPS.

### Architecture

```
Claude Code → Gateway (Vercel) → OpenAI API
                ↓
         Validate token
         Transform request
         Stream response
```

### Key Decisions

- **Language**: Node.js with JavaScript (no TypeScript)
- **Framework**: Hono (multi-platform: Vercel, Cloudflare, Deno, Bun)
- **Deployment**: Vercel serverless functions OR Cloudflare Workers
- **Providers**: OpenAI first (via official SDK), others in TODO
- **Config**: Environment variables only (no database)
- **Auth**: Single shared token (user's `ANTHROPIC_AUTH_TOKEN` must match `GATEWAY_TOKEN`)
- **Streaming**: Full streaming support
- **Model mapping**: Via `MODEL_MAP` env var (format: `claude:openai,claude2:openai2`)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GATEWAY_TOKEN` | Shared token for authentication |
| `OPENAI_API_KEY` | OpenAI API key |
| `MODEL_MAP` | Model name mapping (optional) |

### File Structure

```
src/
├── index.js            - Hono app entry point
├── routes/
│   └── messages.js     - /v1/messages proxy handler
api/
└── index.js            - Vercel adapter
package.json            - Dependencies (hono, openai)
vercel.json             - Vercel config
wrangler.toml           - Cloudflare Workers config
```

### How to apply: When adding new providers or modifying the gateway, follow the established pattern in `api/v1/messages.js` for request/response transformation.
