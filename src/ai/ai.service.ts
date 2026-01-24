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
   * Extract JSON from AI response - handles various formats
   */
  private extractJson(content: string): string {
    // Try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // Clean response - remove analysis tags and markdown blocks
    let cleaned = content
      .trim()
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // If still not starting with {, try to find the JSON object
    if (!cleaned.startsWith('{')) {
      const jsonStart = cleaned.indexOf('{');
      if (jsonStart !== -1) {
        cleaned = cleaned.substring(jsonStart);
      }
    }

    return cleaned;
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
    developerContext?: {
      developerType?: string | null;
      experiences?: Array<{ tech: string; months: number }>;
    },
  ): Promise<ProjectAnalysisResult> {
    const prompt = generateProjectAnalysisPrompt(
      codeSnippets,
      fileCount,
      metadata,
      developerContext,
    );

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Analyzing project (attempt ${attempt}/${maxRetries}): ${metadata?.name || 'Unknown'}`,
        );

        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          temperature: 0.2,
          system:
            'You are an expert code reviewer. First provide your analysis in <analysis> tags, then output ONLY valid JSON. The analysis should show your scoring calculation step by step.',
          messages: [{ role: 'user', content: prompt }],
        });

        const content =
          response.content[0].type === 'text' ? response.content[0].text : '{}';

        // Extract JSON from response
        const jsonString = this.extractJson(content);

        // Log first 200 chars for debugging
        this.logger.debug(
          `AI response preview: ${jsonString.substring(0, 200)}...`,
        );

        const parsed = JSON.parse(jsonString);

        // Validate required fields
        if (
          typeof parsed.score !== 'number' ||
          !Array.isArray(parsed.strengths) ||
          !Array.isArray(parsed.weaknesses)
        ) {
          throw new Error('Invalid AI response structure');
        }

        this.logger.log(
          `Successfully analyzed project: ${metadata?.name}, score: ${parsed.score}`,
        );

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

        const isJsonError = error?.message?.includes('JSON');

        if (isRateLimit && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 5000;
          this.logger.warn(
            `Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // Retry on JSON parsing errors too
        if (isJsonError && attempt < maxRetries) {
          this.logger.warn(
            `JSON parsing failed (attempt ${attempt}/${maxRetries}): ${error?.message}. Retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
      developerType?: string | null;
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
            'You are a senior technical advisor providing hiring recommendations for junior developers (0-3 years). Your report must help recruiters answer: "Can I safely move this junior forward?" Be objective, specific, and actionable. You MUST respond with ONLY valid JSON. No explanations, no markdown code blocks, no text before or after the JSON. Just the raw JSON object.',
          messages: [{ role: 'user', content: prompt }],
        });

        const content =
          response.content[0].type === 'text' ? response.content[0].text : '{}';

        // Extract JSON from response using helper
        const jsonString = this.extractJson(content);

        // Log first 200 chars for debugging
        this.logger.debug(
          `Hiring report response preview: ${jsonString.substring(0, 200)}...`,
        );

        const parsed = JSON.parse(jsonString);

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

        const isJsonError = error?.message?.includes('JSON');

        if (isRateLimit && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 5000;
          this.logger.warn(
            `Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // Retry on JSON parsing errors too
        if (isJsonError && attempt < maxRetries) {
          this.logger.warn(
            `JSON parsing failed (attempt ${attempt}/${maxRetries}): ${error?.message}. Retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
