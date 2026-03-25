# Claude Central Gateway

A proxy for Claude Code that routes requests to your preferred third-party API provider. Easily hosted on Vercel, Netlify, and similar platforms.

## Where to Find Cheap LLM Providers?

Check out [this repo](https://github.com/tiennm99/penny-pincher-provider) for a list of affordable LLM providers compatible with this gateway.

## Philosophy

Minimal, simple, deploy anywhere.

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

| Variable | Required | Description |
|----------|----------|-------------|
| `GATEWAY_TOKEN` | Yes | Token users must provide in `ANTHROPIC_AUTH_TOKEN` |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `MODEL_MAP` | No | Comma-separated model mappings (format: `claude:openai`) |

## Why This Project?

### Why not use a local proxy, like [Claude Code Router](https://github.com/musistudio/claude-code-router)?

Local proxies only work on a single machine. This project serves multiple machines simultaneously.

### Why not use [LiteLLM](https://github.com/BerriAI/litellm)?

LiteLLM requires a dedicated VPS, consumes more resources, and costs more to deploy.

### Why no advanced features like routing or GUI management?

Built for personal use. Simplicity over features.

## Not Suitable For

- **Single-machine localhost proxy** → Highly recommend [Claude Code Router](https://github.com/musistudio/claude-code-router)
- **Enterprise/Team usage with GUI management** → Use [LiteLLM](https://github.com/BerriAI/litellm)
- **Advanced routing, load balancing, rate limiting** → Use [LiteLLM](https://github.com/BerriAI/litellm) or similar
