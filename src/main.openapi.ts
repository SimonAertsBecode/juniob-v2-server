import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';
import { writeFileSync } from 'fs';
import { INestApplication } from '@nestjs/common';

export const generateOpenAPIFile = async (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('Juniob V2 API')
    .setDescription('Junior Developer Pre-Screening Platform API')
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'access-token',
    )
    .addCookieAuth('jwt', {
      type: 'apiKey',
      in: 'cookie',
      description: 'JWT refresh token in cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);

  const yamlDocument = yaml.dump(document);

  writeFileSync('./docs/openapi.yaml', yamlDocument);

  return document;
};
