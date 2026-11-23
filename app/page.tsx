"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fitScore } from "@/lib/rank";
import { CATEGORIES, LOCATION_OPTIONS } from "@/lib/categories";
import type { Job } from "@/lib/jobs";

export default function HomePage() {
  const prefersReduced = useReducedMotion();

  // Data state
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "snapshot">("api");
  const [pipelineMeta, setPipelineMeta] = useState<{
    totalIndiaJobs: number;
    fresherJobs: number;
    afterGhost: number;
    categoryCounts: Record<string, number>;
  }>({
    totalIndiaJobs: 0,
    fresherJobs: 0,
    afterGhost: 0,
    categoryCounts: {},
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [fresherOnly, setFresherOnly] = useState<boolean>(false);
  const [remoteOnly, setRemoteOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<"newest" | "fit">("newest");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [savedJobUrls, setSavedJobUrls] = useState<Set<string>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load saved bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hirehunt_saved_urls");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedJobUrls(new Set(parsed));
        }
      }
    } catch (e) {
      console.warn("Could not read localStorage for saved jobs:", e);
    }
  }, []);

  // Save bookmarks to localStorage
  const toggleSaveJob = (url: string) => {
    setSavedJobUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      try {
        localStorage.setItem("hirehunt_saved_urls", JSON.stringify([...next]));
      } catch (e) {
        console.warn("Could not write to localStorage:", e);
      }
      return next;
    });
  };

  // Fetch jobs once on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (isMounted) {
          setAllJobs(data.jobs || []);
          setSource(data.source || "api");
          setPipelineMeta({
            totalIndiaJobs: data.totalIndiaJobs ?? (data.jobs || []).length,
            fresherJobs: data.fresherJobs ?? 0,
            afterGhost: data.afterGhost ?? (data.jobs || []).length,
            categoryCounts: data.categoryCounts || {},
          });
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        if (isMounted) {
          setError("Failed to fetch live job stream. Showing snapshot data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live category counts based on active filters
  const categoryCounts = useMemo(() => {
    // If we have pipelineMeta categoryCounts and no local filters, we can use them
    const counts: Record<string, number> = {};
    for (const job of allJobs) {
      const cat = job.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allJobs]);

  // Filter jobs based on criteria
  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      // Saved-only filter
      if (showSavedOnly && !savedJobUrls.has(job.url)) {
        return false;
      }

      // Fresher toggle
      if (fresherOnly) {
        const titleLower = (job.title || "").toLowerCase();
        const fresherWords = ["intern", "fresher", "trainee", "junior", "graduate", "entry"];
        const isFresher = fresherWords.some((w) => titleLower.includes(w));
        if (!isFresher) return false;
      }

      // Remote toggle
      if (remoteOnly) {
        if ((job.work_mode || "").toLowerCase() !== "remote") return false;
      }

      // Category filter
      if (selectedCategory !== "All") {
        if ((job.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Location filter
      if (selectedLocation) {
        const locLower = (job.location || "").toLowerCase();
        if (!locLower.includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Debounced search query (title, company, skills)
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const inTitle = (job.title || "").toLowerCase().includes(q);
        const inCompany = (job.company || "").toLowerCase().includes(q);
        const inSkills = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        if (!inTitle && !inCompany && !inSkills) {
          return false;
        }
      }

      return true;
    });
  }, [
    allJobs,
    showSavedOnly,
    savedJobUrls,
    fresherOnly,
    remoteOnly,
    selectedCategory,
    selectedLocation,
    debouncedQuery,
  ]);

  // Sort filtered jobs
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortOption === "newest") {
      list.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
    } else if (sortOption === "fit") {
      list.sort((a, b) => {
        const fitA = fitScore(a).score;
        const fitB = fitScore(b).score;
        return fitB - fitA;
      });
    }
    return list;
  }, [filteredJobs, sortOption]);

  const daysSince = (iso: string) => {
    const diffDays = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
    if (diffDays === 0) return "Posted today";
    if (diffDays === 1) return "Posted 1 day ago";
    return `Posted ${diffDays} days ago`;
  };

  const getWorkModeClass = (mode?: string) => {
    const m = (mode || "").toLowerCase();
    if (m === "remote") return "bg-[#5A3B8C]/40 text-[#8B7CC7] border border-[#5A3B8C]";
    if (m === "hybrid") return "bg-[#3A3A52] text-[#C9C2E3] border border-[#3A3A52]";
    return "bg-[#2A1E4D] text-[#C9C2E3] border border-[#3A3A52]";
  };

  return (
    <div className="relative min-h-screen bg-[#0E0B1D] text-[#FFFFFF] overflow-x-hidden flex flex-col">
      {/* Top purple ambient glow */}
      <div className="top-glow" />

      {/* Header */}
      <motion.header
        initial={prefersReduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-20 border-b border-[#3A3A52] bg-[#0E0B1D]/85 backdrop-blur-md sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A1E4D] border border-[#3A3A52] flex items-center justify-center shadow-[0_0_15px_rgba(90,59,140,0.4)]">
              <span className="text-[#8B7CC7] font-black text-xl tracking-tighter">H</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#FFFFFF]">HireHunt</span>
                {/* Live / Snapshot badge */}
                {source === "api" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2A1E4D] border border-[#5A3B8C] text-[#8B7CC7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CC7] animate-pulse" />
                    Live API
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2A1E4D] border border-[#3A3A52] text-[#C9C2E3]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9C2E3]" />
                    Snapshot
                  </span>
                )}
              </div>
              <p className="text-xs text-[#C9C2E3] hidden sm:block">
                Real jobs, straight from companies. India-first, fresher-first.
              </p>
            </div>
          </div>

          {/* Action Header Items */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.96 }}
              onClick={() => setShowSavedOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border min-h-[44px] ${
                showSavedOnly
                  ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_12px_rgba(90,59,140,0.5)]"
                  : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
              }`}
            >
              <svg
                className={`w-4 h-4 ${showSavedOnly ? "fill-[#FFFFFF] stroke-[#FFFFFF]" : "stroke-[#8B7CC7] fill-none"}`}
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>Saved ({savedJobUrls.size})</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col gap-6">
        {/* Real Live Count Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#2A1E4D]/60 border border-[#3A3A52] rounded-xl px-4 py-3 text-xs md:text-sm text-[#C9C2E3]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#FFFFFF]">
              {pipelineMeta.totalIndiaJobs} India jobs fetched
            </span>
            <span className="text-[#3A3A52]">•</span>
            <span className="text-[#8B7CC7] font-medium">
              {pipelineMeta.fresherJobs} fresher friendly
            </span>
            <span className="text-[#3A3A52]">•</span>
            <span>Ghost filter active (&lt;60d / &lt;7d seen)</span>
          </div>
          <div className="text-right text-[#C9C2E3]">
            Candidate fit benchmark:{" "}
            <span className="text-[#FFFFFF] font-medium">Naitik Kashyap (AI / Python / Video)</span>
          </div>
        </div>

        {/* Search Bar + Controls */}
        <section className="flex flex-col gap-4">
          {/* Search Input Box */}
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: isSearchFocused
                  ? "0 0 20px 2px rgba(139, 124, 199, 0.3)"
                  : "0 0 0px 0px rgba(139, 124, 199, 0)",
              }}
              transition={{ duration: 0.2 }}
              className={`flex items-center bg-[#2A1E4D] border rounded-xl overflow-hidden px-4 py-1.5 transition-colors ${
                isSearchFocused ? "border-[#8B7CC7]" : "border-[#3A3A52]"
              }`}
            >
              <svg
                className="w-5 h-5 text-[#8B7CC7] flex-shrink-0 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by job title, company, or skills (e.g. Python, AI agent, React)..."
                className="w-full bg-transparent text-[#FFFFFF] placeholder-[#C9C2E3]/60 text-sm md:text-base py-2.5 focus:outline-none min-h-[44px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-md text-[#C9C2E3] hover:text-[#FFFFFF] hover:bg-[#3A3A52] ml-2 flex-shrink-0"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>
          </div>

          {/* Quick Filter Row: Fresher Toggle, Remote Toggle, Sort, Location */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Fresher Only Toggle */}
              <motion.button
                whileTap={prefersReduced ? {} : { scale: 0.96 }}
                onClick={() => setFresherOnly((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium border transition-colors min-h-[44px] ${
                  fresherOnly
                    ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_12px_rgba(90,59,140,0.4)]"
                    : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    fresherOnly ? "border-[#FFFFFF] bg-[#8B7CC7]" : "border-[#3A3A52]"
                  }`}
                >
                  {fresherOnly && <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />}
                </span>
                <span>Fresher / Intern only ({pipelineMeta.fresherJobs})</span>
              </motion.button>

              {/* Remote Only Toggle */}
              <motion.button
                whileTap={prefersReduced ? {} : { scale: 0.96 }}
                onClick={() => setRemoteOnly((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium border transition-colors min-h-[44px] ${
                  remoteOnly
                    ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_12px_rgba(90,59,140,0.4)]"
                    : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    remoteOnly ? "border-[#FFFFFF] bg-[#8B7CC7]" : "border-[#3A3A52]"
                  }`}
                >
                  {remoteOnly && <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />}
                </span>
                <span>Remote only</span>
              </motion.button>
            </div>

            {/* Sort & Location Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort Switcher */}
              <div className="flex items-center bg-[#2A1E4D] border border-[#3A3A52] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSortOption("newest")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors min-h-[36px] ${
                    sortOption === "newest"
                      ? "bg-[#5A3B8C] text-[#FFFFFF]"
                      : "text-[#C9C2E3] hover:text-[#FFFFFF]"
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption("fit")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors min-h-[36px] ${
                    sortOption === "fit"
                      ? "bg-[#5A3B8C] text-[#FFFFFF]"
                      : "text-[#C9C2E3] hover:text-[#FFFFFF]"
                  }`}
                >
                  Highest Fit
                </button>
              </div>
            </div>
          </div>

          {/* Location Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-xs text-[#C9C2E3] font-medium mr-1.5 flex-shrink-0">
              City:
            </span>
            {LOCATION_OPTIONS.map((loc) => {
              const active = selectedLocation === loc.value;
              return (
                <motion.button
                  key={loc.value || "all"}
                  whileTap={prefersReduced ? {} : { scale: 0.96 }}
                  onClick={() => setSelectedLocation(loc.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border min-h-[36px] ${
                    active
                      ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_10px_rgba(90,59,140,0.5)]"
                      : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
                  }`}
                >
                  {loc.label}
                </motion.button>
              );
            })}
          </div>

          {/* Category Chips with Live Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
            <span className="text-xs text-[#C9C2E3] font-medium mr-1.5 flex-shrink-0">
              Role:
            </span>
            {/* All chip */}
            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.96 }}
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border min-h-[36px] ${
                selectedCategory === "All"
                  ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_10px_rgba(90,59,140,0.5)]"
                  : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
              }`}
            >
              All ({allJobs.length})
            </motion.button>

            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              if (count === 0) return null; // Hide categories with 0 count
              const active = selectedCategory.toLowerCase() === cat.toLowerCase();

              return (
                <motion.button
                  key={cat}
                  whileTap={prefersReduced ? {} : { scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border min-h-[36px] ${
                    active
                      ? "bg-[#5A3B8C] text-[#FFFFFF] border-[#8B7CC7] shadow-[0_0_10px_rgba(90,59,140,0.5)]"
                      : "bg-[#2A1E4D] text-[#C9C2E3] border-[#3A3A52] hover:border-[#8B7CC7]"
                  }`}
                >
                  {cat} ({count})
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Results Header */}
        <div className="flex items-center justify-between border-b border-[#3A3A52] pb-3 text-xs md:text-sm text-[#C9C2E3]">
          <div>
            Showing <span className="font-bold text-[#FFFFFF]">{sortedJobs.length}</span>{" "}
            {sortedJobs.length === 1 ? "job" : "jobs"}
            {selectedCategory !== "All" && (
              <span>
                {" "}in <span className="text-[#8B7CC7]">{selectedCategory}</span>
              </span>
            )}
            {selectedLocation && (
              <span>
                {" "}in <span className="text-[#8B7CC7] capitalize">{selectedLocation}</span>
              </span>
            )}
            {showSavedOnly && <span> (Saved only)</span>}
          </div>

          {(debouncedQuery || selectedLocation || selectedCategory !== "All" || fresherOnly || remoteOnly || showSavedOnly) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDebouncedQuery("");
                setSelectedLocation("");
                setSelectedCategory("All");
                setFresherOnly(false);
                setRemoteOnly(false);
                setShowSavedOnly(false);
              }}
              className="text-[#8B7CC7] hover:underline font-medium"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Job Cards Grid / Loading / Empty */}
        <section aria-label="Job listings" className="min-h-[400px]">
          {loading ? (
            /* Skeleton Loading State with Purple Shimmer */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#2A1E4D] border border-[#3A3A52] rounded-xl p-5 flex flex-col justify-between h-[230px] skeleton-shimmer"
                >
                  <div className="space-y-3">
                    <div className="h-5 w-3/4 bg-[#3A3A52] rounded" />
                    <div className="h-4 w-1/2 bg-[#3A3A52] rounded" />
                    <div className="h-3 w-1/3 bg-[#3A3A52] rounded" />
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-[#3A3A52]">
                    <div className="h-4 w-16 bg-[#3A3A52] rounded" />
                    <div className="h-8 w-24 bg-[#3A3A52] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#2A1E4D]/40 border border-[#3A3A52] rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-[#2A1E4D] border border-[#3A3A52] flex items-center justify-center mb-4 text-[#8B7CC7]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#FFFFFF] mb-1">No matching jobs found</h3>
              <p className="text-sm text-[#C9C2E3] max-w-md mb-6">
                {fresherOnly
                  ? "Fresher roles are a verified subset of live postings. Try turning off the 'Fresher only' toggle or clearing search keywords."
                  : "We couldn't find any jobs matching your exact filters. Try broadening your criteria."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedQuery("");
                  setSelectedLocation("");
                  setSelectedCategory("All");
                  setFresherOnly(false);
                  setRemoteOnly(false);
                  setShowSavedOnly(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#5A3B8C] text-[#FFFFFF] hover:bg-[#8B7CC7] transition-colors font-medium text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* Cards List with Framer Motion */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {sortedJobs.map((job, index) => {
                  const fit = fitScore(job);
                  const isSaved = savedJobUrls.has(job.url);

                  // Stagger only first 20 cards on initial render to prevent lag with 400+ jobs
                  const staggerDelay = index < 20 ? index * 0.02 : 0;

                  return (
                    <motion.article
                      key={job.url}
                      layout="position"
                      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={prefersReduced ? { duration: 0 } : { duration: 0.25, delay: staggerDelay }}
                      whileHover={
                        prefersReduced
                          ? undefined
                          : {
                              y: -4,
                              borderColor: "#8B7CC7",
                              boxShadow: "0 10px 25px -5px rgba(90, 59, 140, 0.3)",
                            }
                      }
                      className="group bg-[#2A1E4D] border border-[#3A3A52] rounded-xl p-4 md:p-5 flex flex-col justify-between transition-colors duration-200 relative overflow-hidden"
                    >
                      {/* Card Content Top */}
                      <div>
                        {/* Header: Company, Location, Save Heart */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[#8B7CC7] uppercase tracking-wider block truncate">
                              {job.company}
                            </span>
                            <h2 className="text-base font-bold text-[#FFFFFF] line-clamp-2 mt-0.5 leading-snug group-hover:text-[#FFFFFF]">
                              {job.title}
                            </h2>
                          </div>

                          {/* Save Heart Button */}
                          <motion.button
                            type="button"
                            whileTap={prefersReduced ? {} : { scale: 1.3 }}
                            onClick={() => toggleSaveJob(job.url)}
                            aria-label={isSaved ? "Remove from saved" : "Save job"}
                            className="p-1.5 rounded-lg bg-[#0E0B1D]/40 text-[#8B7CC7] hover:bg-[#3A3A52] transition-colors flex-shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${
                                isSaved ? "fill-[#5A3B8C] stroke-[#8B7CC7]" : "fill-none stroke-[#8B7CC7]"
                              }`}
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                          </motion.button>
                        </div>

                        {/* Location & Work Mode Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs text-[#C9C2E3]">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-[#8B7CC7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[140px]">{job.location || "India"}</span>
                          </span>

                          <span className="text-[#3A3A52]">•</span>

                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getWorkModeClass(job.work_mode)}`}>
                            {job.work_mode || "On-site"}
                          </span>

                          <span className="text-[#3A3A52]">•</span>

                          <span className="text-[11px] text-[#C9C2E3]/80">
                            {daysSince(job.posted_at)}
                          </span>
                        </div>

                        {/* Fit Score Badge & Reason Line */}
                        <div className="bg-[#0E0B1D]/50 border border-[#3A3A52] rounded-lg p-2.5 mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-[#C9C2E3]">Naitik Fit Score:</span>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold text-[#FFFFFF]"
                              style={{
                                background: "linear-gradient(135deg, #5A3B8C 0%, #8B7CC7 100%)",
                              }}
                            >
                              {fit.score}% Fit
                            </span>
                          </div>
                          <p className="text-[11px] text-[#C9C2E3] leading-snug truncate">
                            {fit.why}
                          </p>
                        </div>

                        {/* Skills Badges (max 4) */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {job.skills.slice(0, 4).map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#0E0B1D]/60 text-[#C9C2E3] border border-[#3A3A52]"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 4 && (
                              <span className="text-[10px] text-[#8B7CC7] self-center">
                                +{job.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Category & Apply Button */}
                      <div className="pt-3 border-t border-[#3A3A52] flex items-center justify-between gap-3 mt-auto">
                        <span className="text-[11px] font-medium text-[#8B7CC7] bg-[#5A3B8C]/20 border border-[#5A3B8C]/50 px-2 py-0.5 rounded">
                          {job.category || "Engineering"}
                        </span>

                        <motion.a
                          whileTap={prefersReduced ? {} : { scale: 0.96 }}
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold bg-[#5A3B8C] text-[#FFFFFF] hover:bg-[#8B7CC7] transition-colors shadow-[0_0_10px_rgba(90,59,140,0.3)] min-h-[40px]"
                        >
                          <span>Apply</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </motion.a>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#3A3A52] bg-[#0E0B1D] py-6 px-4 sm:px-6 mt-12 text-center text-xs text-[#C9C2E3]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Jobs from public sources · Apply on the company&apos;s own site
          </p>
          <p className="text-[#8B7CC7] font-medium">
            {pipelineMeta.totalIndiaJobs} live India jobs indexed · Built for BCA Placements
          </p>
        </div>
      </footer>
    </div>
  );
}
