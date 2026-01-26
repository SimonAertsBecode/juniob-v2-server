// JWT payload for authenticated users
export type JwtPayload = {
  sub: number; // User ID (companyId or developerId)
  tableId: number; // User table (developer or company) id
  email: string;
  role: 'COMPANY' | 'DEVELOPER';
};

// JWT payload with refresh token (for refresh endpoint)
export type JwtPayloadWithRt = JwtPayload & {
  refreshToken: string;
};
