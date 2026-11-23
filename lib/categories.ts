// Client-safe category rules and location options.
// NEVER import 'fs' or any Node-only module in this file.

export const CATEGORIES = [
  "Engineering",
  "Data & AI",
  "Design",
  "Marketing",
  "Sales",
  "Finance",
  "HR",
  "Operations",
  "Healthcare",
  "Customer Support",
  "Other",
] as const;

export type CategoryValue = (typeof CATEGORIES)[number];

export const CATEGORY_DEFINITIONS: { name: CategoryValue; keywords: string[] }[] = [
  {
    name: "Engineering",
    keywords: [
      "engineer",
      "developer",
      "programmer",
      "software",
      "backend",
      "frontend",
      "fullstack",
      "full-stack",
      "full stack",
      "web",
      "mobile",
      "android",
      "ios",
      "flutter",
      "react",
      "node",
      "python",
      "java",
      "golang",
      "rust",
      "c++",
      "c#",
      ".net",
      "typescript",
      "javascript",
      "devops",
      "sre",
      "cloud",
      "aws",
      "azure",
      "gcp",
      "kubernetes",
      "docker",
      "microservices",
      "api",
      "database",
      "sql",
      "nosql",
      "qa",
      "quality assurance",
      "test",
      "sdet",
      "firmware",
      "embedded",
      "systems",
      "architect",
      "security",
    ],
  },
  {
    name: "Data & AI",
    keywords: [
      "data",
      "ai",
      "artificial intelligence",
      "ml",
      "machine learning",
      "deep learning",
      "nlp",
      "computer vision",
      "llm",
      "generative",
      "analytics",
      "analyst",
      "scientist",
      "etl",
      "pipeline",
      "warehouse",
      "tableau",
      "powerbi",
      "power bi",
      "spark",
      "hadoop",
      "kafka",
      "airflow",
      "dbt",
      "statistics",
      "modeling",
      "prediction",
      "recommendation",
      "tensorflow",
      "pytorch",
      "scikit",
      "agentic",
    ],
  },
  {
    name: "Design",
    keywords: [
      "design",
      "designer",
      "ui",
      "ux",
      "figma",
      "sketch",
      "adobe",
      "photoshop",
      "illustrator",
      "product designer",
      "visual",
      "graphic",
      "motion",
      "animation",
      "prototyping",
      "wireframe",
      "usability",
    ],
  },
  {
    name: "Marketing",
    keywords: [
      "marketing",
      "seo",
      "sem",
      "content",
      "social media",
      "growth",
      "campaign",
      "brand",
      "performance marketing",
      "ads",
      "advertising",
      "google ads",
      "meta ads",
      "email marketing",
      "copywriting",
      "copywriter",
      "influencer",
      "affiliate",
      "conversion",
    ],
  },
  {
    name: "Sales",
    keywords: [
      "sales",
      "business development",
      "account executive",
      "account manager",
      "bdr",
      "sdr",
      "lead generation",
      "outreach",
      "crm",
      "quota",
      "closing",
      "inside sales",
    ],
  },
  {
    name: "Finance",
    keywords: [
      "finance",
      "financial",
      "accounting",
      "accountant",
      "audit",
      "tax",
      "taxation",
      "investment",
      "banking",
      "budget",
      "forecast",
      "treasury",
      "fintech",
    ],
  },
  {
    name: "HR",
    keywords: [
      "hr",
      "human resources",
      "recruiter",
      "recruitment",
      "talent",
      "talent acquisition",
      "people ops",
      "people operations",
      "payroll",
      "benefits",
      "onboarding",
      "compensation",
      "hiring",
    ],
  },
  {
    name: "Operations",
    keywords: [
      "operations",
      "ops",
      "supply chain",
      "logistics",
      "procurement",
      "vendor",
      "project manager",
      "program manager",
      "scrum",
      "agile",
      "coordinator",
    ],
  },
  {
    name: "Healthcare",
    keywords: [
      "healthcare",
      "medical",
      "clinical",
      "pharma",
      "biotech",
      "hospital",
      "patient",
      "nurse",
      "doctor",
      "wellness",
      "pharmacy",
    ],
  },
  {
    name: "Customer Support",
    keywords: [
      "customer support",
      "customer success",
      "help desk",
      "technical support",
      "client support",
      "service desk",
      "support engineer",
      "support specialist",
      "ticket",
      "zendesk",
      "call center",
    ],
  },
];

// Auto-tag category from TITLE first (skills only as fallback)
// Prevents QA Engineer from being labelled Data & AI just because of a skill mention.
export function categorizeJob(job: { title: string; skills?: string[] }): CategoryValue {
  const title = (job.title || "").toLowerCase();

  // 1. Try matching from title first
  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.keywords.some((k) => {
      // Use word boundary check or substring
      return title.includes(k);
    })) {
      return cat.name;
    }
  }

  // 2. Fallback to skills only if title had no match
  const skillsText = (job.skills ?? []).join(" ").toLowerCase();
  if (skillsText) {
    for (const cat of CATEGORY_DEFINITIONS) {
      if (cat.keywords.some((k) => skillsText.includes(k))) {
        return cat.name;
      }
    }
  }

  return "Other";
}

export const LOCATION_OPTIONS = [
  { value: "", label: "All India" },
  { value: "delhi", label: "Delhi" },
  { value: "noida", label: "Noida" },
  { value: "gurgaon", label: "Gurgaon" },
  { value: "bengaluru", label: "Bengaluru" },
  { value: "mumbai", label: "Mumbai" },
] as const;

export type LocationValue = (typeof LOCATION_OPTIONS)[number]["value"];
