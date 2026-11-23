// lib/jobs.ts — Core Job Aggregation & Filtering Logic
// Source: freehire public API (https://freehire.me/api/v1/jobs)
// Total catalogue: ~8,189,955 jobs.
// CRITICAL: API ignores location query params -> filter by countries includes 'in'.
// CRITICAL: freehire sends NO Access-Control-Allow-Origin header -> fetch server-side only.

import { categorizeJob } from "./categories";

export type Job = {
  title: string;
  company: string;
  location: string;
  url: string;
  posted_at: string;
  last_seen_at?: string;
  work_mode?: string;
  skills: string[];
  source: string;
  category: string;
};

const API = "https://freehire.me/api/v1/jobs";

// Offsets verified to return India jobs (5000+ returns 0)
export const FETCH_OFFSETS = [
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000,
];

// Fallback snapshot cache (487 real India jobs from 22 Nov 2026)
let snapshotCache: Job[] | null = null;

export async function loadSnapshot(): Promise<Job[]> {
  if (snapshotCache) return snapshotCache;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "india-jobs-snapshot.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const rawJobs = JSON.parse(data) as any[];
      snapshotCache = rawJobs.map((j) => normalise(j));
      return snapshotCache;
    }
    return [];
  } catch (err) {
    console.error("Failed to load india-jobs-snapshot.json:", err);
    return [];
  }
}

export function normalise(j: any): Job {
  const norm: Omit<Job, "category"> = {
    title: j.title || "Untitled Role",
    company: j.company || "Unknown Company",
    location: j.location || "India",
    url: j.url || "#",
    posted_at: j.posted_at || new Date().toISOString(),
    last_seen_at: j.last_seen_at,
    work_mode: j.work_mode || "On-site",
    skills: Array.isArray(j.skills) ? j.skills.slice(0, 8) : [],
    source: j.source || "company",
  };

  return {
    ...norm,
    category: j.category || categorizeJob({ title: norm.title, skills: norm.skills }),
  };
}

// Dedupe by url — same URL = same job posting
export function dedupe(jobs: Job[]): Job[] {
  const map = new Map<string, Job>();
  for (const job of jobs) {
    if (job.url && !map.has(job.url)) {
      map.set(job.url, job);
    }
  }
  return [...map.values()];
}

// Ghost-job filter: hide a job if posted_at is older than 60 days AND last_seen_at is older than 7 days
export function removeGhostJobs(jobs: Job[], now = new Date()): Job[] {
  const nowMs = now.getTime();
  return jobs.filter((j) => {
    const postedMs = new Date(j.posted_at).getTime();
    const postedDays = (nowMs - postedMs) / 86400000;

    // If posted within 60 days, keep it
    if (postedDays <= 60) return true;

    // If older than 60 days, must have been seen in last 7 days to not be a ghost job
    if (!j.last_seen_at) return false;
    const seenMs = new Date(j.last_seen_at).getTime();
    const seenDays = (nowMs - seenMs) / 86400000;
    return seenDays <= 7;
  });
}

const FRESHER_WORDS = ["intern", "fresher", "trainee", "junior", "graduate", "entry"];

export function isFresherFriendly(j: { title: string }): boolean {
  const t = (j.title || "").toLowerCase();
  return FRESHER_WORDS.some((w) => t.includes(w));
}

export function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

// Parallel fetch of 15 offsets with Promise.allSettled and 20s timeout per page
export async function fetchIndiaJobsWithCounts(pages = FETCH_OFFSETS): Promise<{
  jobs: Job[];
  totalIndiaJobs: number;
  fresherJobs: number;
  afterGhost: number;
  categoryCounts: Record<string, number>;
  source: "api" | "snapshot";
}> {
  const fetchPage = async (offset: number): Promise<Job[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${API}?limit=100&offset=${offset}`, {
        signal: controller.signal,
        headers: {
          "User-Agent": "HireHunt-BCA-Project/1.0",
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const data = await res.json();
      const pageJobs: Job[] = [];

      for (const j of data.data ?? []) {
        // Must filter in code by countries field includes 'in'
        const countries: string[] = Array.isArray(j.countries) ? j.countries : [];
        if (!countries.includes("in")) continue;

        pageJobs.push(normalise(j));
      }

      return pageJobs;
    } catch {
      clearTimeout(timeoutId);
      return [];
    }
  };

  const settled = await Promise.allSettled(pages.map(fetchPage));
  const rawIndiaJobs: Job[] = [];

  for (const res of settled) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      rawIndiaJobs.push(...res.value);
    }
  }

  let source: "api" | "snapshot" = "api";
  let mergedJobs = dedupe(rawIndiaJobs);

  // If live API returns 0 India jobs, fallback to snapshot
  if (mergedJobs.length === 0) {
    const snapshot = await loadSnapshot();
    if (snapshot.length > 0) {
      mergedJobs = dedupe(snapshot);
      source = "snapshot";
    }
  }

  const totalIndiaJobs = mergedJobs.length;

  // Apply ghost-job filter
  const activeJobs = removeGhostJobs(mergedJobs);
  const afterGhost = activeJobs.length;

  // Fresher count
  const fresherJobs = activeJobs.filter(isFresherFriendly).length;

  // Calculate live category counts
  const categoryCounts: Record<string, number> = {};
  for (const job of activeJobs) {
    const cat = job.category || "Other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return {
    jobs: activeJobs,
    totalIndiaJobs,
    fresherJobs,
    afterGhost,
    categoryCounts,
    source,
  };
}
