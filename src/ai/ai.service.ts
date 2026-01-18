import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { generateProjectAnalysisPrompt } from './prompts/project-analysis.prompt';
import { generateHiringReportPrompt } from './prompts/hiring-report.prompt';

// Tier 1: Project Analysis Result (Developer can see)
export interface ProjectAnalysisResult {
  score: number;
  potentialMismatch: boolean;
  mismatchReason: string | null;
  strengths: string[];
  weaknesses: string[];
  strengthsSummary: string;
  weaknessesSummary: string;
  codeOrganization: string;
  techStack: string[];
}

// Tier 2: Hiring Report Result (Company only)
export interface HiringReportResult {
  recommendation: 'SAFE_TO_INTERVIEW' | 'INTERVIEW_WITH_CAUTION' | 'NOT_READY';
  recommendationReasons: string[];
  juniorLevel: 'ABOVE_EXPECTED' | 'WITHIN_EXPECTED' | 'BELOW_EXPECTED';
  juniorLevelContext: string;
  technicalBreakdown: {
    codeStructure: {
      summary: string;
      strengths: string[];
      improvements: string[];
    };
    coreFundamentals: {
      summary: string;
      strengths: string[];
      improvements: string[];
    };
    problemSolving: {
      summary: string;
      strengths: string[];
      improvements: string[];
    };
    toolingPractices: {
      summary: string;
      strengths: string[];
      improvements: string[];
    };
  };
  riskFlags: string[];
  authenticitySignal: 'HIGH' | 'MEDIUM' | 'LOW';
  authenticityExplanation: string;
  interviewQuestions: string[];
  overallScore: number;
  scoreBand: 'STRONG_JUNIOR' | 'AVERAGE_JUNIOR' | 'RISKY_JUNIOR';
  conclusion: string;
  techProficiency: Record<string, number>;
  mentoringNeeds: string[];
  growthPotential: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(private config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Tier 1: Analyze a single technical project
   * Developer can see this analysis
   */
  async analyzeProject(
    codeSnippets: string,
    fileCount: number,
    metadata?: {
      name: string;
      description: string;
      projectType: string;
      languages: string[];
      isFullstackByStructure?: boolean;
    },
    developerExperience?: Array<{ tech: string; months: number }>,
  ): Promise<ProjectAnalysisResult> {
    const prompt = generateProjectAnalysisPrompt(
      codeSnippets,
      fileCount,
      metadata,
      developerExperience,
    );

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0.4,
          system:
            'You are an honest, experienced code reviewer evaluating junior developers (0-3 years) for recruiters. Provide accurate assessments based on actual code quality. Use the full scoring range (0-100) appropriately. Be specific, honest, and differentiate between beginner and advanced work.',
          messages: [{ role: 'user', content: prompt }],
        });

        const content =
          response.content[0].type === 'text' ? response.content[0].text : '{}';

        // Clean response - remove analysis tags and markdown blocks
        const cleaned = content
          .trim()
          .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        // Validate required fields
        if (
          typeof parsed.score !== 'number' ||
          !Array.isArray(parsed.strengths) ||
          !Array.isArray(parsed.weaknesses)
        ) {
          throw new Error('Invalid AI response structure');
        }

