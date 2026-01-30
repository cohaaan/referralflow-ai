import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { referralRoutes } from './routes/referrals.js';
import { facilityRoutes } from './routes/facilities.js';
import { analyticsRoutes } from './routes/analytics.js';
import { bedRoutes } from './routes/beds.js';
import { aiRoutes } from './routes/ai.js';

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
});

await fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

await fastify.register(referralRoutes, { prefix: '/api/referrals' });
await fastify.register(facilityRoutes, { prefix: '/api/facilities' });
await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
await fastify.register(bedRoutes, { prefix: '/api/beds' });
await fastify.register(aiRoutes, { prefix: '/api/ai' });

const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('🚀 API Server running at http://localhost:4000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
