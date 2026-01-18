import { CompanyAuthResponseDto } from './auth-response.dto';

// Internal type used by service - includes tokens for cookies
// This is NOT exposed via API - only CompanyAuthResponseDto is
export type CompanyAuthResult = CompanyAuthResponseDto & {
  accessToken: string;
  refreshToken: string;
};
