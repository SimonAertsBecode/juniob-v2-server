import { CompanyAuthResponseDto } from './auth-response.dto';

// Internal type used by service - includes refresh token for cookie
// This is NOT exposed via API - only CompanyAuthResponseDto is
export type CompanyAuthResult = CompanyAuthResponseDto & {
  refreshToken: string;
};
