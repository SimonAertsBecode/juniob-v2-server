import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types';

export const GetCurrentUserTableId = createParamDecorator(
  async (_: undefined, context: ExecutionContext): Promise<number> => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return user.tableId;
  },
);
