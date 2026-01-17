import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { DeveloperModule } from './developer/developer.module';
import { EmailModule } from './email/email.module';
import { EncryptionModule } from './encryption/encryption.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { AtGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    EmailModule,
    EncryptionModule,
    GithubModule,
    AiModule,
    CompanyModule,
    DeveloperModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
  ],
})
export class AppModule {}
