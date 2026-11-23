import { NextResponse } from "next/server";
import { fetchIndiaJobsWithCounts } from "@/lib/jobs";

// Force dynamic or cache handled via fetch revalidate
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const loc = (searchParams.get("location") ?? "").trim().toLowerCase();
    const cat = (searchParams.get("category") ?? "").trim().toLowerCase();
    const fresherOnly = searchParams.get("fresher") === "true";
    const remoteOnly = searchParams.get("remote") === "true";

    // Fetch from freehire API with fallback to snapshot
    const { jobs, totalIndiaJobs, fresherJobs, afterGhost, categoryCounts, source } =
      await fetchIndiaJobsWithCounts();

    // Filter pipeline
    let result = jobs;

    if (q) {
      result = result.filter((j) => {
        const titleMatch = (j.title || "").toLowerCase().includes(q);
        const companyMatch = (j.company || "").toLowerCase().includes(q);
        const skillsMatch = (j.skills || []).some((s) => s.toLowerCase().includes(q));
        return titleMatch || companyMatch || skillsMatch;
      });
    }

    if (loc) {
      result = result.filter((j) => (j.location || "").toLowerCase().includes(loc));
    }

    if (cat && cat !== "all") {
      result = result.filter((j) => (j.category || "").toLowerCase() === cat);
    }

    if (fresherOnly) {
      const words = ["intern", "fresher", "trainee", "junior", "graduate", "entry"];
      result = result.filter((j) =>
        words.some((w) => (j.title || "").toLowerCase().includes(w))
      );
    }

    if (remoteOnly) {
      result = result.filter((j) => (j.work_mode || "").toLowerCase() === "remote");
    }

    return NextResponse.json({
      jobs: result,
      count: result.length,
      totalIndiaJobs,
      fresherJobs,
      afterGhost,
      categoryCounts,
      source,
    });
  } catch (err: any) {
    console.error("API error in /api/jobs:", err);
    return NextResponse.json(
      {
        jobs: [],
        count: 0,
        totalIndiaJobs: 0,
        fresherJobs: 0,
        afterGhost: 0,
        categoryCounts: {},
        source: "snapshot",
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
