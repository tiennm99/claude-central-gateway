# Claude Central Gateway - Project Overview & PDR

## Project Overview

Claude Central Gateway is a lightweight proxy service that routes Claude API requests to OpenAI's API, enabling cost optimization by using cheaper third-party providers. Built for personal and small-scale use, it emphasizes simplicity, minimal resource consumption, and multi-platform deployment.

**Repository:** https://github.com/tiennm99/claude-central-gateway

## Core Value Proposition

- **Cost Efficiency**: Route Claude API calls through cheaper OpenAI providers
- **Deployment Flexibility**: Run on Vercel, Cloudflare Workers, Node.js, or any Hono-compatible platform
- **Zero Complexity**: Minimal code, easy to understand, easy to fork and customize
- **Full Feature Support**: Streaming, tool use/tool result round-trips, images, system arrays

## Target Users

- Individual developers using Claude Code
- Small teams with tight LLM budgets
- Users seeking provider flexibility without enterprise complexity

## Non-Goals

- **Enterprise features**: GUI management, advanced routing, rate limiting, load balancing
- **GUI-based administration**: Focus remains on environment variable configuration
- **Multi-tenant support**: Designed for single-user or small-team deployment
- **Complex feature request routing**: Simple model mapping only

## Product Development Requirements (PDR)

### Functional Requirements

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-1 | Accept Anthropic Messages API requests at `/v1/messages` | Complete | P0 |
| FR-2 | Transform Anthropic requests to OpenAI Chat Completions format | Complete | P0 |
| FR-3 | Forward requests to OpenAI API and stream responses back | Complete | P0 |
| FR-4 | Support tool_use and tool_result message handling | Complete | P0 |
| FR-5 | Support image content (base64 and URLs) | Complete | P0 |
| FR-6 | Support system messages as string or array of text blocks | Complete | P0 |
| FR-7 | Authenticate requests with x-api-key header | Complete | P0 |
| FR-8 | Map stop_reason correctly (end_turn, max_tokens, tool_use, stop_sequence) | Complete | P0 |
| FR-9 | Forward stop_sequences and map to OpenAI stop parameter | Complete | P0 |
| FR-10 | Return usage token counts in responses | Complete | P0 |

### Non-Functional Requirements

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| NFR-1 | Support streaming with proper SSE Content-Type headers | Complete | P0 |
| NFR-2 | Timing-safe authentication comparison (prevent timing attacks) | Complete | P0 |
| NFR-3 | Cross-platform runtime support (Node.js, Cloudflare Workers, Deno, Bun) | Complete | P0 |
| NFR-4 | Minimal bundle size and resource consumption | Complete | P0 |
| NFR-5 | CORS support for browser-based clients | Complete | P1 |
| NFR-6 | Request logging for debugging | Complete | P1 |

### Architecture Requirements

- Modular structure with separated concerns (auth, transformation, routing)
- Stateless design for horizontal scaling
- No external dependencies beyond Hono and built-in APIs
- Configuration via environment variables only (no config files)

### Acceptance Criteria

- All Claude Code requests successfully proxied through OpenAI without client-side changes
- Tool use workflows complete successfully (request → tool_use → tool_result)
- Streaming responses match Anthropic SSE format exactly
- Authentication prevents unauthorized access
- Service deploys successfully on Vercel and Cloudflare Workers
- Zero security vulnerabilities in authentication

## Technical Constraints

- **Language**: JavaScript/Node.js
- **Framework**: Hono (lightweight, multi-platform)
- **API Standards**: Anthropic Messages API ↔ OpenAI Chat Completions API
- **Deployment**: Serverless platforms (Vercel, Cloudflare Workers, etc.)
- **Auth Model**: Single shared token (GATEWAY_TOKEN), suitable for personal use only

## Feature Roadmap

### Phase 1: Core Gateway (Complete)
- Basic message proxying
- Authentication
- Streaming support
- Model mapping

### Phase 2: Tool Support (Complete)
- Tool definition forwarding
- Tool use/tool result round-trips
- Tool choice mapping

### Phase 3: Content Types (Complete)
- Image support (base64, URLs)
- System message arrays
- Stop sequences

### Phase 4: Observability (Future)
- Detailed request logging
- Error tracking
- Usage analytics

### Phase 5: Advanced Features (Deferred)
- Model fallback/routing
- Rate limiting per token
- Request queuing
- Webhook logging

## Success Metrics

1. **Adoption**: GitHub stars, forks, real-world usage reports
2. **Reliability**: 99.9% uptime on test deployments
3. **Performance**: Response latency within 5% of direct OpenAI API
4. **Correctness**: All Anthropic API features work identically through proxy
5. **Code Quality**: Minimal security vulnerabilities, high readability

## Known Limitations

- **Single token**: No per-user authentication; all requests share one token
- **No rate limiting**: Susceptible to abuse if token is exposed
- **Basic error handling**: Limited error recovery strategies
- **Model mapping only**: Cannot route to different providers based on request properties
- **No request inspection**: Cannot log or analyze request content

## Alternatives & Positioning

### vs. Local Proxies (Claude Code Router)
- **Advantage**: Multi-machine support, instant deployment
- **Disadvantage**: Requires server infrastructure

### vs. Enterprise Solutions (LiteLLM)
- **Advantage**: Minimal resources, easier to understand and fork
- **Disadvantage**: No advanced routing, rate limiting, or team features

### vs. Direct API (No Proxy)
- **Advantage**: Cost savings through provider flexibility
- **Disadvantage**: Adds latency, complexity

## Development Standards

- Code follows modular, single-responsibility design
- All transformations use standard JavaScript APIs (no polyfills)
- Error handling covers common failure modes
- Security practices: timing-safe comparisons, header validation

## References

- **README**: Basic setup and deployment instructions
- **Code Standards**: Architecture, naming conventions, testing practices
- **System Architecture**: Detailed component interactions and data flow
