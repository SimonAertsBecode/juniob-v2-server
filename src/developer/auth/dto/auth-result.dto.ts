import { DeveloperAuthResponseDto } from './auth-response.dto';

// Internal type used by service - includes tokens for cookies
// This is NOT exposed via API - only DeveloperAuthResponseDto is
export type DeveloperAuthResult = DeveloperAuthResponseDto & {
  accessToken: string;
  refreshToken: string;
};
