import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

const isProduction = process.env.NODE_ENV === 'production';

/** Same-origin CSRF guard for state-changing methods (defense in depth: the
 *  browser only ever calls the web tier, which uses an HttpOnly cookie, but the
 *  backend is reachable through the web proxy, so we still verify the origin). */
function sameOriginGuard(allowedOrigins: string[]) {
  const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  return (request: Request, response: Response, next: NextFunction) => {
    if (!mutating.has(request.method.toUpperCase())) return next();
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    // No Origin/Referer at all ⇒ a server-to-server call (our SvelteKit proxy),
    // which is trusted. A present Origin/Referer must be on the allowlist.
    const source = origin || referer;
    if (!source) return next();
    // Match the ORIGIN exactly (an Origin header has no path) or, for a Referer,
    // require a path boundary — so `https://good.example.evil.com` does NOT pass a
    // naive prefix check against `https://good.example`.
    const ok = allowedOrigins.some(
      (allowed) => source === allowed || source.startsWith(`${allowed}/`),
    );
    if (!ok) {
      response.status(403).json({ message: 'Cross-origin request blocked' });
      return;
    }
    return next();
  };
}

function applyBaselineSecurityHeaders(app: INestApplication) {
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.removeHeader('X-Powered-By');
    next();
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.disable('x-powered-by');
  // Cap request bodies to blunt memory-abuse / oversized-payload attacks.
  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });

  const allowedOrigins = [
    'https://cartomania.bobagi.space',
    'http://localhost:5173',
    'http://localhost:3055',
  ];

  applyBaselineSecurityHeaders(app);
  app.use(sameOriginGuard(allowedOrigins));

  app.enableCors({
    // The SvelteKit front (web/) now calls Cartomania server-side over localhost, so
    // browser CORS is no longer load-bearing; these origins cover same-origin prod
    // plus local dev (vite on 5173, adapter-node on 3055).
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  // Swagger exposes the full API surface — only mount it outside production.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Cartomania API')
      .setDescription('Cartomania game backend')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
