/**
 * GitHub App JWT payload for generating authentication tokens
 */
export interface GithubAppJwtPayload {
  iat: number; // Issued at (seconds since epoch)
  exp: number; // Expiration (seconds since epoch)
  iss: string; // GitHub App ID
}

/**
 * Response from GitHub when exchanging installation ID for access token
 */
export interface GithubInstallationAccessToken {
  token: string;
  expires_at: string; // ISO 8601 timestamp
  permissions: Record<string, string>;
  repository_selection: 'all' | 'selected';
}

/**
 * Repository data from GitHub API
 */
export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
}

/**
 * Result of setting up a GitHub App installation
 */
export interface GithubInstallationResult {
  success: boolean;
  message: string;
  repositoryCount?: number;
}

/**
 * Repository info returned to the client
 */
export interface GithubRepositoryInfo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  description: string | null;
}
