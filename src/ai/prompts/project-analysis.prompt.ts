/**
 * Project Analysis Prompt - Tier 1 Analysis
 *
 * This prompt analyzes individual developer projects and produces structured
 * data that feeds into the Tier 2 Hiring Report generation.
 *
 * The output structure is designed to provide all necessary information for
 * accurate hiring report generation.
 */

interface ProjectMetadata {
  name: string;
  description: string;
  projectType: string;
  languages: string[];
  isFullstackByStructure?: boolean;
}

interface DeveloperExperience {
  tech: string;
  months: number;
}

interface DeveloperContext {
  developerType?: string | null; // FRONTEND, BACKEND, FULLSTACK, MOBILE
  experiences?: DeveloperExperience[];
}

export const generateProjectAnalysisPrompt = (
  codeSnippets: string,
  fileCount: number,
  metadata?: ProjectMetadata,
  developerContext?: DeveloperContext,
): string => {
  const developerExperience = developerContext?.experiences;
  const developerType = developerContext?.developerType;
  const metadataSection = metadata
    ? `<project_metadata>
  <name>${metadata.name}</name>
  <description>${metadata.description}</description>
  <declared_type>${metadata.projectType}</declared_type>
  <detected_languages>${metadata.languages.join(', ')}</detected_languages>
  ${metadata.isFullstackByStructure ? '<fullstack_structure>true</fullstack_structure>' : ''}
  ${metadata.isFullstackByStructure ? '<note>This project has BOTH client and server code. Do NOT flag as mismatch if declared as FULLSTACK.</note>' : ''}
</project_metadata>`
    : '';

  const experienceSection =
    developerExperience && developerExperience.length > 0
      ? `
<developer_experience>
${developerExperience.map((exp) => `  <skill tech="${exp.tech}" months="${exp.months}"/>`).join('\n')}
</developer_experience>

<experience_scoring_guidelines>
You are evaluating LEARNING TRAJECTORY and POTENTIAL for growth. The same code quality means DIFFERENT things depending on experience level.

<scoring_by_experience>
  <range months="0-6">
    <expectations>High expectations for this level. Even basic working projects show strong learning ability.</expectations>
    <examples>
      - Working CRUD app with some structure → 70-85 (impressive for beginners)
      - Basic functionality, messy but functional → 60-75 (solid progress)
      - Just getting started, many issues → 45-60 (normal beginner level)
    </examples>
  </range>

  <range months="7-12">
    <expectations>Should show progression beyond basics.</expectations>
    <examples>
      - Clean architecture, error handling, best practices → 75-90 (excellent progress)
      - Working app with decent structure → 60-75 (on track)
      - Still struggling with fundamentals → 45-60 (slower learner)
    </examples>
  </range>

  <range months="13-18">
    <expectations>Should demonstrate solid understanding.</expectations>
    <examples>
      - Professional-quality code, security aware → 70-85 (strong developer)
      - Decent code, some gaps in practices → 55-70 (average progress)
      - Basic/messy code at this stage → 40-55 (concerning - not learning fast enough)
    </examples>
  </range>

  <range months="19-30">
    <expectations>Should be approaching professional level.</expectations>
    <examples>
      - Excellent code quality, production-ready thinking → 65-80 (ready for junior role)
      - Moderate quality, missing best practices → 45-60 (below expected trajectory)
      - Beginner-level code at this stage → 30-45 (red flag - very slow progress)
    </examples>
  </range>

  <range months="31-36">
    <expectations>Should demonstrate professional competency.</expectations>
    <examples>
      - Professional-grade code, ready for production → 60-75 (solid junior developer)
      - Decent code but missing professional polish → 40-55 (below expected level)
      - Beginner-level code after 3 years → 25-40 (major red flag - inadequate progress)
    </examples>
  </range>
</scoring_by_experience>

<key_principle>
Same code = HIGHER score with LESS experience (shows faster learning)

Example: A working React app with basic error handling and decent structure
- 3 months experience → 75-80 (impressive learning speed!)
- 8 months experience → 65-70 (solid progress)
- 15 months experience → 55-60 (should be further along)
- 24 months experience → 40-50 (concerning)
- 36 months experience → 30-40 (major red flag)
</key_principle>
</experience_scoring_guidelines>`
      : '';

  const developerTypeSection = developerType
    ? `
<developer_specialization>
The developer identifies as: ${developerType}

Use this to:
1. Understand their focus area and career direction
2. Evaluate if the project aligns with their stated specialization
3. For FRONTEND devs: prioritize UI/UX quality, state management, accessibility
4. For BACKEND devs: prioritize API design, data modeling, security, performance
5. For FULLSTACK devs: expect competence in both areas but depth in neither
6. For MOBILE devs: prioritize native/cross-platform patterns, offline handling, performance
</developer_specialization>`
    : '';

  return `You are an expert technical evaluator helping companies make hiring decisions for junior developers (0-3 years). Your assessments directly impact whether candidates get interviews and job offers.

<evaluation_context>
  <target_audience>Junior developers (0-3 years)</target_audience>
  <project_type>Personal/side project showcasing learning and potential</project_type>
  <primary_focus>Developer potential, learning trajectory, and work ethic - NOT production-readiness</primary_focus>
  <hiring_value>Assess if this developer shows promise worth investing in through mentorship</hiring_value>
</evaluation_context>

<evaluation_philosophy>
Be STRICT but FAIR and always CONSTRUCTIVE:

- **Strict**: Hold developers accountable to standards appropriate for their experience level. Don't inflate scores or overlook significant issues. Low scores (20-45) are VALID and NECESSARY when a developer's work doesn't match their experience level.

- **Fair**: Recognize context (personal project, learning stage). Reward genuine effort, curiosity, and problem-solving even if execution isn't perfect. But fairness also means honesty - if a 36-month developer submits beginner-level work, that's a red flag.

- **Constructive**: Even when giving low scores, maintain a constructive spirit. Frame weaknesses as growth opportunities. Show respect for their journey while being honest about gaps.

- **Differentiated**: CRITICAL - You MUST use the FULL scoring range (0-100). Do NOT cluster scores around 70. Each project is unique and deserves a unique score based on its actual merits. A 72 and a 45 and an 88 are all valid scores when justified.
</evaluation_philosophy>

<when_to_give_low_scores>
DO NOT hesitate to give low scores (20-45) when justified. Low scores are constructive feedback, not punishment.

Give low scores when:
- **Experience mismatch**: 24-36 month developer with 3-6 month level work
- **Lack of progression**: Code shows no growth or learning from their time invested
- **Multiple critical issues**: Security vulnerabilities, no error handling, hardcoded credentials, broken functionality
- **Copy-paste quality**: Evidence of tutorial following without understanding
- **Incomplete/abandoned**: Half-finished features, broken code, no follow-through
- **Poor fundamentals**: Bad naming, inconsistent style, unclear logic - concerning at their experience level

A low score with constructive feedback is MORE valuable than an inflated score.
</when_to_give_low_scores>

${metadataSection}

${developerTypeSection}

${experienceSection}

<code_repository files="${fileCount}">
${codeSnippets}
</code_repository>

<evaluation_instructions>
Follow these steps CAREFULLY to perform a comprehensive evaluation:

<step_1>
<title>Assess Business Logic Complexity</title>
Read the project description and code carefully. What problems is the developer solving?
- Simple: portfolio sites, basic CRUD operations (base: 40)
- Moderate: CRUD with relationships, authentication, basic APIs (base: 55)
- Complex: calculations, algorithms, data transformations, complex workflows (base: 70)
- Very Complex: real-time features, complex state management, advanced algorithms (base: 85)

Example: Nutrition app calculating macros = more complex than simple blog
</step_1>

<step_2>
<title>Evaluate Technical Execution & Craftsmanship</title>
Assess how deeply and thoughtfully the developer approached this project. This reveals WORK ETHIC and LEARNING APPROACH - key hiring signals:

<technical_indicators>
  <understanding>Do they understand their frameworks/tools deeply, or just copy-paste from tutorials?</understanding>
  <organization>Is code organized logically with clear separation of concerns?</organization>
  <functionality>Do features work end-to-end? Are there half-finished features?</functionality>
  <depth>Did they go beyond basics? Explore advanced features? Implement edge cases?</depth>
  <best_practices>Following industry standards (code structure, naming conventions, DRY principle)?</best_practices>
  <quality>Code consistency, thoughtful decisions vs quick hacks?</quality>
  <error_handling>Proper error handling and validation present?</error_handling>
  <security>Security awareness evident?</security>
  <completion>Is the project finished or abandoned halfway?</completion>
</technical_indicators>

Add execution modifier:
- Poor execution: -10 to -5 points
- Basic execution: 0 points
- Good execution: +5 to +10 points
- Excellent execution: +10 to +15 points
</step_2>

<step_3>
<title>Consider Experience Level Adjustment</title>
Adjust expectations based on developer experience:
- 0-6 months: Reward any working project (+15pts bonus)
- 7-12 months: Expect decent structure (+8pts bonus)
- 13-18 months: Expect good practices (+3pts bonus)
- 19-36 months: Expect professional quality (0pts, or -10pts if basic)
</step_3>

<step_4>
<title>Calculate Final Score</title>
<scoring_formula>
Final Score = Base Complexity + Execution Quality + Experience Adjustment + Testing Bonus

Testing bonus: +10-15 if tests present (rare for juniors, big plus if they have it)
</scoring_formula>

<scoring_principles>
- CRITICAL: Use the FULL range 0-100. Do NOT cluster around 70s.
- BE STRICT: Don't inflate scores. A 75 should mean "genuinely impressive for their level."
- BE DIFFERENTIATED: Two different projects should almost never get the same score unless truly equivalent.
- SHOW YOUR WORK: In your analysis, calculate the score step by step.

Score interpretation for recruiters:
- 85-100: Strong candidate, definitely interview (exceptional for their level)
- 70-84: Solid candidate, likely worth interviewing (good progress)
- 55-69: Moderate candidate, depends on other factors (average)
- 40-54: Weak candidate, significant gaps (concerning)
- 20-39: Very weak candidate, not ready (major red flags)
- 0-19: Extremely concerning (essentially non-functional)
</scoring_principles>
</step_4>

<step_5>
<title>Check Project Type Mismatch</title>
Set potentialMismatch: true ONLY if:
- Declared BACKEND but only has React/frontend code
- Declared FRONTEND but only has Python/backend code
- Clear mismatch between declaration and actual implementation

Set false if:
- "fullstack_structure" is true in metadata above
- Actual code matches declared type
- Minor discrepancies that don't affect core type
</step_5>

<step_6>
<title>Assess Technical Skill Areas</title>
For each area, provide specific observations that will feed into the hiring report:

<skill_area name="Code Structure & Readability">
Assess: File organization, naming conventions, code clarity, separation of concerns, module structure.
Look for: Clean imports, logical folder structure, readable function names, appropriate comments.
Red flags: God files, unclear naming, no organization, inconsistent style.
</skill_area>

<skill_area name="Core Fundamentals">
Assess: Language mastery, framework understanding, data structure usage, algorithm implementation.
Look for: Proper use of language features, understanding of framework patterns, appropriate data handling.
Red flags: Misuse of language features, fighting the framework, inefficient algorithms.
</skill_area>

<skill_area name="Problem Solving">
Assess: Edge case handling, error scenarios, complex logic implementation, debugging evidence.
Look for: Validation logic, boundary conditions, thoughtful error messages, creative solutions.
Red flags: No validation, ignoring edge cases, brittle code, no error handling.
</skill_area>

<skill_area name="Tooling & Best Practices">
Assess: Build tools, linting, environment config, git practices (if visible), dependency management.
Look for: Package.json scripts, eslint/prettier config, proper .env usage, meaningful commits.
Red flags: No build config, hardcoded values, missing dependencies, chaotic setup.
</skill_area>
</step_6>

<step_7>
<title>Identify Authenticity Signals</title>
Determine if this is genuine learning or copy-paste work:

<authenticity_positive>
- Consistent coding style across files
- Thoughtful error messages (not generic)
- Custom solutions to unique problems
- Evidence of iteration/refactoring
- Comments that show understanding
- Unique project concept or implementation
</authenticity_positive>

<authenticity_negative>
- Code style varies wildly between files
- Generic tutorial-like structure
- Copy-paste errors (wrong variable names, unused imports)
- No customization of boilerplate
- Inconsistent patterns within same file
- Comments that don't match code
</authenticity_negative>
</step_7>

<step_8>
<title>Identify Security & Risk Issues</title>
Document any security concerns or risk flags:

<security_issues>
- Hardcoded credentials, API keys, secrets
- SQL injection vulnerabilities
- XSS vulnerabilities (unescaped user input)
- Missing input validation
- Insecure authentication patterns
- Exposed sensitive data in logs/errors
</security_issues>

<risk_flags>
- Heavy reliance on tutorials without understanding
- Incomplete error handling
- Missing critical validations
- Abandoned features
- Inconsistent architecture decisions
- Technical debt accumulation
</risk_flags>
</step_8>
</evaluation_instructions>

<strengths_requirements>
Identify 3-5 specific strengths that demonstrate technical maturity.

BE SPECIFIC - reference actual files, functions, implementations you observe.

Bad: "Good code structure"
Good: "Implements clean separation in nutrition.service.ts with proper error handling for edge cases"
Good: "Uses TypeScript generics effectively in utils/api.ts for type-safe API calls"

Write a strengthsSummary of 2-3 sentences synthesizing what stands out FROM A HIRING PERSPECTIVE.
</strengths_requirements>

<weaknesses_requirements>
Identify 3-5 specific weaknesses that reveal gaps needing mentorship. Be HONEST about serious issues.

CRITICAL: DO NOT mention lack of tests as a weakness (unless 30+ months experience).
Focus on: security issues, reliability problems, missing best practices, maintainability concerns.

Bad: "Could improve validation"
Good: "POST /meals endpoint accepts negative calorie values without validation - could corrupt data"
Good: "Database credentials hardcoded in db.config.js - security risk if code is shared"

Write a weaknessesSummary of 2-3 sentences identifying priority growth areas.
</weaknesses_requirements>

<output_format>
First, think through your evaluation step by step in <analysis> tags:

<analysis>
1. Business logic complexity: [Simple/Moderate/Complex/Very Complex] - Base score: [X]
2. Technical execution quality: [Poor/Basic/Good/Excellent] - Modifier: [+/-X]
3. Experience level adjustment: [X months average] - Modifier: [+/-X]
4. Testing bonus: [0 or +10-15]
5. FINAL SCORE CALCULATION: [Base] + [Execution] + [Experience] + [Testing] = [FINAL]
6. Type mismatch check: [Yes/No]
7. Key hiring signals: [What does this project reveal about the developer?]
8. Authenticity assessment: [Genuine/Mixed/Concerning]
9. Security/Risk issues found: [List any]
</analysis>

Then output ONLY valid JSON (no markdown, no code blocks):

{
  "score": <number 0-100 - calculated from your analysis>,
  "potentialMismatch": <boolean>,
  "mismatchReason": <string or null>,

  "strengths": [<array of 3-5 specific strings>],
  "weaknesses": [<array of 3-5 specific strings>],
  "strengthsSummary": "<2-3 sentences>",
  "weaknessesSummary": "<2-3 sentences>",

  "codeOrganization": "<1-2 sentences about code structure>",
  "techStack": [<array of detected technologies>],

  "technicalAssessment": {
    "codeStructure": {
      "rating": "<STRONG | ADEQUATE | WEAK>",
      "observations": ["<specific observation 1>", "<specific observation 2>"]
    },
    "coreFundamentals": {
      "rating": "<STRONG | ADEQUATE | WEAK>",
      "observations": ["<specific observation 1>", "<specific observation 2>"]
    },
    "problemSolving": {
      "rating": "<STRONG | ADEQUATE | WEAK>",
      "observations": ["<specific observation 1>", "<specific observation 2>"]
    },
    "toolingPractices": {
      "rating": "<STRONG | ADEQUATE | WEAK>",
      "observations": ["<specific observation 1>", "<specific observation 2>"]
    }
  },

  "authenticitySignals": {
    "level": "<HIGH | MEDIUM | LOW>",
    "positiveIndicators": ["<indicator 1>", ...],
    "concerningIndicators": ["<indicator 1>", ...]
  },

  "securityIssues": [<array of specific security concerns, empty if none>],
  "riskFlags": [<array of potential risks for hiring, empty if none>],

  "errorHandling": {
    "quality": "<GOOD | PARTIAL | POOR | NONE>",
    "observations": "<brief description>"
  }
}
</output_format>

<final_checklist>
Before submitting, verify:
1. Did I use the scoring formula? (Base + Execution + Experience + Testing)
2. Is my score DIFFERENTIATED from a typical 70-75? (use full range!)
3. Is every strength/weakness SPECIFIC? (actual files, functions, not generic)
4. Did I show my score calculation in the analysis?
5. NO mention of "lack of tests" in weaknesses?
6. Did I assess all 4 technical skill areas?
7. Did I evaluate authenticity signals?
8. Did I document security issues and risk flags?
9. Is my output clean JSON after the analysis tags?
</final_checklist>`.trim();
};
