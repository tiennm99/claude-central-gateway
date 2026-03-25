# Claude Central Gateway

A proxy for Claude Code that routes requests to your preferred third-party API provider. Easily hosted on Vercel, Netlify, and similar platforms.

## Where to Find Cheap LLM Providers?

Check out [this repo](https://github.com/tiennm99/penny-pincher-provider) for a list of affordable LLM providers compatible with this gateway.

## Philosophy

Minimal, simple, deploy anywhere.

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
