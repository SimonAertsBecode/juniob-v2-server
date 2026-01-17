import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Octokit } from 'octokit';

export interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  content: string;
}

export interface RepoValidationResult {
  owner: string;
  repo: string;
  isPrivate: boolean;
  defaultBranch: string;
}

interface GithubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  download_url?: string;
}

interface GithubApiError {
  status?: number;
  message?: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  // Directories to ignore
  private readonly IGNORED_DIRS = new Set([
    'node_modules',
    'vendor',
    'venv',
    '__pycache__',
    '.venv',
    'env',
    'bower_components',
    'Pods',
    'target',
    'build',
    'dist',
    '.next',
    '.nuxt',
    'out',
    'coverage',
    '.pytest_cache',
    '.mypy_cache',
    '.gradle',
    'bin',
    'obj',
    'packages',
    '.expo',
    '.expo-shared',
    '.git',
  ]);

  // Files to ignore
  private readonly IGNORED_FILES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'Gemfile.lock',
    'poetry.lock',
    'Cargo.lock',
    'Podfile.lock',
    'pubspec.lock',
    '.DS_Store',
    'Thumbs.db',
  ]);

  // Extensions to ignore
  private readonly IGNORED_EXTENSIONS = [
    '.log',
    '.lock',
    '.tmp',
    '.temp',
    '.cache',
    '.min.js',
    '.min.css',
    '.map',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
  ];

  // Relevant extensions for code analysis
  private readonly RELEVANT_EXTENSIONS = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.vue',
    '.svelte',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.py',
    '.java',
    '.kt',
    '.kts',
    '.go',
    '.rb',
    '.php',
    '.cs',
    '.rs',
    '.swift',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.dart',
    '.m',
    '.mm',
    '.json',
    '.yml',
    '.yaml',
    '.toml',
    '.xml',
    '.env.example',
    '.gitignore',
    '.eslintrc',
    '.prettierrc',
    '.md',
    '.txt',
    '.sql',
    '.prisma',
    '.graphql',
    '.gql',
  ];

  /**
   * Parse GitHub repository URL to extract owner and repo
   */
  parseGithubUrl(githubUrl: string): { owner: string; repo: string } {
    const urlMatch = githubUrl.match(
      /^https:\/\/github\.com\/([\w-]+)\/([\w.-]+)\/?$/,
    );
    if (!urlMatch) {
      throw new BadRequestException('Invalid GitHub repository URL format');
    }

    const [, owner, repo] = urlMatch;
    return { owner, repo: repo.replace(/\.git$/, '') };
  }

  /**
   * Convert GitHub URL to full name (owner/repo)
   */
  getRepoFullName(githubUrl: string): string {
    const { owner, repo } = this.parseGithubUrl(githubUrl);
    return `${owner}/${repo}`;
  }

  /**
   * Validate that a GitHub repository exists and is accessible
   * @param octokit - Authenticated Octokit instance
   * @param githubUrl - GitHub repository URL
   */
  async validateRepository(
    octokit: Octokit,
    githubUrl: string,
  ): Promise<RepoValidationResult> {
    const { owner, repo } = this.parseGithubUrl(githubUrl);

    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      return {
        owner,
        repo,
        isPrivate: response.data.private,
        defaultBranch: response.data.default_branch,
      };
    } catch (error: unknown) {
      const apiError = error as GithubApiError;
      if (apiError.status === 404) {
        throw new BadRequestException(
          'Repository not found or not accessible. Please ensure you have authorized access to this repository.',
        );
      }
      this.logger.error(`Failed to validate repository: ${apiError.message}`);
      throw new BadRequestException('Failed to validate repository');
    }
  }

  /**
   * List programming languages used in a repository
   * @param octokit - Authenticated Octokit instance
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async listRepoLanguages(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<string[]> {
    try {
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/languages',
        {
          owner,
          repo,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      return Object.keys(response.data || {});
    } catch (error: unknown) {
      const apiError = error as GithubApiError;
      this.logger.warn(
        `Failed to fetch languages for ${owner}/${repo}: ${apiError.message}`,
      );
      return [];
    }
  }

  /**
   * Fetch the complete structure and content of a repository
   * Filters out non-relevant files and respects size limits
   * @param octokit - Authenticated Octokit instance
   * @param githubUrl - GitHub repository URL
   */
  async fetchRepositoryStructure(
    octokit: Octokit,
    githubUrl: string,
  ): Promise<RepoFile[]> {
    const { owner, repo } = this.parseGithubUrl(githubUrl);

    const allFiles: RepoFile[] = [];

    const fetchDir = async (
      path: string = '',
      depth: number = 0,
    ): Promise<void> => {
      if (depth > 10) return; // Limit recursion

      try {
        const response = await octokit.request(
          'GET /repos/{owner}/{repo}/contents/{path}',
          {
            owner,
            repo,
            path,
            headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          },
        );

        const items = (
          Array.isArray(response.data) ? response.data : [response.data]
        ) as GithubContentItem[];

        for (const item of items) {
          if (item.type === 'dir') {
            if (!this.shouldIgnoreDir(item.name)) {
              await fetchDir(item.path, depth + 1);
            }
            continue;
          }

          if (item.type === 'file') {
            const fileSize = item.size || 0;
            if (this.shouldIgnoreFile(item.name, fileSize)) continue;

            let content = '';
            if (item.download_url) {
              try {
                const res = await fetch(item.download_url);
                if (res.ok) {
                  content = await res.text();
                }
              } catch {
                content = '';
              }
            }

            allFiles.push({
              name: item.name,
              path: item.path,
              type: 'file',
              size: fileSize,
              content,
            });
          }
        }
      } catch (error: unknown) {
        const apiError = error as GithubApiError;
        this.logger.warn(
          `Failed to fetch directory ${path}: ${apiError.message}`,
        );
      }
    };

    await fetchDir('', 0);
    return allFiles;
  }

  /**
   * Get file priority for analysis ordering
   * Higher priority files are more important for assessment
   */
  getFilePriority(filePath: string): number {
    const path = filePath.toLowerCase();
    const fileName = path.split('/').pop() || '';

    // Entry points - highest priority
    const entryPoints = [
      'index.js',
      'index.ts',
      'index.jsx',
      'index.tsx',
      'main.js',
      'main.ts',
      'app.js',
      'app.ts',
      'server.js',
      'server.ts',
    ];
    if (
      entryPoints.includes(fileName) ||
      path.includes('src/app.') ||
      path.includes('src/main.') ||
      path.includes('src/index.')
    ) {
      return 1000;
    }

    // Documentation
    if (fileName === 'readme.md' || fileName === 'package.json') return 900;

    // Core source files
    if (path.includes('src/')) {
      if (
        path.includes('route') ||
        path.includes('controller') ||
        path.includes('service') ||
        path.includes('api')
      )
        return 150;
      if (
        path.includes('component') ||
        path.includes('page') ||
        path.includes('hook') ||
        path.includes('view')
      )
        return 145;
      if (
        path.includes('model') ||
        path.includes('store') ||
        path.includes('redux') ||
        path.includes('context')
      )
        return 130;
      return 120;
    }

    if (path.includes('lib/') || path.includes('app/')) return 110;
    if (path.includes('util') || path.includes('helper')) return 70;
    if (
      path.includes('test') ||
      path.includes('spec') ||
      path.includes('__tests__')
    )
      return 30;

    // Config files
    if (
      fileName.endsWith('.json') ||
      fileName.endsWith('.yml') ||
      fileName.endsWith('.yaml')
    )
      return 20;

    return 50;
  }

  /**
   * Detect if a project is fullstack based on directory structure
   */
  detectFullstackByStructure(files: RepoFile[]): boolean {
    const paths = files.map((f) => f.path.toLowerCase());
    const contents = files.map((f) => f.content.toLowerCase());

    // Pattern 1: client/server or frontend/backend directories
    const hasClientDir = paths.some(
      (p) =>
        p.includes('/client/') ||
        p.startsWith('client/') ||
        p.includes('/frontend/') ||
        p.startsWith('frontend/'),
    );
    const hasServerDir = paths.some(
      (p) =>
        p.includes('/server/') ||
        p.startsWith('server/') ||
        p.includes('/backend/') ||
        p.startsWith('backend/'),
    );
    if (hasClientDir && hasServerDir) return true;

    // Pattern 2: Java UI + Server
    const hasJavaUI = contents.some(
      (c) =>
        c.includes('import javax.swing') ||
        c.includes('import javafx') ||
        c.includes('import java.awt'),
    );
    const hasJavaServer = contents.some(
      (c) =>
        c.includes('import java.net.serversocket') ||
        c.includes('import org.springframework') ||
        c.includes('import jakarta.servlet'),
    );
    if (hasJavaUI && hasJavaServer) return true;

    // Pattern 3: Python backend + frontend files
    const hasPythonBackend = contents.some(
      (c) =>
        c.includes('from flask import') ||
        c.includes('from django') ||
        c.includes('fastapi'),
    );
    const hasFrontendFiles = paths.some(
      (p) => p.endsWith('.jsx') || p.endsWith('.tsx') || p.endsWith('.vue'),
    );
    if (hasPythonBackend && hasFrontendFiles) return true;

    // Pattern 4: Node.js backend + React/Vue
    const hasNodeBackend = contents.some(
      (c) =>
        c.includes('express()') ||
        c.includes('import express') ||
        c.includes("require('express')") ||
        c.includes('app.listen('),
    );
    const hasReactVue = contents.some(
      (c) =>
        c.includes('import react') ||
        c.includes("from 'react'") ||
        c.includes('import vue') ||
        c.includes('@component'),
    );
    if (hasNodeBackend && hasReactVue) return true;

    return false;
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private shouldIgnoreDir(name: string): boolean {
    return this.IGNORED_DIRS.has(name) || name.startsWith('.');
  }

  private shouldIgnoreFile(name: string, size: number): boolean {
    if (this.IGNORED_FILES.has(name)) return true;
    if (this.IGNORED_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;

    const hasRelevantExt = this.RELEVANT_EXTENSIONS.some((ext) =>
      name.endsWith(ext),
    );
    const isSpecialFile = [
      'README',
      'LICENSE',
      'CONTRIBUTING',
      'CHANGELOG',
      'Makefile',
      'Dockerfile',
    ].some((special) => name.toUpperCase().startsWith(special));

    if (!hasRelevantExt && !isSpecialFile) return true;
    if (size > 100000) return true; // Skip files > 100KB

    return false;
  }
}
