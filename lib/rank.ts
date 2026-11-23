// lib/rank.ts — Explainable Fit Ranking & v2 Gemini Prompt
// Target Candidate: Naitik Kashyap, BCA 3rd Year, Invertis University
// Target Roles: AI Automation / Agentic AI Developer, Delhi / Noida
// Skills: AI agents / automation / bots, Python, video editing, content creation, vibe coding (Antigravity / Claude)

import type { Job } from "./jobs";

export const CANDIDATE_PROFILE = {
  name: "Naitik Kashyap",
  education: "BCA 3rd year (5th Sem), Invertis University, Bareilly",
  targetRoles: ["AI Automation Developer", "Agentic AI Developer", "Python Developer"],
  targetLocations: ["Delhi", "Noida", "Gurgaon", "Remote"],
  skills: [
    { name: "AI Agents & Bots", keywords: ["agent", "agents", "agentic", "bot", "bots", "llm", "langchain", "crewai", "autogen"] },
    { name: "AI Automation", keywords: ["automation", "ai automation", "n8n", "zapier", "workflow", "make.com", "rpa"] },
    { name: "Python", keywords: ["python", "fastapi", "flask", "django", "pandas", "numpy"] },
    { name: "Vibe Coding & Web", keywords: ["antigravity", "claude", "next.js", "react", "typescript", "tailwind"] },
    { name: "Content & Video", keywords: ["video editing", "content creation", "premiere", "after effects", "media", "content"] },
  ],
};

export interface FitResult {
  score: number; // 0 - 100
  why: string;
  matchedSkills: string[];
}

/**
 * v1 Fit Scoring:
 * 100% deterministic, explainable keyword overlap.
 * Zero LLM cost, zero API latency, zero hallucination.
 * Title matches receive higher weight because they define the core role.
 */
export function fitScore(job: { title: string; skills?: string[] }): FitResult {
  const title = (job.title || "").toLowerCase();
  const skillsText = (job.skills ?? []).join(" ").toLowerCase();
  const hay = `${title} ${skillsText}`;

  const matchedSkills: string[] = [];
  let rawScore = 0;

  for (const group of CANDIDATE_PROFILE.skills) {
    const hasTitleMatch = group.keywords.some((kw) => title.includes(kw));
    const hasSkillMatch = group.keywords.some((kw) => hay.includes(kw));

    if (hasTitleMatch) {
      matchedSkills.push(group.name);
      rawScore += 25; // High weight for title match
    } else if (hasSkillMatch) {
      matchedSkills.push(group.name);
      rawScore += 15; // Moderate weight for general skill match
    }
  }

  // Bonus for fresher-friendly AI/Engineering keywords in title
  const isFresher = ["intern", "fresher", "trainee", "junior", "graduate"].some((w) => title.includes(w));
  if (isFresher && matchedSkills.length > 0) {
    rawScore += 10;
  }

  // Cap at 100
  const score = Math.min(100, Math.max(0, rawScore));

  let why = "No direct skill match — check job description";
  if (matchedSkills.length > 0) {
    why = `Matches: ${matchedSkills.join(", ")}`;
  }

  return {
    score,
    why,
    matchedSkills,
  };
}

/**
 * v2 Gemini Ranking Prompt (for optional Phase 2 LLM re-ranking)
 * 
 * Rules for Gemini:
 * 1. Never fabricate or invent CV experience.
 * 2. Only rank existing real jobs fetched from source.
 * 3. Return structured JSON with real reasons.
 */
export const GEMINI_V2_RANKING_PROMPT = `
You are an expert tech recruiter ranking fresher jobs for Naitik Kashyap.
Candidate: BCA 3rd year (5th Sem), Invertis University, Bareilly.
Core Competencies:
- AI Agents & Automation (autonomous agents, bot development, n8n/workflow automation)
- Python (backend scripting, data automation, API integration)
- Vibe Coding & Frontend (Antigravity, Claude, Next.js, React, Tailwind)
- Video Editing & Content Creation
Target: Delhi / Noida / Gurgaon / Remote, 12 LPA+ trajectory.

Task:
Rank the provided real jobs from 0 to 100 based strictly on candidate fit.
Prioritize:
1. Agentic AI, AI Automation, Bot Development, or Python Developer roles.
2. Intern / Junior / Fresher opportunities in Delhi, Noida, Gurgaon, or Remote.
3. Relevant tech stacks (Python, Next.js, AI APIs).

CRITICAL CONSTRAINTS:
- DO NOT invent, hallucinate, or alter any job details or candidate experience.
- Provide a concise 1-line reason for each score.
- Output JSON strictly in format:
  [
    { "url": "<job_url>", "score": <0-100>, "reason": "<one sentence explanation>" }
  ]
`;

export async function rankWithGemini(jobs: Job[], apiKey?: string): Promise<Job[]> {
  // If no Gemini API key provided, v1 keyword ranking remains default
  if (!apiKey) return jobs;

  // v2 implementation stub — calls Gemini 1.5/2.0 Flash to re-rank top 20 candidate jobs
  try {
    // LLM call would happen here when GEMINI_API_KEY is configured
    return jobs;
  } catch (err) {
    console.error("Gemini ranking error, falling back to v1:", err);
    return jobs;
  }
}
