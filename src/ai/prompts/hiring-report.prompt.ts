/**
 * Hiring Report Prompt - Tier 2 Analysis
 * Based on TECHNICAL_REPORT_SPECS.md requirements
 *
 * This prompt generates a recruiter-oriented technical report that helps
 * decide whether a junior developer should move forward in the hiring process.
 */

interface ProjectAnalysisData {
  name: string;
  description: string;
  projectType: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  strengthsSummary: string;
  weaknessesSummary: string;
  techStack: string[];
}

interface TechExperience {
  stackName: string;
  months: number;
}

interface DeveloperProfile {
  firstName?: string;
  lastName?: string;
  developerType?: string | null; // FRONTEND, BACKEND, FULLSTACK, MOBILE
  techExperiences?: TechExperience[];
}

export const generateHiringReportPrompt = (
  projects: ProjectAnalysisData[],
  developerProfile: DeveloperProfile,
): string => {
  const projectsSection = projects
    .map(
      (project, index) => `
<project index="${index + 1}">
  <name>${project.name}</name>
  <description>${project.description}</description>
  <type>${project.projectType}</type>
  <score>${project.score}</score>
  <tech_stack>${project.techStack.join(', ')}</tech_stack>
  <strengths>
${project.strengths.map((s) => `    <item>${s}</item>`).join('\n')}
  </strengths>
  <weaknesses>
${project.weaknesses.map((w) => `    <item>${w}</item>`).join('\n')}
  </weaknesses>
  <strengths_summary>${project.strengthsSummary}</strengths_summary>
  <weaknesses_summary>${project.weaknessesSummary}</weaknesses_summary>
</project>`,
    )
    .join('\n');

  const avgScore = Math.round(
    projects.reduce((sum, p) => sum + p.score, 0) / projects.length,
  );

  // Format tech experiences for the prompt
  const techExperiencesSection =
    developerProfile.techExperiences &&
    developerProfile.techExperiences.length > 0
      ? developerProfile.techExperiences
          .map(
            (exp) => `<tech name="${exp.stackName}" months="${exp.months}" />`,
          )
          .join('\n')
      : '    <none>No tech experiences specified</none>';

  return `You are a senior technical advisor providing hiring recommendations for JUNIOR DEVELOPERS (0-3 years of experience).

<core_principle>
Every section of this report must help answer one question:
**"Can I safely move this junior forward?"**

If a section does not reduce risk, uncertainty, or explanation effort, it should not exist.
</core_principle>

<developer_profile>
  <name>${developerProfile.firstName || 'Unknown'} ${developerProfile.lastName || ''}</name>
  <specialization>${developerProfile.developerType || 'Not specified'}</specialization>
  <projects_analyzed>${projects.length}</projects_analyzed>
  <average_project_score>${avgScore}</average_project_score>
  <self_reported_tech_experience>
${techExperiencesSection}
  </self_reported_tech_experience>
</developer_profile>

<specialization_context>
${
  developerProfile.developerType
    ? `The developer identifies as: ${developerProfile.developerType}.
Evaluate their projects and skills with this career direction in mind:
- FRONTEND: Focus on UI/UX quality, component architecture, state management, accessibility
- BACKEND: Focus on API design, data modeling, security, performance, scalability patterns
- FULLSTACK: Expect breadth across both areas, assess balance between frontend and backend skills
- MOBILE: Focus on native/cross-platform patterns, offline handling, responsive design, performance`
    : 'No specialization specified - provide general full-stack assessment.'
}
</specialization_context>

<important_context>
The tech experience above is SELF-REPORTED by the developer (in months). Use this to:
1. Calibrate your expectations - a developer claiming 4 months of React experience should be evaluated differently than one claiming 24 months
2. Identify potential mismatches between claimed experience and demonstrated skill level
3. If claimed experience seems inconsistent with code quality, note this in the authenticity section
</important_context>

<analyzed_projects count="${projects.length}">
${projectsSection}
</analyzed_projects>

<report_structure>
Your report MUST include these sections in this order:

## 1. HIRING RECOMMENDATION (Primary Decision Signal)
Choose ONE of these EXACT values:
- "SAFE_TO_INTERVIEW" - Solid fundamentals, safe to proceed
- "INTERVIEW_WITH_CAUTION" - Has potential but notable concerns to probe
- "NOT_READY" - Too many fundamental gaps for a professional environment

Provide 3-5 SHORT bullet points explaining WHY.
Example:
- Solid understanding of core React concepts
- Clean and readable code structure
- Weak error handling practices (coachable)

## 2. JUNIOR LEVEL BENCHMARK
Compare against expected junior level:
- "ABOVE_EXPECTED" - Exceeds typical junior level (top 10-15%)
- "WITHIN_EXPECTED" - Meets expectations for a junior
- "BELOW_EXPECTED" - Below typical junior level

Include context: Junior Frontend / Junior Backend / Junior Full-Stack

## 3. TECHNICAL SKILL BREAKDOWN
For each relevant area, provide:
- Short qualitative summary (1-2 sentences)
- Key strengths observed
- Improvement areas

Areas to assess:
- Code structure & readability
- Core fundamentals
- Problem-solving approach
- Tooling & best practices

Avoid numeric obsession - focus on qualitative assessment.

## 4. RISK FLAGS / POINTS OF ATTENTION (Critical)
List potential risks that could cause surprises after hiring:
- Heavy reliance on tutorials without understanding
- Limited debugging strategy
- Superficial understanding of async logic
- Inconsistent architectural choices
- Security vulnerabilities
- Missing fundamental patterns

Tone: Factual, not judgmental. These help prepare interviewers.

## 5. AUTHENTICITY & CONFIDENCE SIGNAL
Estimate confidence in candidate's understanding of their own work:
- "HIGH" - Code shows clear understanding, consistent patterns
- "MEDIUM" - Mixed signals, some areas seem learned vs understood
- "LOW" - Evidence of heavy copy-paste without comprehension

Brief explanation of what signals you observed.

## 6. INTERVIEW GUIDANCE
Provide 3-5 specific interview questions or discussion points based on:
- Weak areas identified
- Risk flags
- Unclear concepts

Focus on validation, not trick questions.
Example: "Ask them to explain their state management approach in [project] and why they chose Redux over Context API."

## 7. TECHNICAL CONFIDENCE SCORE
Internal score for comparison purposes:
- Score: 0-100
- Band: STRONG_JUNIOR (75-100) / AVERAGE_JUNIOR (50-74) / RISKY_JUNIOR (0-49)

This score supports the qualitative evaluation - it is NOT the primary decision signal.
</report_structure>

<language_guidelines>
- Business-oriented, recruiter-friendly
- Clear and concise
- Explain impact, not just correctness
- Avoid academic or judgmental language
- Use measured language - reserve superlatives for genuine standouts
</language_guidelines>

<output_format>
IMPORTANT: You MUST output ONLY valid JSON. No explanations, no markdown code blocks, no text before or after the JSON. Just the raw JSON object.

Your response must be exactly this JSON structure (nothing else):

{
  "recommendation": "SAFE_TO_INTERVIEW | INTERVIEW_WITH_CAUTION | NOT_READY",
  "recommendationReasons": ["<reason 1>", "<reason 2>", ...],

  "juniorLevel": "ABOVE_EXPECTED | WITHIN_EXPECTED | BELOW_EXPECTED",
  "juniorLevelContext": "<Junior Frontend / Backend / Full-Stack>",

  "technicalBreakdown": {
    "codeStructure": {
      "summary": "<1-2 sentences>",
      "strengths": ["<strength 1>", ...],
      "improvements": ["<improvement 1>", ...]
    },
    "coreFundamentals": {
      "summary": "<1-2 sentences>",
      "strengths": ["<strength 1>", ...],
      "improvements": ["<improvement 1>", ...]
    },
    "problemSolving": {
      "summary": "<1-2 sentences>",
      "strengths": ["<strength 1>", ...],
      "improvements": ["<improvement 1>", ...]
    },
    "toolingPractices": {
      "summary": "<1-2 sentences>",
      "strengths": ["<strength 1>", ...],
      "improvements": ["<improvement 1>", ...]
    }
  },

  "riskFlags": ["<risk 1>", "<risk 2>", ...],

  "authenticitySignal": "HIGH | MEDIUM | LOW",
  "authenticityExplanation": "<1-2 sentences explaining signals observed>",

  "interviewQuestions": ["<question 1>", "<question 2>", ...],

  "overallScore": <0-100>,
  "scoreBand": "STRONG_JUNIOR | AVERAGE_JUNIOR | RISKY_JUNIOR",

  "conclusion": "<2-3 sentence summary answering: Should we interview this person and why?>",

  "techProficiency": {
    "<tech1>": <1-10>,
    "<tech2>": <1-10>
  },

  "mentoringNeeds": ["<need 1>", "<need 2>", ...],
  "growthPotential": "<1-2 sentences on learning trajectory>"
}

Output ONLY the JSON object. No other text.
</output_format>`.trim();
};
