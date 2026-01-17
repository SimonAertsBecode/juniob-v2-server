import { Module, Global } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubAppService } from './github-app.service';
import { GithubController } from './github.controller';

@Global()
@Module({
  controllers: [GithubController],
  providers: [GithubService, GithubAppService],
  exports: [GithubService, GithubAppService],
})
export class GithubModule {}
