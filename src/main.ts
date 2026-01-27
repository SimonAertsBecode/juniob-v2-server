import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { generateOpenAPIFile } from './main.openapi';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Cookie parser for refresh tokens
  app.use(cookieParser());

  // Global validation pipe with custom error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const result = errors.reduce(
          (acc, error) => {
            if (!error?.constraints || typeof error.constraints !== 'object') {
              return acc;
            }
            const errorMessage =
              error.constraints[Object.keys(error.constraints)[0]];
            return {
              ...acc,
              [error.property]: errorMessage,
            };
          },
          {} as Record<string, string>,
        );
        return new BadRequestException(result);
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.getOrThrow('FRONTEND_URL') || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // Generate OpenAPI documentation in development
  if (process.env.NODE_ENV === 'development') {
    const document = await generateOpenAPIFile(app);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

void bootstrap();
