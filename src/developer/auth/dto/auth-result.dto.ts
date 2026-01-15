import { DeveloperAuthResponseDto } from './auth-response.dto';

// Internal type used by service - includes refresh token for cookie
// This is NOT exposed via API - only DeveloperAuthResponseDto is
export type DeveloperAuthResult = DeveloperAuthResponseDto & {
  refreshToken: string;
};
