# Documentation Index

Welcome to Claude Central Gateway documentation. Start here to find what you need.

## Getting Started

**New to the project?** Start with these:

1. **[Quick Start](./quick-start.md)** (5 min read)
   - Deploy the gateway in 1 minute
   - Configure Claude Code
   - Verify it works
   - Troubleshooting tips

2. **[Project Overview & PDR](./project-overview-pdr.md)** (10 min read)
   - What this project does and why
   - Feature requirements and roadmap
   - When to use it (and when not to)

## API & Integration

**Building with the gateway?** Use these:

3. **[API Reference](./api-reference.md)** (20 min read)
   - Complete endpoint documentation
   - Request/response formats
   - Authentication details
   - Code examples (curl, JavaScript)
   - Error handling

## Technical Deep Dives

**Understanding the architecture?** Read these:

4. **[System Architecture](./system-architecture.md)** (15 min read)
   - Request/response flow with diagrams
   - Tool use round-trip workflow
   - Data structures and schemas
   - Deployment topology
   - Stop reason mapping
   - Scalability characteristics

5. **[Code Standards](./code-standards.md)** (15 min read)
   - Codebase structure and module responsibilities
   - Naming conventions
   - Authentication implementation
   - Error handling patterns
   - Security practices
   - Performance considerations

## Common Tasks

