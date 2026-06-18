import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.enableCors({
    // The SvelteKit front (web/) now calls Cartomania server-side over localhost, so
    // browser CORS is no longer load-bearing; these origins cover same-origin prod
    // plus local dev (vite on 5173, adapter-node on 3055).
    origin: [
      'https://cartomania.bobagi.space',
      'http://localhost:5173',
      'http://localhost:3055',
    ],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  const config = new DocumentBuilder()
    .setTitle('Cartomania API')
    .setDescription('Cartomania game backend')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
