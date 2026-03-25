---
name: Framework Decision - Hono
description: Why Hono was chosen over alternatives for the gateway
type: project
---

## Framework Choice: Hono

**Decision:** Use Hono as the web framework for Claude Central Gateway.

**Why Hono over alternatives:**

| Alternative | Why not |
|-------------|---------|
| Nitro | Overkill for simple proxy, 200KB+ bundle vs 14KB |
| itty-router | Cloudflare-focused, Vercel needs adapter |
| Native | Duplicate code per platform, manual streaming |

**Why Hono:**
- Single codebase for Vercel + Cloudflare + Deno + Bun
- Ultra-lightweight (~14KB)
- First-class streaming support (critical for SSE)
- Zero-config multi-platform
- Aligns with project philosophy: "Minimal, simple, deploy anywhere"

**How to apply:** All API routes should use Hono's `app.route()` pattern. Keep handlers simple and stateless.
