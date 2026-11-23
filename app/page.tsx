"use client";

import React, { useEffect, useRef } from "react";

export default function EmbersFoundryPage() {
  const stageRef = useRef<HTMLElement>(null);
  const plateH1Ref = useRef<HTMLImageElement>(null);
  const plateS2Ref = useRef<HTMLImageElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const moundLRef = useRef<HTMLImageElement>(null);
  const moundRRef = useRef<HTMLImageElement>(null);
  const h1TextRef = useRef<HTMLSpanElement>(null);
  const h1BodyTextRef = useRef<HTMLSpanElement>(null);
  const videoCardRef = useRef<HTMLAnchorElement>(null);
  const playIconRef = useRef<SVGSVGElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const glyphColRef = useRef<HTMLDivElement>(null);
  const bigWordRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  const navLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const lettersRef = useRef<(HTMLElement | null)[]>([]);
  const captionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const s2TitleRef = useRef<HTMLHeadingElement>(null);
  const s2BodyRef = useRef<HTMLParagraphElement>(null);
  const s2ArrowRef = useRef<SVGSVGElement>(null);
  const s2Card1Ref = useRef<HTMLAnchorElement>(null);
  const s2Card2Ref = useRef<HTMLAnchorElement>(null);
  const s2Card3Ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const plateH1 = plateH1Ref.current;
    const plateS2 = plateS2Ref.current;
    const camCanvas = camCanvasRef.current;
    const moundL = moundLRef.current;
    const moundR = moundRRef.current;
    const h1Text = h1TextRef.current;
    const h1BodyText = h1BodyTextRef.current;
    const videoCard = videoCardRef.current;
    const playIcon = playIconRef.current;
    const menuBtn = menuBtnRef.current;
    const glyphCol = glyphColRef.current;
    const bigWord = bigWordRef.current;
    const fg = fgRef.current;

    const navLinks = navLinksRef.current;
    const letters = lettersRef.current;
    const captions = captionsRef.current;

    const s2Title = s2TitleRef.current;
    const s2Body = s2BodyRef.current;
    const s2Arrow = s2ArrowRef.current;
    const s2Card1 = s2Card1Ref.current;
    const s2Card2 = s2Card2Ref.current;
    const s2Card3 = s2Card3Ref.current;

    if (!stage || !plateH1 || !plateS2 || !camCanvas || !moundL || !moundR) return;

    const camCtx = camCanvas.getContext("2d");
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      stage.classList.add("rm");
    }

    const QOUT = "cubic-bezier(.25,1,.5,1)";
    const COUT = "cubic-bezier(.33,1,.68,1)";
    const CIN  = "cubic-bezier(.32,0,.67,0)";

    let isStateS2 = false;
    let isLocked = true;
    let activeAnimations: Animation[] = [];

    function commitAndCancelAll() {
      for (const anim of activeAnimations) {
        try {
          if (anim.commitStyles) anim.commitStyles();
          anim.cancel();
        } catch(e) {}
      }
      activeAnimations = [];
    }

    function registerAnim(anim: Animation | null | undefined) {
      if (anim) activeAnimations.push(anim);
      return anim;
    }

    // Clean Mounds Runtime
    function cleanMounds(): Promise<void> {
      return new Promise((resolve) => {
        if (!moundL || !moundR) {
          resolve();
          return;
        }
        const currentMoundL = moundL;
        const currentMoundR = moundR;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = currentMoundL.src;
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(); return; }
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            function smoothstep(min: number, max: number, value: number) {
              const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
              return x * x * (3 - 2 * x);
            }

            for (let i = 0; i < data.length; i += 4) {
              const a = data[i+3];
              if (a > 0) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const m = Math.max(r, b);
                const d = (g - m) / 255;
                if (d > 0) {
                  data[i+3] = Math.round(a * (1 - smoothstep(0.10, 0.38, d)));
                  data[i+1] = Math.min(g, Math.round(m * 0.96));
                }
              }
            }
            ctx.putImageData(imgData, 0, 0);
            canvas.toBlob((blob) => {
              if (!blob) { resolve(); return; }
              const url = URL.createObjectURL(blob);
              let loaded = 0;
              function checkDone() {
                loaded++;
                if (loaded >= 2) resolve();
              }
              currentMoundL.onload = checkDone;
              currentMoundR.onload = checkDone;
              currentMoundL.src = url;
              currentMoundR.src = url;
            }, "image/png");
          } catch (err) {
            resolve();
          }
        };
        img.onerror = () => resolve();
      });
    }

    // Video scrubbing
    let videoFallbackEl: HTMLVideoElement | null = null;
    const MP4_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261123_061238_19527355-b1cd-46dc-b72e-6eb7e0efd788.mp4";

    const cacheTimer = setTimeout(() => {
      videoFallbackEl = document.createElement("video");
      videoFallbackEl.crossOrigin = "anonymous";
      videoFallbackEl.src = MP4_URL;
      videoFallbackEl.muted = true;
      videoFallbackEl.playsInline = true;
      videoFallbackEl.preload = "auto";
      videoFallbackEl.load();
    }, 1200);

    function runCamera(forward: boolean, delay: number, duration: number) {
      setTimeout(() => {
        stage?.classList.add("cam-on");
        const startTime = performance.now();

        function step(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const easeP = 1 - Math.pow(1 - progress, 3);
          const p = forward ? easeP : (1 - easeP);

          if (videoFallbackEl && videoFallbackEl.duration && camCtx && camCanvas) {
            videoFallbackEl.currentTime = p * videoFallbackEl.duration;
            try {
              camCtx.drawImage(videoFallbackEl, 0, 0, camCanvas.width, camCanvas.height);
            } catch(e) {}
          }

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            if (forward) {
              if (plateS2) plateS2.style.opacity = "1";
            } else {
              if (plateS2) plateS2.style.opacity = "0";
              stage?.classList.remove("cam-on");
            }
          }
        }
        requestAnimationFrame(step);
      }, delay);
    }

    // Load sequence
    Promise.race([
      Promise.all([
        document.fonts.ready,
        new Promise<void>((r) => { if (plateH1.complete) r(); else plateH1.onload = () => r(); }),
        cleanMounds()
      ]),
      new Promise<void>((r) => setTimeout(r, 2500))
    ]).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(startIntro);
      });
    });

    function startIntro() {
      stage?.classList.remove("pre");
      if (isReduced) {
        isLocked = false;
        return;
      }

      if (plateH1) {
        registerAnim(plateH1.animate([
          { transform: "scale(1.3)" },
          { transform: "none" }
        ], { duration: 1350, easing: QOUT, fill: "both" }));
      }

      if (moundR) {
        registerAnim(moundR.animate([
          { transform: "translateX(45%)" },
          { transform: "none" }
        ], { duration: 1700, easing: QOUT, fill: "both" }));
      }

      if (moundL) {
        registerAnim(moundL.animate([
          { transform: "translateX(-45%)" },
          { transform: "none" }
        ], { delay: 40, duration: 1700, easing: QOUT, fill: "both" }));
      }

      [100, 200, 300, 400, 500].forEach((del, i) => {
        if (navLinks[i]) {
          registerAnim(navLinks[i]?.animate([
            { transform: "translateY(-110%)" },
            { transform: "none" }
          ], { delay: del, duration: 300, easing: COUT, fill: "both" }));
        }
      });

      if (menuBtn) {
        registerAnim(menuBtn.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], { delay: 530, duration: 200, easing: "linear", fill: "both" }));
      }

      if (h1Text) {
        registerAnim(h1Text.animate([
          { transform: "translateY(-100%)" },
          { transform: "none" }
        ], { delay: 390, duration: 950, easing: COUT, fill: "both" }));
      }

      if (h1BodyText) {
        registerAnim(h1BodyText.animate([
          { transform: "translateY(100%)" },
          { transform: "none" }
        ], { delay: 450, duration: 900, easing: COUT, fill: "both" }));
      }

      if (videoCard) {
        registerAnim(videoCard.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], { delay: 570, duration: 260, easing: "linear", fill: "both" }));
      }

      if (glyphCol) {
        registerAnim(glyphCol.animate([
          { opacity: 0, transform: "translateX(10px)" },
          { opacity: 1, transform: "none" }
        ], { delay: 600, duration: 400, easing: COUT, fill: "both" }));
      }

      const letterDelays = [0, 100, 270, 240, 200, 370];
      letters.forEach((letEl, i) => {
        if (letEl) {
          registerAnim(letEl.animate([
            { opacity: 0, transform: "translateY(0.06em)" },
            { opacity: 1, transform: "none" }
          ], { delay: 630 + letterDelays[i], duration: 450, easing: COUT, fill: "both" }));
        }
      });

      if (playIcon) {
        registerAnim(playIcon.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], { delay: 970, duration: 230, easing: "linear", fill: "both" }));
      }

      const capDelays = [730, 870, 970, 1000];
      captions.forEach((cap, i) => {
        if (cap) {
          registerAnim(cap.animate([
            { transform: "translateY(100%)" },
            { transform: "none" }
          ], { delay: capDelays[i], duration: 220, easing: COUT, fill: "both" }));
        }
      });

      setTimeout(() => {
        isLocked = false;
      }, 1450);
    }

    function getS2Keyframes(forward: boolean) {
      const frames = [];
      const num = 55;
      const H = window.innerHeight;

      for (let k = 0; k < num; k++) {
        const offset = k / (num - 1);
        const t = offset * 1.8;
        let f = 0;
        if (t < 0.47) {
          f = 1 - 1.506 * t;
        } else {
          f = 0.293 * Math.exp(-(t - 0.47) / 0.232);
        }
        if (k === num - 1) f = 0;

        const currentF = forward ? f : (1 - f);
        frames.push({
          offset: offset,
          transform: `translateY(${currentF * H}px)`,
          opacity: 1
        });
      }
      return frames;
    }

    function gotoSection2() {
      if (isLocked || isStateS2) return;
      isLocked = true;
      commitAndCancelAll();

      if (isReduced) {
        stage?.classList.add("is-s2");
        isStateS2 = true;
        isLocked = false;
        return;
      }

      if (h1Text) {
        registerAnim(h1Text.animate([
          { transform: "none" },
          { transform: "translateY(-100%)" }
        ], { delay: 0, duration: 280, easing: CIN, fill: "both" }));
      }

      if (h1BodyText) {
        registerAnim(h1BodyText.animate([
          { transform: "none" },
          { transform: "translateY(100%)" }
        ], { delay: 50, duration: 250, easing: CIN, fill: "both" }));
      }

      captions.forEach((cap, i) => {
        if (cap) {
          registerAnim(cap.animate([
            { transform: "none" },
            { transform: "translateY(100%)" }
          ], { delay: i * 20, duration: 260, easing: CIN, fill: "both" }));
        }
      });

      if (videoCard) {
        registerAnim(videoCard.animate([
          { opacity: 1 },
          { opacity: 0 }
        ], { delay: 350, duration: 130, easing: "linear", fill: "both" }));
      }

      if (fg && bigWord) {
        const fgRect = fg.getBoundingClientRect();
        const wordRect = bigWord.getBoundingClientRect();
        const D = (fgRect.bottom - wordRect.top) + 8;

        letters.forEach((letEl, i) => {
          if (letEl) {
            registerAnim(letEl.animate([
              { transform: "none" },
              { transform: `translateY(${D}px)` }
            ], { delay: i * 65, duration: 450, easing: CIN, fill: "both" }));
          }
        });
      }

      if (moundL) {
        registerAnim(moundL.animate([
          { transform: "none" },
          { transform: "translateX(-51%)" }
        ], { delay: 20, duration: 560, easing: CIN, fill: "both" }));
      }

      if (moundR) {
        registerAnim(moundR.animate([
          { transform: "none" },
          { transform: "translateX(51%)" }
        ], { delay: 150, duration: 450, easing: CIN, fill: "both" }));
      }

      const s2Frames = getS2Keyframes(true);
      const s2Lags = [
        { el: s2Title, lag: 0 },
        { el: s2Body, lag: 100 },
        { el: s2Arrow, lag: 100 },
        { el: s2Card1, lag: 0 },
        { el: s2Card2, lag: 150 },
        { el: s2Card3, lag: 300 }
      ];

      s2Lags.forEach(({ el, lag }) => {
        if (el) {
          registerAnim(el.animate(s2Frames, {
            delay: 180 + lag,
            duration: 1800,
            easing: "linear",
            fill: "both"
          }));
        }
      });

      runCamera(true, 550, 1700);

      setTimeout(() => {
        stage?.classList.add("is-s2");
        isStateS2 = true;
        isLocked = false;
      }, 2300);
    }

    function gotoHero() {
      if (isLocked || !isStateS2) return;
      isLocked = true;
      commitAndCancelAll();
      stage?.classList.remove("is-s2");

      if (isReduced) {
        isStateS2 = false;
        isLocked = false;
        return;
      }

      const s2ReverseFrames = getS2Keyframes(false);
      const s2RevLags = [
        { el: s2Title, lag: 100 },
        { el: s2Body, lag: 0 },
        { el: s2Arrow, lag: 0 },
        { el: s2Card1, lag: 300 },
        { el: s2Card2, lag: 150 },
        { el: s2Card3, lag: 0 }
      ];

      s2RevLags.forEach(({ el, lag }) => {
        if (el) {
          registerAnim(el.animate(s2ReverseFrames, {
            delay: lag,
            duration: 1800,
            easing: "linear",
            fill: "both"
          }));
        }
      });

      runCamera(false, 200, 1700);

      const BASE = 800;

      if (moundR) {
        registerAnim(moundR.animate([
          { transform: "translateX(45%)" },
          { transform: "none" }
        ], { delay: BASE + 0, duration: 1700, easing: QOUT, fill: "both" }));
      }

      if (moundL) {
        registerAnim(moundL.animate([
          { transform: "translateX(-45%)" },
          { transform: "none" }
        ], { delay: BASE + 40, duration: 1700, easing: QOUT, fill: "both" }));
      }

      if (h1Text) {
        registerAnim(h1Text.animate([
          { transform: "translateY(-100%)" },
          { transform: "none" }
        ], { delay: BASE + 390, duration: 950, easing: COUT, fill: "both" }));
      }

      if (h1BodyText) {
        registerAnim(h1BodyText.animate([
          { transform: "translateY(100%)" },
          { transform: "none" }
        ], { delay: BASE + 450, duration: 900, easing: COUT, fill: "both" }));
      }

      if (videoCard) {
        registerAnim(videoCard.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], { delay: BASE + 570, duration: 260, easing: "linear", fill: "both" }));
      }

      if (playIcon) {
        registerAnim(playIcon.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], { delay: BASE + 970, duration: 230, easing: "linear", fill: "both" }));
      }

      const letterDelays = [0, 100, 270, 240, 200, 370];
      letters.forEach((letEl, i) => {
        if (letEl) {
          registerAnim(letEl.animate([
            { opacity: 0, transform: "translateY(0.06em)" },
            { opacity: 1, transform: "none" }
          ], { delay: BASE + 630 + letterDelays[i], duration: 450, easing: COUT, fill: "both" }));
        }
      });

      const capDelays = [730, 870, 970, 1000];
      captions.forEach((cap, i) => {
        if (cap) {
          registerAnim(cap.animate([
            { transform: "translateY(100%)" },
            { transform: "none" }
          ], { delay: BASE + capDelays[i], duration: 220, easing: COUT, fill: "both" }));
        }
      });

      setTimeout(() => {
        isStateS2 = false;
        isLocked = false;
      }, 2300);
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) <= 4) return;
      if (e.deltaY > 0) {
        gotoSection2();
      } else {
        gotoHero();
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 30) {
        if (delta > 0) {
          gotoSection2();
        } else {
          gotoHero();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        gotoSection2();
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        gotoHero();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(cacheTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      commitAndCancelAll();
    };
  }, []);

  return (
    <main className="stage pre" ref={stageRef}>
      {/* 1. Hero Plate */}
      <img
        ref={plateH1Ref}
        className="plate plate-h1"
        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261123_061107_c3030a30-c49e-4b74-be3f-c8a0750c193b.png&w=1344&q=85"
        alt="Hero Plate"
        fetchPriority="high"
        decoding="async"
      />

      {/* 2. Section 2 Plate */}
      <img
        ref={plateS2Ref}
        className="plate plate-s2"
        src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261123_061140_af2262a5-c52c-472a-be3c-ccfbdf621c3a.png&w=1344&q=85"
        alt="Section 2 Plate"
        decoding="async"
      />

      {/* 3. Camera Canvas */}
      <canvas ref={camCanvasRef} className="cam" width="1280" height="720"></canvas>

      {/* 4. Shade */}
      <div className="shade"></div>

      {/* 5. Foreground Box */}
      <div className="fg" ref={fgRef}>
        <div className="word" ref={bigWordRef}>
          <span className="word-inner">
            {["E", "m", "b", "e", "r", "s"].map((char, idx) => (
              <i key={idx} ref={(el) => { lettersRef.current[idx] = el; }}>
                {char}
              </i>
            ))}
          </span>
        </div>
        <img
          ref={moundLRef}
          className="mounds mound-l"
          crossOrigin="anonymous"
          src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261123_071757_11ac0e5d-35f5-4e49-bdab-2cee6a7a2ae3.png&w=1344&q=85"
          alt="Left Mound"
        />
        <img
          ref={moundRRef}
          className="mounds mound-r"
          crossOrigin="anonymous"
          src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261123_071757_11ac0e5d-35f5-4e49-bdab-2cee6a7a2ae3.png&w=1344&q=85"
          alt="Right Mound"
        />
      </div>

      {/* 6. Nav Header */}
      <header className="nav-header">
        <a href="#" className="logo-link" aria-label="Embers Foundry home">
          <svg className="logo-svg" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="#EDE3DA" strokeWidth="1.6" />
            <circle cx="28" cy="28" r="21" stroke="#EDE3DA" strokeWidth="0.8" strokeDasharray="1.5 3" />
            <path d="M28 14 C28 14, 34 22, 34 27 C34 30.5 31.3 33 28 33 C24.7 33 22 30.5 22 27 C22 22, 28 14, 28 14 Z" fill="#EDE3DA" />
            <line x1="17" y1="41" x2="39" y2="41" stroke="#EDE3DA" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="20" y1="45" x2="36" y2="45" stroke="#EDE3DA" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </a>
        <ul className="nav-links">
          {["Forges", "Halls", "Relics", "Braziers", "Ashes"].map((link, idx) => (
            <li key={link}>
              <a href="#" ref={(el) => { navLinksRef.current[idx] = el; }}>
                {link}
              </a>
            </li>
          ))}
        </ul>
        <button ref={menuBtnRef} className="menu-btn" aria-label="Menu">
          <span></span>
          <span></span>
        </button>
      </header>

      {/* 7. Glyph Column */}
      <div className="glyph-col" ref={glyphColRef}>
        <svg viewBox="0 0 16 16"><line x1="8" y1="2" x2="8" y2="14" strokeWidth="1.2"/><line x1="4" y1="5" x2="12" y2="5" strokeWidth="1.2"/></svg>
        <svg viewBox="0 0 16 16"><polygon points="8,2 14,8 8,14 2,8" strokeWidth="1.2"/></svg>
        <svg viewBox="0 0 16 16"><line x1="8" y1="3" x2="8" y2="13" strokeWidth="1.2"/><line x1="3" y1="8" x2="13" y2="8" strokeWidth="1.2"/></svg>
        <svg viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="1" fill="#EDE3DA" stroke="none"/>
          <circle cx="8" cy="4" r="0.8" fill="#EDE3DA" stroke="none"/>
          <circle cx="8" cy="12" r="0.8" fill="#EDE3DA" stroke="none"/>
          <circle cx="4" cy="8" r="0.8" fill="#EDE3DA" stroke="none"/>
          <circle cx="12" cy="8" r="0.8" fill="#EDE3DA" stroke="none"/>
        </svg>
        <svg viewBox="0 0 16 16">
          <line x1="8" y1="2" x2="8" y2="14" strokeWidth="1"/>
          <line x1="2" y1="8" x2="14" y2="8" strokeWidth="1"/>
          <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" strokeWidth="1"/>
          <line x1="3.5" y1="12.5" x2="12.5" y2="3.5" strokeWidth="1"/>
        </svg>
        <svg viewBox="0 0 16 16"><polygon points="8,2 9.5,6.5 14,8 9.5,9.5 8,14 6.5,9.5 2,8 6.5,6.5" fill="#EDE3DA" stroke="none"/></svg>
        <svg viewBox="0 0 16 16"><polygon points="8,2 14,13 2,13" strokeWidth="1.1"/><line x1="5" y1="9.5" x2="11" y2="9.5" strokeWidth="1.1"/></svg>
      </div>

      {/* 8. Hero Section */}
      <section className="h1-section">
        <h1 className="h1-title"><span ref={h1TextRef}>Forging ancient fire into lasting wisdom.</span></h1>
        <p className="h1-body"><span ref={h1BodyTextRef}>A timeless craft, where heat and patience shape something greater than metal.</span></p>
        
        <a href="#" className="video-card" ref={videoCardRef} aria-label="Play film">
          <svg className="play-icon" viewBox="0 0 24 24" fill="none" ref={playIconRef}>
            <polygon points="7,4 19,12 7,20" stroke="#EDE3DA" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </a>

        <div className="captions">
          {[
            { num: "01", text: "Ancient techniques,\nmodern purpose." },
            { num: "02", text: "Crafted by fire,\nrefined by time." },
            { num: "03", text: "More than metal,\nenduring legacy." },
            { num: "04", text: "The forge lives\nin what we build." },
          ].map((cap, idx) => (
            <div key={cap.num} className={`caption-item c${idx + 1}`}>
              <div className="mi" ref={(el) => { captionsRef.current[idx] = el; }}>
                <span className="num">{cap.num}</span>
                <span className="desc">
                  {cap.text.split("\n").map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {line}
                      {lIdx === 0 && <br />}
                    </React.Fragment>
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Section 2 */}
      <section className="s2-section">
        <h2 className="s2-title s2-ui" ref={s2TitleRef}>
          Unveiling<br/>deep halls<br/>of the forge.
        </h2>
        <p className="s2-body s2-ui" ref={s2BodyRef}>
          Step into the heart of the foundry, where stone and fire work together. Here, ancient craftsmanship meets enduring purpose, and every corner holds a story of resilience, skill and the timeless pursuit of something lasting.
        </p>
        <svg className="s2-arrow s2-ui" ref={s2ArrowRef} viewBox="0 0 26 26" fill="none" stroke="#EDE3DA">
          <line x1="3" y1="23" x2="23" y2="3" strokeWidth="1.5" strokeLinecap="round"/>
          <polyline points="8,3 23,3 23,18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="s2-cards">
          <a href="#" className="s2-card card-1 s2-ui" ref={s2Card1Ref}>
            <div className="s2-card-img"></div>
            <span className="s2-card-label">Exploring</span>
          </a>
          <a href="#" className="s2-card card-2 s2-ui" ref={s2Card2Ref}>
            <div className="s2-card-img"></div>
            <span className="s2-card-label">Exploring</span>
          </a>
          <a href="#" className="s2-card card-3 s2-ui" ref={s2Card3Ref}>
            <div className="s2-card-img"></div>
            <span className="s2-card-label">Exploring</span>
          </a>
        </div>
      </section>
    </main>
  );
}
