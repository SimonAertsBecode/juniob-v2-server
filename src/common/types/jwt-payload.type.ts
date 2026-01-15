// JWT payload for authenticated users
export type JwtPayload = {
  sub: number; // User ID (companyId or developerId)
  email: string;
  role: 'COMPANY' | 'DEVELOPER';
};

// JWT payload with refresh token (for refresh endpoint)
export type JwtPayloadWithRt = JwtPayload & {
  refreshToken: string;
};
