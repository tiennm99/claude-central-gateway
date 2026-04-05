// Constant-time string comparison using byte-level XOR
// Works cross-platform: Cloudflare Workers, Node 18+, Deno, Bun
function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let result = 0;
  for (let i = 0; i < bufA.byteLength; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

// Auth middleware supporting both x-api-key (Anthropic SDK) and Authorization Bearer
export function authMiddleware() {
  return async (c, next) => {
    const gatewayToken = c.env.GATEWAY_TOKEN;
    if (!gatewayToken) {
      return c.json({
        type: 'error',
        error: { type: 'api_error', message: 'GATEWAY_TOKEN not configured' },
      }, 500);
    }

    const apiKey = c.req.header('x-api-key') || '';
    const authHeader = c.req.header('Authorization') || '';
    const token = apiKey || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

    if (!token || !timingSafeEqual(token, gatewayToken)) {
      return c.json({
        type: 'error',
        error: { type: 'authentication_error', message: 'Unauthorized' },
      }, 401);
    }

    await next();
  };
}
