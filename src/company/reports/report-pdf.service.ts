import { Injectable, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { FullReportDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';

// Juniob Brand Colors
const BRAND = {
  accent: '#fe5e41', // Coral/orange-red
  accentLight: 'rgba(254, 94, 65, 0.1)',
  accentGlow: 'rgba(254, 94, 65, 0.15)',
  depth: '#424b54', // Deep charcoal
  depthLight: '#525d68',
  accentDark: '#35000e', // Dark maroon
  accentDarkDeep: '#2a000b', // Dark maroon
  textPrimary: '#1a1a2e',
  textSecondary: '#4a4a68',
  textMuted: '#8e8ea9',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fb',
  bgTertiary: '#f0f2f5',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  borderLight: '#e5e7eb',
};

@Injectable()
export class ReportPdfService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private logoBase64: string | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  private getLogoBase64(): string {
    if (!this.logoBase64) {
      const logoPath = path.join(
        __dirname,
        'assets',
        'logo-nobackground-500.png',
      );
      const logoBuffer = fs.readFileSync(logoPath);
      this.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    return this.logoBase64;
  }

  /**
   * Generate PDF from full report - single continuous page
   */
  async generateReportPdf(report: FullReportDto): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateHtml(report);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Get the full height of the content
      const bodyHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      // Generate PDF with custom height to fit all content on one page
      const pdfBuffer = await page.pdf({
        width: '210mm', // A4 width
        height: `${Math.max(bodyHeight + 75, 297)}px`, // Dynamic height based on content
        margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate HTML template for the report with Juniob branding
   */
  private generateHtml(report: FullReportDto): string {
    const { developer, hiringReport, projectAnalyses } = report;
    const logoBase64 = this.getLogoBase64();

    const developerName =
      developer.firstName && developer.lastName
        ? `${developer.firstName} ${developer.lastName}`
        : 'Developer';

    const recConfig = this.getRecommendationConfig(hiringReport.recommendation);
    const levelConfig = this.getLevelConfig(hiringReport.juniorLevel);
    const scoreColor = this.getScoreColor(hiringReport.overallScore);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Technical Report - ${developerName}</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="report">
    <!-- Header with Juniob branding -->
    <header class="header">
      <div class="header-brand">
        <img src="${logoBase64}" alt="Juniob" class="header-logo" />
      </div>
      <div class="header-info">
        <span class="header-title">Technical Assessment Report</span>
        <span class="header-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </header>

    <!-- Developer Profile Card -->
    <section class="profile-card">
      <div class="profile-content">
        <div class="profile-avatar">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="profile-info">
          <h1 class="profile-name">${this.escapeHtml(developerName)}</h1>
          <div class="profile-meta">
            <span class="profile-email">${this.escapeHtml(developer.email)}</span>
            ${developer.location ? `<span class="profile-location">${this.escapeHtml(developer.location)}</span>` : ''}
          </div>
        </div>
        <div class="profile-score profile-score--${scoreColor}">
          <span class="profile-score-value">${hiringReport.overallScore}</span>
          <span class="profile-score-label">Score</span>
        </div>
      </div>
    </section>

    <!-- Executive Summary -->
    <section class="section">
      <div class="section-header">
        <div class="section-icon section-icon--accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target-icon lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <h2 class="section-title">Executive Summary</h2>
      </div>

      <div class="recommendation recommendation--${recConfig.color}">
        <div class="recommendation-icon">
          ${this.getRecommendationIcon(recConfig.color)}
        </div>
        <div class="recommendation-content">
          <div class="recommendation-badge">${recConfig.label}</div>
          <p class="recommendation-desc">${recConfig.description}</p>
        </div>
      </div>

      ${
        hiringReport.recommendationReasons?.length
          ? `
      <div class="reasons">
        <div class="reasons-header">Why this recommendation:</div>
        <ul class="reasons-list">
          ${hiringReport.recommendationReasons.map((r) => `<li>${this.escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }

      <div class="summary-grid">
        <div class="summary-card summary-card--${levelConfig.color}">
          <div class="summary-card-label">Junior Level Benchmark</div>
          <div class="summary-card-value">${levelConfig.label}</div>
          ${hiringReport.juniorLevelContext ? `<div class="summary-card-context">${this.escapeHtml(hiringReport.juniorLevelContext)}</div>` : ''}
        </div>
        <div class="summary-card summary-card--${scoreColor}">
          <div class="summary-card-label">Technical Confidence</div>
          <div class="summary-card-value">${hiringReport.overallScore}/100</div>
          ${hiringReport.scoreBand ? `<div class="summary-card-context">${this.formatScoreBand(hiringReport.scoreBand)}</div>` : ''}
        </div>
      </div>

      <div class="conclusion">
        <p>${this.escapeHtml(hiringReport.conclusion)}</p>
      </div>
    </section>

    <!-- Technical Assessment -->
    ${hiringReport.technicalBreakdown ? this.renderTechnicalBreakdown(hiringReport.technicalBreakdown) : ''}

    <!-- Tech Proficiency -->
    ${hiringReport.techProficiency && Object.keys(hiringReport.techProficiency).length ? this.renderTechProficiency(hiringReport.techProficiency) : ''}

    <!-- Risk & Interview Preparation -->
    ${this.renderRiskSection(hiringReport)}

    <!-- Growth & Development -->
    ${this.renderGrowthSection(hiringReport)}

    <!-- Project Evidence -->
    ${this.renderProjects(projectAnalyses)}

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-brand">
        <img src="${logoBase64}" alt="Juniob" class="footer-logo" />
        <div class="footer-tagline">
          <span class="footer-tagline-main">Junior developer assessment platform</span>
          <span class="footer-tagline-sub">Automated technical assessments</span>
        </div>
      </div>
      <div class="footer-info">
        <span>juniob.io</span>
        <span class="footer-divider">|</span>
        <span>Confidential Report</span>
      </div>
    </footer>
  </div>
</body>
</html>
    `;
  }

  private renderTechnicalBreakdown(
    breakdown: FullReportDto['hiringReport']['technicalBreakdown'],
  ): string {
    if (!breakdown) return '';

    const sections = [
      {
        key: 'codeStructure',
        title: 'Code Structure & Readability',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
        data: breakdown.codeStructure,
      },
      {
        key: 'coreFundamentals',
        title: 'Core Fundamentals',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>',
        data: breakdown.coreFundamentals,
      },
      {
        key: 'problemSolving',
        title: 'Problem-Solving',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
        data: breakdown.problemSolving,
      },
      {
        key: 'toolingPractices',
        title: 'Tooling & Practices',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
        data: breakdown.toolingPractices,
      },
    ].filter((s) => s.data);

    if (!sections.length) return '';

    return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h2 class="section-title">Technical Assessment</h2>
      </div>

      <div class="skill-grid">
        ${sections
          .map(
            (s) => `
          <div class="skill-card">
            <div class="skill-card-header">
              ${s.icon}
              <h3>${s.title}</h3>
            </div>
            <p class="skill-card-summary">${this.escapeHtml(s.data!.summary)}</p>
            ${
              s.data!.strengths?.length
                ? `
              <div class="skill-section skill-section--success">
                <h4>Strengths</h4>
                <ul>${s.data!.strengths.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
            ${
              s.data!.improvements?.length
                ? `
              <div class="skill-section skill-section--accent">
                <h4>To Improve</h4>
                <ul>${s.data!.improvements.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
          </div>
        `,
          )
          .join('')}
      </div>
    </section>
    `;
  }

  private renderTechProficiency(proficiency: Record<string, number>): string {
    const entries = Object.entries(proficiency);
    if (!entries.length) return '';

    return `
    <section class="section section--compact">
      <div class="section-header">
        <div class="section-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <h2 class="section-title">Technology Proficiency</h2>
      </div>

      <div class="proficiency-grid">
        ${entries
          .map(
            ([tech, score]) => `
          <div class="proficiency-item">
            <span class="proficiency-tech">${this.escapeHtml(tech)}</span>
            <div class="proficiency-bar">
              <div class="proficiency-fill" style="width: ${(score / 10) * 100}%"></div>
            </div>
            <span class="proficiency-score">${score}/10</span>
          </div>
        `,
          )
          .join('')}
      </div>
    </section>
    `;
  }

  private renderRiskSection(
    hiringReport: FullReportDto['hiringReport'],
  ): string {
    const hasContent =
      hiringReport.riskFlags?.length ||
      hiringReport.authenticitySignal ||
      hiringReport.interviewQuestions?.length;

    if (!hasContent) return '';

    return `
    <section class="section section--warning">
      <div class="section-header">
        <div class="section-icon section-icon--warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h2 class="section-title">Risk & Interview Preparation</h2>
      </div>

      <div class="risk-content">
        ${
          hiringReport.riskFlags?.length
            ? `
          <div class="risk-box">
            <h3>Points of Attention</h3>
            <ul>${hiringReport.riskFlags.map((f) => `<li>${this.escapeHtml(f)}</li>`).join('')}</ul>
          </div>
        `
            : ''
        }

        ${
          hiringReport.authenticitySignal
            ? `
          <div class="authenticity-box">
            <h3>Authenticity Signal</h3>
            <div class="authenticity-badge authenticity-badge--${hiringReport.authenticitySignal.toLowerCase()}">
              ${this.formatAuthenticitySignal(hiringReport.authenticitySignal)}
            </div>
            ${hiringReport.authenticityExplanation ? `<p>${this.escapeHtml(hiringReport.authenticityExplanation)}</p>` : ''}
          </div>
        `
            : ''
        }

        ${
          hiringReport.interviewQuestions?.length
            ? `
          <div class="interview-box">
            <h3>Suggested Interview Questions</h3>
            <ol>${hiringReport.interviewQuestions.map((q) => `<li>${this.escapeHtml(q)}</li>`).join('')}</ol>
          </div>
        `
            : ''
        }
      </div>
    </section>
    `;
  }

  private renderGrowthSection(
    hiringReport: FullReportDto['hiringReport'],
  ): string {
    const hasContent =
      hiringReport.mentoringNeeds?.length || hiringReport.growthPotential;

    if (!hasContent) return '';

    return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon section-icon--accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <h2 class="section-title">Growth & Development</h2>
      </div>

      <div class="growth-grid">
        ${
          hiringReport.mentoringNeeds?.length
            ? `
          <div class="growth-card">
            <h3>Mentoring Needs</h3>
            <ul>${hiringReport.mentoringNeeds.map((m) => `<li>${this.escapeHtml(m)}</li>`).join('')}</ul>
          </div>
        `
            : ''
        }
        ${
          hiringReport.growthPotential
            ? `
          <div class="growth-card growth-card--highlight">
            <h3>Growth Potential</h3>
            <p>${this.escapeHtml(hiringReport.growthPotential)}</p>
          </div>
        `
            : ''
        }
      </div>
    </section>
    `;
  }

  private renderProjects(projects: FullReportDto['projectAnalyses']): string {
    if (!projects.length) return '';

    return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </div>
        <h2 class="section-title">Project Evidence</h2>
        <span class="section-badge">${projects.length} project${projects.length !== 1 ? 's' : ''}</span>
      </div>

      <div class="projects-grid">
        ${projects
          .map(
            (project) => `
          <div class="project-card">
            <div class="project-header">
              <div class="project-info">
                <h3 class="project-name">${this.escapeHtml(project.name)}</h3>
                <span class="project-type">${project.projectType}</span>
              </div>
              <div class="project-score project-score--${this.getScoreColor(project.score)}">
                ${project.score}
              </div>
            </div>

            <div class="project-content">
              ${project.description ? `<p class="project-desc">${this.escapeHtml(project.description)}</p>` : ''}

              ${
                project.techStack?.length
                  ? `
                <div class="project-tech">
                  ${project.techStack
                    .slice(0, 6)
                    .map(
                      (t) =>
                        `<span class="tech-tag">${this.escapeHtml(t)}</span>`,
                    )
                    .join('')}
                  ${project.techStack.length > 6 ? `<span class="tech-tag tech-tag--more">+${project.techStack.length - 6}</span>` : ''}
                </div>
              `
                  : ''
              }

              <div class="project-analysis">
                ${
                  project.strengths?.length
                    ? `
                  <div class="analysis-col">
                    <h4 class="analysis-title analysis-title--success">Strengths</h4>
                    <ul>${project.strengths
                      .slice(0, 3)
                      .map((s) => `<li>${this.escapeHtml(s)}</li>`)
                      .join('')}</ul>
                  </div>
                `
                    : ''
                }
                ${
                  project.areasForImprovement?.length
                    ? `
                  <div class="analysis-col">
                    <h4 class="analysis-title analysis-title--accent">To Improve</h4>
                    <ul>${project.areasForImprovement
                      .slice(0, 3)
                      .map((s) => `<li>${this.escapeHtml(s)}</li>`)
                      .join('')}</ul>
                  </div>
                `
                    : ''
                }
              </div>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </section>
    `;
  }

  private getStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 10px;
        line-height: 1.5;
        color: ${BRAND.textPrimary};
        background: #f8f9fb;
      }

      .report {
        max-width: 100%;
        padding: 0;
      }

      /* ========================================= */
      /* Header - Minimal top bar */
      /* ========================================= */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, ${BRAND.accentDark} 0%, ${BRAND.accentDarkDeep} 100%);
        border: 1px solid ${BRAND.borderLight};
        border-radius: 16px;
        margin-bottom: 12px;
      }

      .header-brand {
        display: flex;
        align-items: center;
      }

      .header-logo {
        height: 32px;
        width: auto;
      }

      .header-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;
      }

      .header-title {
        font-size: 10px;
        font-weight: 600;
        color: ${BRAND.bgTertiary};
      }

      .header-date {
        font-size: 9px;
        color: ${BRAND.textMuted};
      }

      /* ========================================= */
      /* Profile Card - Matches report-header */
      /* ========================================= */
      .profile-card {
        background: ${BRAND.bgPrimary};
        border: 1px solid ${BRAND.borderLight};
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 12px;
      }

      .profile-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .profile-avatar {
        width: 52px;
        height: 52px;
        background: ${BRAND.bgSecondary};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${BRAND.textMuted};
        flex-shrink: 0;
      }

      .profile-info {
        flex: 1;
      }

      .profile-name {
        font-size: 18px;
        font-weight: 700;
        color: ${BRAND.textPrimary};
        margin-bottom: 4px;
      }

      .profile-meta {
        display: flex;
        gap: 16px;
        font-size: 10px;
        color: ${BRAND.textSecondary};
      }

      .profile-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 12px;
        flex-shrink: 0;
      }

      .profile-score--success { background: rgba(34, 197, 94, 0.08); }
      .profile-score--warning { background: rgba(245, 158, 11, 0.08); }
      .profile-score--error { background: rgba(239, 68, 68, 0.08); }

      .profile-score-value {
        font-size: 20px;
        font-weight: 700;
        line-height: 1;
      }

      .profile-score--success .profile-score-value { color: ${BRAND.success}; }
      .profile-score--warning .profile-score-value { color: ${BRAND.warning}; }
      .profile-score--error .profile-score-value { color: ${BRAND.error}; }

      .profile-score-label {
        font-size: 7px;
        color: ${BRAND.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
      }

      /* ========================================= */
      /* Sections - Matches .report-group */
      /* ========================================= */
      .section {
        background: ${BRAND.bgPrimary};
        border: 1px solid ${BRAND.borderLight};
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 12px;
      }

      .section--compact {
        padding: 0;
      }

      .section--warning {
        border-color: rgba(245, 158, 11, 0.3);
      }

      .section--warning .section-header {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%);
        border-bottom-color: rgba(245, 158, 11, 0.15);
      }

      .section--warning .section-icon {
        color: ${BRAND.warning};
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: ${BRAND.bgSecondary};
        border-bottom: 1px solid ${BRAND.borderLight};
      }

      .section-icon {
        color: ${BRAND.accent};
        flex-shrink: 0;
      }

      .section-icon--accent {
        color: ${BRAND.accent};
      }

      .section-icon--warning {
        color: ${BRAND.warning};
      }

      .section-title {
        font-size: 12px;
        font-weight: 700;
        color: ${BRAND.textPrimary};
        flex: 1;
      }

      .section-badge {
        font-size: 9px;
        color: ${BRAND.textMuted};
        margin-left: auto;
      }

      .section-content {
        padding: 16px;
      }

      .section > :not(.section-header) {
        padding: 16px;
      }

      .section > .skill-grid,
      .section > .proficiency-grid,
      .section > .risk-content,
      .section > .growth-grid,
      .section > .projects-grid {
        padding: 16px;
      }

      /* ========================================= */
      /* Recommendation - Matches .recommendation-card */
      /* ========================================= */
      .recommendation {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border-radius: 12px;
        margin: 16px;
    
      }

      .recommendation--success {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.05) 100%);
        border: 1px solid rgba(34, 197, 94, 0.25);
      }

      .recommendation--warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.05) 100%);
        border: 1px solid rgba(245, 158, 11, 0.25);
      }

      .recommendation--error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.05) 100%);
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      .recommendation-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .recommendation--success .recommendation-icon {
        background: rgba(34, 197, 94, 0.15);
        color: ${BRAND.success};
      }

      .recommendation--warning .recommendation-icon {
        background: rgba(245, 158, 11, 0.15);
        color: ${BRAND.warning};
      }

      .recommendation--error .recommendation-icon {
        background: rgba(239, 68, 68, 0.15);
        color: ${BRAND.error};
      }

      .recommendation-badge {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 2px;
      }

      .recommendation--success .recommendation-badge { color: ${BRAND.success}; }
      .recommendation--warning .recommendation-badge { color: ${BRAND.warning}; }
      .recommendation--error .recommendation-badge { color: ${BRAND.error}; }

      .recommendation-desc {
        font-size: 10px;
        color: ${BRAND.textSecondary};
        line-height: 1.4;
      }

      /* ========================================= */
      /* Reasons - Matches .recommendation-reasons */
      /* ========================================= */
      .reasons {
        background: ${BRAND.bgSecondary};
        border-radius: 10px;
        padding: 12px 14px;
        margin: 0 16px 12px;
      }

      .reasons-header {
        font-size: 8px;
        font-weight: 600;
        color: ${BRAND.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .reasons-list {
        padding-left: 16px;
        font-size: 10px;
        color: ${BRAND.textPrimary};
        line-height: 1.6;
      }

      .reasons-list li {
        margin-bottom: 4px;
      }

      .reasons-list li:last-child {
        margin-bottom: 0;
      }

      /* ========================================= */
      /* Summary Grid - Matches .summary-stats */
      /* ========================================= */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin: 0 16px 12px;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        background: ${BRAND.bgSecondary};
      }

      .summary-card--success { background: rgba(34, 197, 94, 0.08); }
      .summary-card--info { background: rgba(254, 94, 65, 0.08); }
      .summary-card--warning { background: rgba(245, 158, 11, 0.08); }
      .summary-card--error { background: rgba(239, 68, 68, 0.08); }

      .summary-card-label {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${BRAND.textMuted};
        margin-bottom: 2px;
      }

      .summary-card-value {
        font-size: 13px;
        font-weight: 700;
      }

      .summary-card--success .summary-card-value { color: ${BRAND.success}; }
      .summary-card--info .summary-card-value { color: ${BRAND.accent}; }
      .summary-card--warning .summary-card-value { color: ${BRAND.warning}; }
      .summary-card--error .summary-card-value { color: ${BRAND.error}; }

      .summary-card-context {
        font-size: 9px;
        color: ${BRAND.textSecondary};
        margin-top: 2px;
      }

      /* ========================================= */
      /* Conclusion - Matches .recommendation-conclusion */
      /* ========================================= */
      .conclusion {
        background: linear-gradient(135deg, rgba(254, 94, 65, 0.05) 0%, transparent 100%);
        border-left: 3px solid ${BRAND.accent};
        padding: 12px 14px;
        border-radius: 0 10px 10px 0;
        margin: 0 16px 16px;
      }

      .conclusion p {
        font-size: 10px;
        font-style: italic;
        color: ${BRAND.textPrimary};
        line-height: 1.6;
      }

      /* ========================================= */
      /* Skill Grid - Matches .skill-grid */
      /* ========================================= */
      .skill-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 16px;
      }

      .skill-card {
        background: ${BRAND.bgSecondary};
        border-radius: 10px;
        padding: 14px;
      }

      .skill-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        color: ${BRAND.accent};
      }

      .skill-card-header h3 {
        font-size: 11px;
        font-weight: 600;
        color: ${BRAND.textPrimary};
      }

      .skill-card-summary {
        font-size: 9px;
        color: ${BRAND.textSecondary};
        margin-bottom: 10px;
        line-height: 1.6;
      }

      .skill-section {
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .skill-section:last-child {
        margin-bottom: 0;
      }

      .skill-section--success {
        background: rgba(34, 197, 94, 0.08);
      }

      .skill-section--success h4 {
        color: ${BRAND.success};
      }

      .skill-section--accent {
        background: rgba(254, 94, 65, 0.08);
      }

      .skill-section--accent h4 {
        color: ${BRAND.accent};
      }

      .skill-section h4 {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        font-weight: 600;
      }

      .skill-section ul {
        padding-left: 14px;
        font-size: 9px;
        color: ${BRAND.textSecondary};
        line-height: 1.6;
      }

      .skill-section li {
        margin-bottom: 3px;
      }

      .skill-section li:last-child {
        margin-bottom: 0;
      }

      /* ========================================= */
      /* Proficiency - Matches .tech-proficiency */
      /* ========================================= */
      .proficiency-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
        background: ${BRAND.bgSecondary};
        margin: 16px;
        border-radius: 10px;
      }

      .proficiency-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .proficiency-tech {
        width: 80px;
        font-size: 10px;
        color: ${BRAND.textSecondary};
        flex-shrink: 0;
      }

      .proficiency-bar {
        flex: 1;
        height: 8px;
        background: ${BRAND.bgTertiary};
        border-radius: 4px;
        overflow: hidden;
      }

      .proficiency-fill {
        height: 100%;
        background: linear-gradient(90deg, ${BRAND.accent}, #ff8066);
        border-radius: 4px;
      }

      .proficiency-score {
        width: 40px;
        text-align: right;
        font-size: 10px;
        font-weight: 600;
        color: ${BRAND.accent};
      }

      /* ========================================= */
      /* Risk Section - Matches risk components */
      /* ========================================= */
      .risk-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      .risk-box {
        background: rgba(245, 158, 11, 0.06);
        border-radius: 10px;
        padding: 14px;
      }

      .authenticity-box, .interview-box {
        background: ${BRAND.bgSecondary};
        border-radius: 10px;
        padding: 14px;
      }

      .risk-box h3, .authenticity-box h3, .interview-box h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        color: ${BRAND.textPrimary};
        margin-bottom: 8px;
      }

      .risk-box h3 {
        color: ${BRAND.warning};
      }

      .risk-box ul, .interview-box ol {
        padding-left: 18px;
        font-size: 10px;
        color: ${BRAND.textPrimary};
        line-height: 1.6;
      }

      .risk-box li, .interview-box li {
        margin-bottom: 6px;
      }

      .risk-box li:last-child, .interview-box li:last-child {
        margin-bottom: 0;
      }

      .authenticity-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .authenticity-badge--high {
        background: ${BRAND.success};
        color: white;
      }

      .authenticity-badge--medium {
        background: ${BRAND.accent};
        color: white;
      }

      .authenticity-badge--low {
        background: ${BRAND.warning};
        color: white;
      }

      .authenticity-box p {
        font-size: 10px;
        color: ${BRAND.textSecondary};
        line-height: 1.6;
      }

      /* ========================================= */
      /* Growth Grid - Matches .growth-grid */
      /* ========================================= */
      .growth-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 16px;
      }

      .growth-card {
        background: ${BRAND.bgSecondary};
        border-radius: 10px;
        padding: 14px;
      }

      .growth-card--highlight {
        background: linear-gradient(135deg, rgba(254, 94, 65, 0.08) 0%, rgba(254, 94, 65, 0.03) 100%);
      }

      .growth-card h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        color: ${BRAND.textPrimary};
        margin-bottom: 10px;
      }

      .growth-card h3 svg {
        color: ${BRAND.accent};
      }

      .growth-card ul {
        padding-left: 16px;
        font-size: 10px;
        color: ${BRAND.textSecondary};
        line-height: 1.6;
      }

      .growth-card li {
        margin-bottom: 4px;
      }

      .growth-card li:last-child {
        margin-bottom: 0;
      }

      .growth-card p {
        font-size: 10px;
        color: ${BRAND.textSecondary};
        line-height: 1.6;
      }

      /* ========================================= */
      /* Projects - Matches .project-analysis-card */
      /* ========================================= */
      .projects-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      .project-card {
        background: ${BRAND.bgSecondary};
        border-radius: 12px;
        overflow: hidden;
      }

      .project-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        background: ${BRAND.bgSecondary};
      }

      .project-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .project-name {
        font-size: 11px;
        font-weight: 600;
        color: ${BRAND.textPrimary};
      }

      .project-type {
        font-size: 8px;
        text-transform: uppercase;
        color: ${BRAND.textMuted};
        background: ${BRAND.bgTertiary};
        padding: 3px 8px;
        border-radius: 6px;
      }

      .project-score {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      .project-score--success { background: ${BRAND.success}; }
      .project-score--warning { background: ${BRAND.warning}; }
      .project-score--error { background: ${BRAND.error}; }

      .project-content {
        padding: 14px;
        border-top: 1px solid ${BRAND.borderLight};
        background: ${BRAND.bgPrimary};
      }

      .project-desc {
        font-size: 10px;
        color: ${BRAND.textSecondary};
        margin-bottom: 12px;
        line-height: 1.6;
      }

      .project-tech {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }

      .tech-tag {
        font-size: 9px;
        background: ${BRAND.bgSecondary};
        color: ${BRAND.textSecondary};
        padding: 3px 8px;
        border-radius: 6px;
      }

      .tech-tag--more {
        background: rgba(254, 94, 65, 0.1);
        color: ${BRAND.accent};
      }

      .project-analysis {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .analysis-col {
        padding: 12px;
        border-radius: 8px;
      }

      .analysis-col:first-child {
        background: rgba(34, 197, 94, 0.06);
      }

      .analysis-col:last-child {
        background: rgba(254, 94, 65, 0.06);
      }

      .analysis-title {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .analysis-title--success { color: ${BRAND.success}; }
      .analysis-title--accent { color: ${BRAND.accent}; }

      .analysis-col ul {
        padding-left: 14px;
        font-size: 9px;
        color: ${BRAND.textSecondary};
        line-height: 1.6;
      }

      .analysis-col li {
        margin-bottom: 4px;
      }

      .analysis-col li:last-child {
        margin-bottom: 0;
      }

      /* ========================================= */
      /* Footer - Subtle branding */
      /* ========================================= */
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        background: linear-gradient(135deg, ${BRAND.accentDark} 0%, ${BRAND.accentDarkDeep} 100%);
        border: 1px solid ${BRAND.borderLight};
        border-radius: 16px;
        margin-top: 12px;
      }

      .footer-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .footer-logo {
        height: 24px;
        width: auto;
        opacity: 0.8;
      }

      .footer-tagline {
        display: flex;
        flex-direction: column;
      }

      .footer-tagline-main {
        font-size: 10px;
        font-weight: 600;
        color: ${BRAND.bgTertiary};
      }

      .footer-tagline-sub {
        font-size: 8px;
        color: ${BRAND.textMuted};
      }

      .footer-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 9px;
        color: ${BRAND.textMuted};
      }

      .footer-divider {
        color: ${BRAND.borderLight};
      }
    `;
  }

  private getRecommendationConfig(recommendation: string): {
    color: string;
    label: string;
    description: string;
  } {
    const configs: Record<
      string,
      { color: string; label: string; description: string }
    > = {
      SAFE_TO_INTERVIEW: {
        color: 'success',
        label: 'Safe to Interview',
        description: 'Solid fundamentals, safe to proceed with interview',
      },
      INTERVIEW_WITH_CAUTION: {
        color: 'warning',
        label: 'Interview with Caution',
        description:
          'Has potential but notable concerns to probe during interview',
      },
      NOT_READY: {
        color: 'error',
        label: 'Not Ready',
        description: 'Too many fundamental gaps for a professional environment',
      },
    };
    return (
      configs[recommendation] || {
        color: 'info',
        label: recommendation,
        description: '',
      }
    );
  }

  private getRecommendationIcon(color: string): string {
    if (color === 'success') {
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (color === 'warning') {
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
      return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }
  }

  private getLevelConfig(level: string): { color: string; label: string } {
    const configs: Record<string, { color: string; label: string }> = {
      ABOVE_EXPECTED: { color: 'success', label: 'Above Expected' },
      WITHIN_EXPECTED: { color: 'info', label: 'Within Expected' },
      BELOW_EXPECTED: { color: 'warning', label: 'Below Expected' },
    };
    return configs[level] || { color: 'info', label: level };
  }

  private getScoreColor(score: number): string {
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  }

  private formatScoreBand(band: string): string {
    return band.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private formatAuthenticitySignal(signal: string): string {
    const labels: Record<string, string> = {
      HIGH: 'High Confidence',
      MEDIUM: 'Medium Confidence',
      LOW: 'Low Confidence',
    };
    return labels[signal] || signal;
  }

  private escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
