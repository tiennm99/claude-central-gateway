# Claude Central Gateway

> ## ⚠️ Project Abandoned
>
> **This project is no longer maintained.**
>
> When this was started, lightweight Anthropic-to-OpenAI proxies were scarce. That's no longer true — the AI/LLM gateway ecosystem has matured rapidly and there are now many production-grade alternatives that do everything this project does and far more (routing, fallbacks, rate limiting, observability, caching, GUIs, multi-tenancy, etc.).
>
> Please use one of the well-maintained gateways listed below instead. They are faster, more feature-complete, and actively developed.

## Recommended Alternatives

Browse the full ecosystem on GitHub:
- [`ai-gateway` topic](https://github.com/topics/ai-gateway)
- [`llm-gateway` topic](https://github.com/topics/llm-gateway)

Popular choices:

| Gateway | Language | Highlights |
|---------|----------|-----------|
| [LiteLLM](https://github.com/BerriAI/litellm) | Python | 100+ providers, proxy server, cost tracking, virtual keys, GUI |
| [Bifrost](https://github.com/maximhq/bifrost) | Go | Fastest open-source LLM gateway, low-latency, multi-provider |
| [New API](https://github.com/QuantumNous/new-api) | Go | Next-gen gateway with rich UI, billing, key management (fork of One API) |
| [One API](https://github.com/songquanpeng/one-api) | Go | Multi-provider gateway with token/quota management |
| [Portkey Gateway](https://github.com/Portkey-AI/gateway) | TypeScript | Unified API, fallbacks, load balancing, guardrails |
| [OpenRouter](https://openrouter.ai) | Hosted | Managed gateway with 300+ models, no self-host needed |
| [Claude Code Router](https://github.com/musistudio/claude-code-router) | Node.js | Local single-machine proxy specifically for Claude Code |

### Quick recommendations

- **Single machine / personal use** → [Claude Code Router](https://github.com/musistudio/claude-code-router)
- **Self-hosted with full features (GUI, billing, keys)** → [New API](https://github.com/QuantumNous/new-api) or [LiteLLM](https://github.com/BerriAI/litellm)
- **Performance-critical / high throughput** → [Bifrost](https://github.com/maximhq/bifrost)
- **Zero ops / hosted** → [OpenRouter](https://openrouter.ai) or [Portkey](https://portkey.ai)

## Where to Find Cheap LLM Providers?

Check out [penny-pincher-provider](https://github.com/tiennm99/penny-pincher-provider) for a list of affordable OpenAI-compatible providers.

---

## Legacy Documentation

The rest of this README is kept for historical reference only. The project is no longer updated and the code is provided as-is.

<details>
<summary>Expand legacy docs</summary>

A lightweight proxy that translated Claude API requests to OpenAI's API, enabling cost optimization through cheaper third-party providers. Deployable on Vercel, Cloudflare Workers, or any Hono-compatible platform.

### Features
- Full tool use/tool result support with proper round-trip handling
- Streaming responses with Anthropic SSE format
- Image content (base64 and URLs)
- System message arrays
- Timing-safe authentication (x-api-key header)
- Stop sequences and stop reason mapping
- Token usage tracking

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GATEWAY_TOKEN` | Yes | Shared token for authentication via `x-api-key` header | `my-secret-token-123` |
| `OPENAI_API_KEY` | Yes | OpenAI API key (with usage credits) | `sk-proj-...` |
| `MODEL_MAP` | No | Model name mappings (comma-separated, format: `claude-model:openai-model`) | `claude-sonnet-4-20250514:gpt-4o,claude-opus:gpt-4-turbo` |

### Deploy to Vercel

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

### Configure Claude Code

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.vercel.app
export ANTHROPIC_AUTH_TOKEN=my-secret-token
claude
```

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

### Documentation
- [API Reference](./docs/api-reference.md)
- [System Architecture](./docs/system-architecture.md)
- [Code Standards](./docs/code-standards.md)
- [Project Overview & PDR](./docs/project-overview-pdr.md)

</details>
