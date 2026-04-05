# Quick Start Guide

## 1-Minute Setup

### Prerequisites
- OpenAI API key (get from [platform.openai.com](https://platform.openai.com))
- Vercel account (optional, for deployment)
- Claude Code IDE

### Deploy to Vercel

Click the button in the [README](../README.md) or:

```bash
git clone https://github.com/tiennm99/claude-central-gateway
cd claude-central-gateway
npm install
vercel
```

### Configure Environment Variables

**In Vercel Dashboard:**
1. Select your project → Settings → Environment Variables
2. Add:
   - `GATEWAY_TOKEN`: `my-secret-token-abc123def456` (generate a random string)
   - `OPENAI_API_KEY`: Your OpenAI API key (starts with `sk-proj-`)
   - `MODEL_MAP`: (Optional) `claude-sonnet-4-20250514:gpt-4o`

### Configure Claude Code

Set two environment variables:

```bash
export ANTHROPIC_BASE_URL=https://your-project.vercel.app
export ANTHROPIC_AUTH_TOKEN=my-secret-token-abc123def456
```

Then run Claude Code:

```bash
claude
```

That's it! Claude Code now routes through your gateway.

## Verify It Works

### Test with curl

```bash
curl -X POST https://your-project.vercel.app/v1/messages \
  -H "x-api-key: my-secret-token-abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [
      {"role": "user", "content": "Say hello!"}
    ]
  }'
```

Expected response:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {"type": "text", "text": "Hello! How can I help you?"}
  ],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 10, "output_tokens": 7}
}
```

### Health Check

```bash
curl https://your-project.vercel.app/
```

Response:
```json
{
  "status": "ok",
  "name": "Claude Central Gateway"
}
```

## Alternative Deployments

### Cloudflare Workers

```bash
npm install
npm run deploy:cf
```

Then set environment variables in `wrangler.toml` or Cloudflare dashboard.

### Local Development

```bash
npm install
npm run dev
```

Gateway runs on `http://localhost:5173`.

## Model Mapping Examples

**Mapping to cheaper models:**
```
MODEL_MAP=claude-sonnet-4-20250514:gpt-4-mini,claude-opus:gpt-4-turbo
```

**Single mapping:**
```
MODEL_MAP=claude-sonnet-4-20250514:gpt-4o
```

**No mapping (pass through):**
Leave `MODEL_MAP` empty; model names are used as-is (may fail if OpenAI doesn't recognize them).

## Troubleshooting

### "Unauthorized" Error (401)
- Check `GATEWAY_TOKEN` is set and matches your client's `ANTHROPIC_AUTH_TOKEN`
- Verify header is `x-api-key` (case-sensitive)

### "Not found" Error (404)
- Only `/v1/messages` endpoint is implemented
- Health check at `/` should return 200

### OpenAI API Errors (5xx)
- Check `OPENAI_API_KEY` is valid and has available credits
- Check `MODEL_MAP` points to valid OpenAI models
- Monitor OpenAI dashboard for rate limits

### Streaming not working
- Ensure client sends `"stream": true` in request
- Check response has `Content-Type: text/event-stream` header
- Verify client supports Server-Sent Events

## Next Steps

1. **Read the [API Reference](./api-reference.md)** for complete endpoint documentation
2. **Review [System Architecture](./system-architecture.md)** to understand how it works
3. **Set up monitoring** for OpenAI API usage and costs
4. **Rotate GATEWAY_TOKEN** periodically for security

## Cost Optimization Tips

1. Use `MODEL_MAP` to route to cheaper models:
   ```
   MODEL_MAP=claude-sonnet-4-20250514:gpt-4-mini
   ```

2. Set conservative `max_tokens` limits in Claude Code settings

3. Monitor OpenAI API dashboard weekly for unexpected usage spikes

4. Consider usage alerts in OpenAI dashboard

## FAQ

**Q: Is my token exposed if I use the hosted version?**
A: The gateway is stateless; tokens are compared server-side. Use a strong random token (32+ characters) and rotate periodically.

**Q: Can multiple machines use the same gateway?**
A: Yes, they all share the same `GATEWAY_TOKEN` and cost. Not suitable for multi-user scenarios.

**Q: What if OpenAI API goes down?**
A: Gateway will return a 500 error. No built-in fallback or retry logic.

**Q: Does the gateway log my requests?**
A: Hono middleware logs request method/path/status. Request bodies are not logged by default.

**Q: Can I use this with other LLM providers?**
A: Only if they support OpenAI's Chat Completions API format. See [penny-pincher-provider](https://github.com/tiennm99/penny-pincher-provider) for compatible providers.

**Q: How do I update the gateway?**
A: Pull latest changes and redeploy:
```bash
git pull origin main
vercel
```

## Getting Help

- **API questions**: See [API Reference](./api-reference.md)
- **Architecture questions**: See [System Architecture](./system-architecture.md)
- **Issues**: Open a GitHub issue with details about your setup and error logs
