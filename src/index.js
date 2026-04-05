import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authMiddleware } from './auth-middleware.js';
import messages from './routes/messages.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check (unauthenticated)
app.get('/', (c) => c.json({ status: 'ok', name: 'Claude Central Gateway' }));

// Auth middleware for API routes
app.use('/v1/*', authMiddleware());

// Routes
app.route('/v1', messages);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
