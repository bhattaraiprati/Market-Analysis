import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Buffer logs until our custom logger is fully initialized
    bufferLogs: true, 
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Replace default logger with Winston
  app.useLogger(
    WinstonModule.createLogger({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json() // Saves logs in highly-readable structured JSON format
      ),
      transports: [
        // 1. Keep printing logs in the terminal console
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        // 2. Save all application logs to a file
        new winston.transports.File({
          dirname: path.join(__dirname, './../logs'), // Creates a 'logs' folder in root
          filename: 'combined.log',
          level: 'info',
        }),
        // 3. Save only error logs into a separate file for debugging
        new winston.transports.File({
          dirname: path.join(__dirname, './../logs'),
          filename: 'error.log',
          level: 'error',
        }),
      ],
    })
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global JWT guard (routes need @Public() decorator to bypass)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Strategic Growth Intelligence Platform API')
    .setDescription(
      'API documentation for the Strategic Growth Intelligence Platform - an AI-powered business research and strategy recommendation system',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and organization registration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs\n`);
}

bootstrap();
