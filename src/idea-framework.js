// src/idea-framework.js — pure, no DOM. Single source of truth for the framework.
export const SECTION_TITLES = [
  'Assignment Snapshot',
  'Inferred Learning Objectives',
  'IDEA V7 Pedagogical Profile',
  'How Students Could Use LLMs to Bypass Learning',
  'Ethical and Productive Uses of LLMs',
  'Redesign Options',
  'Recommended Redesign Level',
  'Suggested Revised Assignment Language',
  'Productive Struggle Analysis',
  'Learning Robustness Score',
  'Assignment Profile Dashboard',
];

export const IDEA_INSTRUCTIONS = `You are an expert in higher-education pedagogy and AI-robust assignment design. Using the IDEA V7 framework, analyze the assignment below to (a) reconstruct its pedagogical design, (b) identify how students could misuse AI to bypass learning, and (c) propose redesigns that preserve authentic cognitive engagement while making AI use ethical and productive.

Produce a report with EXACTLY these numbered section headings, in this order. Begin each heading on its own line, formatted as "## <number>. <Title>".

1. Assignment Snapshot — a concise paragraph describing what the assignment asks and its deliverables.
2. Inferred Learning Objectives — the skills and knowledge the assignment is really trying to build.
3. IDEA V7 Pedagogical Profile — with three clearly labeled layers:
   - Layer 1: Cognitive Demands — types of thinking; modes of reasoning; task structure; cognitive load (intrinsic / extraneous / germane); productive struggle (present vs. potentially extraneous).
   - Layer 2: Student Cognitive Engagement — visibility of student thinking; ACE analysis (judgment & decision-making, uncertainty & ambiguity, original interpretation, intellectual ownership, social/distributed reasoning); metacognitive engagement.
   - Layer 3: AI Robustness — LLM vulnerabilities (substitution risk, superficiality risk, hidden-reasoning risk, originality loss, premature closure); existing learning-robustness mechanisms.
4. How Students Could Use LLMs to Bypass Learning — concrete bypass routes specific to THIS assignment.
5. Ethical and Productive Uses of LLMs — legitimate ways students could use AI here.
6. Redesign Options — three tiers: Low-Effort, Medium-Effort, and High-Effort. For EACH tier give: Purpose; Specific Changes; New Student-Facing Requirements; ACE Improvements; Learning Robustness Mechanisms Added; Ethical/Productive LLM Use; Instructor Workload; Student Workload; Expected Robustness Gain; and Sample Assignment Language.
7. Recommended Redesign Level — name the recommended tier, with Rationale and Tradeoffs.
8. Suggested Revised Assignment Language — ready-to-paste revised assignment text.
9. Productive Struggle Analysis — compare "Original Assignment (Before)" vs. "Redesigned Assignment (After)": struggle type, hidden-reasoning risk, AI-bypass risk, and visibility.
10. Learning Robustness Score — state "Before: X/10" and "After: X/10" plus a one-line improvement summary.
11. Assignment Profile Dashboard — cognitive complexity; productive struggle; visibility (original vs. redesigned); authentic cognitive engagement (original vs. redesigned); AI vulnerability (original vs. redesigned); learning robustness (original vs. redesigned); overall learning-design rating (original → redesigned).

After the prose report, append a single fenced code block tagged idea-data containing ONLY these keys, one "key: value" per line. Levels are one of: Low, Moderate, High, Strong, Very strong. Scores are integers 0-10.

\`\`\`idea-data
robustness_before: <0-10>
robustness_after: <0-10>
ai_vulnerability_before: <level>
ai_vulnerability_after: <level>
visibility_before: <level>
visibility_after: <level>
engagement_before: <level>
engagement_after: <level>
cognitive_complexity: <level>
productive_struggle: <level>
recommended_level: <Low-Effort|Medium-Effort|High-Effort>
overall_rating_before: <level>
overall_rating_after: <level>
\`\`\``;

export function buildPrompt({ assignment, course, discipline, goals } = {}) {
  const text = (assignment || '').trim();
  if (!text) throw new Error('Assignment text is required.');

  const ctx = [];
  if (course && course.trim()) ctx.push(`Course & level: ${course.trim()}`);
  if (discipline && discipline.trim()) ctx.push(`Discipline/field: ${discipline.trim()}`);
  if (goals && goals.trim()) ctx.push(`Instructor's stated learning goals: ${goals.trim()}`);
  const ctxBlock = ctx.length
    ? `\n\nADDITIONAL CONTEXT FROM THE INSTRUCTOR:\n${ctx.join('\n')}`
    : '';

  return `${IDEA_INSTRUCTIONS}${ctxBlock}\n\n=== ASSIGNMENT TO ANALYZE (verbatim) ===\n${text}\n=== END OF ASSIGNMENT ===`;
}
