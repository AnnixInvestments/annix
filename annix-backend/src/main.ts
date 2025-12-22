import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-device-fingerprint'],
    credentials: true,
  });

  // Add security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.removeHeader('X-Powered-By'); // Hide Express/NestJS signature
    next();
  });

    // Enable global validation (checks DTOs automatically)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // remove unknown properties
        forbidNonWhitelisted: true, // throw error if extra fields
        transform: true, // auto-transform payloads to DTO instances
      }),
    );
  
    // swagger configuration
    const config = new DocumentBuilder()
    .setTitle('Annix API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth() // optional, if using JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ?? 4001);
}
bootstrap();