        return {
          score: Math.min(100, Math.max(0, parsed.score)),
          potentialMismatch: parsed.potentialMismatch ?? false,
          mismatchReason: parsed.mismatchReason || null,
          strengths: parsed.strengths.slice(0, 5),
          weaknesses: parsed.weaknesses.slice(0, 5),
          strengthsSummary: parsed.strengthsSummary || '',
          weaknessesSummary: parsed.weaknessesSummary || '',
          codeOrganization: parsed.codeOrganization || '',
          techStack: parsed.techStack || [],
        };
      } catch (error: any) {
        const isRateLimit =
          error?.status === 429 ||
          error?.message?.includes('Rate limit') ||
          error?.message?.includes('overloaded');

        if (isRateLimit && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 5000;
          this.logger.warn(
            `Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (attempt === maxRetries) {
          this.logger.error(
            `Project analysis failed after ${maxRetries} attempts: ${error?.message}`,
          );
          throw new Error('Failed to analyze project with AI');
        }
      }
    }

    throw new Error('Failed to analyze project with AI');
  }

  /**
   * Tier 2: Generate aggregate hiring report
   * Only visible to companies who unlock
   */
  async generateHiringReport(
    projects: Array<{
      name: string;
      description: string;
      projectType: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      strengthsSummary: string;
      weaknessesSummary: string;
      techStack: string[];
    }>,
    developerProfile: {
      firstName?: string;
      lastName?: string;
      techExperiences?: Array<{ stackName: string; months: number }>;
    },
  ): Promise<HiringReportResult> {
    const prompt = generateHiringReportPrompt(projects, developerProfile);

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          temperature: 0.5,
          system:
            'You are a senior technical advisor providing hiring recommendations for junior developers (0-3 years). Your report must help recruiters answer: "Can I safely move this junior forward?" Be objective, specific, and actionable.',
          messages: [{ role: 'user', content: prompt }],
        });

        const content =
          response.content[0].type === 'text' ? response.content[0].text : '{}';

        const cleaned = content
          .trim()
          .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        // Validate recommendation enum
        const validRecommendations = [
          'SAFE_TO_INTERVIEW',
          'INTERVIEW_WITH_CAUTION',
          'NOT_READY',
        ];
        if (!validRecommendations.includes(parsed.recommendation)) {
          parsed.recommendation = 'INTERVIEW_WITH_CAUTION';
        }

        // Validate junior level enum
        const validLevels = [
          'ABOVE_EXPECTED',
          'WITHIN_EXPECTED',
          'BELOW_EXPECTED',
        ];
        if (!validLevels.includes(parsed.juniorLevel)) {
          parsed.juniorLevel = 'WITHIN_EXPECTED';
        }

        // Validate score band
        const validBands = ['STRONG_JUNIOR', 'AVERAGE_JUNIOR', 'RISKY_JUNIOR'];
        if (!validBands.includes(parsed.scoreBand)) {
          const score = parsed.overallScore || 50;
          if (score >= 75) parsed.scoreBand = 'STRONG_JUNIOR';
          else if (score >= 50) parsed.scoreBand = 'AVERAGE_JUNIOR';
          else parsed.scoreBand = 'RISKY_JUNIOR';
        }

        // Validate authenticity signal
        const validSignals = ['HIGH', 'MEDIUM', 'LOW'];
        if (!validSignals.includes(parsed.authenticitySignal)) {
          parsed.authenticitySignal = 'MEDIUM';
        }

        return {
          recommendation: parsed.recommendation,
          recommendationReasons: parsed.recommendationReasons || [],
          juniorLevel: parsed.juniorLevel,
          juniorLevelContext: parsed.juniorLevelContext || 'Junior Developer',
          technicalBreakdown: parsed.technicalBreakdown || {
            codeStructure: { summary: '', strengths: [], improvements: [] },
            coreFundamentals: { summary: '', strengths: [], improvements: [] },
            problemSolving: { summary: '', strengths: [], improvements: [] },
            toolingPractices: { summary: '', strengths: [], improvements: [] },
          },
          riskFlags: parsed.riskFlags || [],
          authenticitySignal: parsed.authenticitySignal,
          authenticityExplanation: parsed.authenticityExplanation || '',
          interviewQuestions: parsed.interviewQuestions || [],
          overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
          scoreBand: parsed.scoreBand,
          conclusion: parsed.conclusion || '',
          techProficiency: parsed.techProficiency || {},
          mentoringNeeds: parsed.mentoringNeeds || [],
          growthPotential: parsed.growthPotential || '',
        };
      } catch (error: any) {
        const isRateLimit =
          error?.status === 429 ||
          error?.message?.includes('Rate limit') ||
          error?.message?.includes('overloaded');

        if (isRateLimit && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 5000;
          this.logger.warn(
            `Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (attempt === maxRetries) {
          this.logger.error(
            `Hiring report generation failed after ${maxRetries} attempts: ${error?.message}`,
          );
          throw new Error('Failed to generate hiring report with AI');
        }
      }
    }

    throw new Error('Failed to generate hiring report with AI');
  }
}
