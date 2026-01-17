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

export const generateProjectAnalysisPrompt = (
  codeSnippets: string,
  fileCount: number,
  metadata?: ProjectMetadata,
  developerExperience?: DeveloperExperience[],
): string => {
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
Same code quality means DIFFERENT scores based on experience level:

- 0-6 months: Working CRUD app → 70-85, Basic but functional → 60-75
- 7-12 months: Clean architecture → 75-90, Decent structure → 60-75
- 13-18 months: Professional quality → 70-85, Some gaps → 55-70
- 19-30 months: Production-ready → 65-80, Missing practices → 45-60
- 31-36 months: Professional-grade → 60-75, Below expected → 40-55

Key principle: Same code = HIGHER score with LESS experience (shows faster learning)
</experience_scoring_guidelines>`
      : '';

  return `You are an expert technical evaluator helping companies make hiring decisions for junior developers (0-3 years).

<evaluation_context>
  <target_audience>Junior developers (0-3 years)</target_audience>
  <project_type>Personal/side project showcasing learning and potential</project_type>
  <primary_focus>Developer potential, learning trajectory, and work ethic - NOT production-readiness</primary_focus>
</evaluation_context>

<evaluation_philosophy>
Be STRICT but FAIR and always CONSTRUCTIVE:
- **Strict**: Hold developers accountable to standards appropriate for their experience level
- **Fair**: Recognize context (personal project, learning stage). Reward genuine effort
- **Constructive**: Frame weaknesses as growth opportunities
- **Honest**: Low scores (20-45) are VALID when work doesn't match experience level
</evaluation_philosophy>

${metadataSection}

${experienceSection}

<code_repository files="${fileCount}">
${codeSnippets}
</code_repository>

<evaluation_instructions>
1. **Assess Business Logic Complexity**:
   - Simple: portfolio sites, basic CRUD (40 base)
   - Moderate: CRUD with relationships, auth, basic APIs (60 base)
   - Complex: calculations, algorithms, data transformations (75 base)
   - Very Complex: real-time features, complex state management (85 base)

2. **Evaluate Technical Execution**:
   - Code organization and clarity
   - Understanding of frameworks/tools (vs copy-paste from tutorials)
   - Error handling and validation
   - Security awareness
   - Completion (finished vs abandoned)

3. **Calculate Score**:
   Base + Execution quality (+0 to +15) + Experience adjustment + Testing bonus (+10-15 if present)

   Score interpretation:
   - 85-100: Definitely interview (exceptional for their level)
   - 70-84: Worth interviewing (good progress)
   - 55-69: Depends on other factors (average/below average)
   - 40-54: Significant gaps (concerning for experience level)
   - 20-39: Not ready (major red flags)

4. **Check Project Type Mismatch**:
   Only flag if declared type clearly doesn't match implementation
</evaluation_instructions>

<strengths_requirements>
Identify 3-5 specific strengths. BE SPECIFIC - reference actual files/functions/implementations.

Bad: "Good code structure"
Good: "Implements clean separation in nutrition.service.ts with proper error handling for edge cases"
</strengths_requirements>

<weaknesses_requirements>
Identify 3-5 specific weaknesses. Be HONEST about serious issues.

CRITICAL: DO NOT mention lack of tests as weakness (unless 30+ months experience).
Focus on: security issues, reliability problems, missing best practices, maintainability concerns.

Bad: "Could improve validation"
Good: "POST /meals endpoint (line 34) accepts negative calorie values without validation"
</weaknesses_requirements>

<output_format>
Think through your evaluation first, then provide JSON:

{
  "score": <0-100>,
  "potentialMismatch": <true or false>,
  "mismatchReason": <string or null>,
  "strengths": ["<specific observation 1>", "<specific observation 2>", ...],
  "weaknesses": ["<specific issue 1>", "<specific issue 2>", ...],
  "strengthsSummary": "<2-3 sentences: Why should a company consider this candidate?>",
  "weaknessesSummary": "<2-3 sentences: What gaps would need mentorship?>",
  "codeOrganization": "<1-2 sentences: Assessment of code structure and clarity>",
  "techStack": ["<detected tech 1>", "<detected tech 2>", ...]
}
</output_format>`.trim();
};