### Deploy the Gateway
→ [Quick Start](./quick-start.md#deploy-to-vercel)

### Configure Claude Code
→ [Quick Start](./quick-start.md#configure-claude-code)

### Make API Requests
→ [API Reference](./api-reference.md#usage-examples)

### Understand Tool Use
→ [System Architecture](./system-architecture.md#tool-use-round-trip-special-case)

### Map Models to Cheaper Providers
→ [API Reference](./api-reference.md#configuration) or [Quick Start](./quick-start.md#cost-optimization-tips)

### Debug Issues
→ [Quick Start](./quick-start.md#troubleshooting)

### Understand Data Flow
→ [System Architecture](./system-architecture.md#request-flow-detailed)

### Review Implementation Details
→ [Code Standards](./code-standards.md)

## Documentation Map

```
docs/
├── index.md                      ← You are here
├── quick-start.md                ← Start here (5 min)
├── project-overview-pdr.md       ← What & why (10 min)
├── api-reference.md              ← API details (20 min)
├── system-architecture.md        ← How it works (15 min)
└── code-standards.md             ← Code details (15 min)
```

## Search by Topic

### Authentication & Security
- See [Code Standards: Security Practices](./code-standards.md#security-practices)
- See [API Reference: Authentication](./api-reference.md#authentication)

### Streaming Responses
- See [System Architecture: Response Transformation](./system-architecture.md#response-transformation)
- See [API Reference: Response (Streaming)](./api-reference.md#response-streaming)

### Tool Use / Function Calling
- See [System Architecture: Tool Use Round-Trip](./system-architecture.md#tool-use-round-trip-special-case)
- See [API Reference: Tool Definition](./api-reference.md#tool-definition)
- See [Code Standards: transform-response.js](./code-standards.md#transform-responsejs)

### Image Support
- See [API Reference: Image Content Type](./api-reference.md#image-user-messages-only)
- See [System Architecture: Content Block Handling](./system-architecture.md#content-block-handling)

### Error Handling
- See [API Reference: Error Responses](./api-reference.md#error-responses)
- See [Code Standards: Error Handling](./code-standards.md#error-handling)
- See [Quick Start: Troubleshooting](./quick-start.md#troubleshooting)

### Model Mapping & Configuration
- See [API Reference: Configuration](./api-reference.md#configuration)
- See [Quick Start: Model Mapping Examples](./quick-start.md#model-mapping-examples)

### Deployment Options
- See [Quick Start: Deploy to Vercel](./quick-start.md#deploy-to-vercel)
- See [Quick Start: Cloudflare Workers](./quick-start.md#cloudflare-workers)
- See [System Architecture: Deployment Topology](./system-architecture.md#deployment-topology)

### Stop Reasons & Generation Control
- See [API Reference: Stop Reasons](./api-reference.md#stop-reasons)
- See [System Architecture: Stop Reason Mapping](./system-architecture.md#stop-reason-mapping)
- See [Code Standards: transform-response.js](./code-standards.md#transform-responsejs)

### Performance & Scalability
- See [System Architecture: Scalability Characteristics](./system-architecture.md#scalability-characteristics)
- See [Code Standards: Performance Considerations](./code-standards.md#performance-considerations)

### Future Roadmap & Limitations
- See [Project Overview: Feature Roadmap](./project-overview-pdr.md#feature-roadmap)
- See [Project Overview: Known Limitations](./project-overview-pdr.md#known-limitations)
- See [API Reference: Limitations & Compatibility](./api-reference.md#limitations--compatibility)

## Document Statistics

| Document | Length | Focus | Audience |
|----------|--------|-------|----------|
| Quick Start | 5 min | Getting started | Everyone |
| Project Overview | 10 min | Vision & requirements | Product, decision makers |
| API Reference | 20 min | Endpoints & examples | Developers integrating |
| System Architecture | 15 min | Design & flow | Developers, maintainers |
| Code Standards | 15 min | Implementation details | Developers, contributors |

## Learning Paths

### "I Just Want to Use It"
1. [Quick Start](./quick-start.md) - Deploy and configure
2. [API Reference](./api-reference.md#usage-examples) - Code examples
3. [Quick Start Troubleshooting](./quick-start.md#troubleshooting) - If issues arise

### "I Want to Understand How It Works"
1. [Project Overview](./project-overview-pdr.md) - Context
2. [System Architecture](./system-architecture.md) - Design
3. [Code Standards](./code-standards.md) - Implementation

### "I'm Contributing to the Project"
1. [Project Overview](./project-overview-pdr.md) - Requirements
2. [Code Standards](./code-standards.md) - Structure & conventions
3. [System Architecture](./system-architecture.md) - Data flow
4. Read the actual code in `src/`

### "I'm Debugging an Issue"
1. [Quick Start Troubleshooting](./quick-start.md#troubleshooting) - Common fixes
2. [API Reference](./api-reference.md#error-responses) - Error codes
3. [System Architecture](./system-architecture.md#error-handling-architecture) - Error flow
4. [Code Standards](./code-standards.md#error-handling) - Error patterns

## Quick Links

- **GitHub Repository**: https://github.com/tiennm99/claude-central-gateway
- **Deploy to Vercel**: https://vercel.com/new/clone?repository-url=https://github.com/tiennm99/claude-central-gateway
- **OpenAI API Documentation**: https://platform.openai.com/docs/api-reference
- **Anthropic API Documentation**: https://docs.anthropic.com/en/docs/about/api-overview
- **Claude Code Router** (local alternative): https://github.com/musistudio/claude-code-router
- **LiteLLM** (enterprise alternative): https://github.com/BerriAI/litellm

## FAQ

**Q: Where do I start?**
A: [Quick Start](./quick-start.md) if you want to deploy immediately, or [Project Overview](./project-overview-pdr.md) if you want context first.

**Q: How do I make API calls?**
A: [API Reference](./api-reference.md#usage-examples)

**Q: Why did my request fail?**
A: [Quick Start Troubleshooting](./quick-start.md#troubleshooting) or [API Reference: Error Responses](./api-reference.md#error-responses)

**Q: How does tool use work?**
A: [System Architecture: Tool Use Round-Trip](./system-architecture.md#tool-use-round-trip-special-case)

**Q: What's supported?**
A: [README Features Section](../README.md#features--compatibility) or [API Reference](./api-reference.md#fully-supported)

**Q: How do I optimize costs?**
A: [Quick Start Cost Optimization Tips](./quick-start.md#cost-optimization-tips)

**Q: Can I self-host?**
A: Yes, see [Quick Start Alternative Deployments](./quick-start.md#alternative-deployments)

## Contributing

Want to contribute? Start with [Code Standards](./code-standards.md) to understand the architecture, then read the source code in `src/`.

## Version History

- **v1.0** (2025-04-05): Hono refactor with full tool use support, streaming, authentication
- **v0.x**: Initial OpenAI proxy implementation

## Last Updated

April 5, 2025

---

**Ready to get started?** → [Quick Start Guide](./quick-start.md)
