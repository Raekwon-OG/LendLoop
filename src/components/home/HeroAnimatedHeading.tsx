"use client";

import React, { useEffect, useRef, useState } from "react";

type AnimationPhase =
  | "word"
  | "spin-morph"
  | "logo-locked"
  | "move-to-line1"
  | "eject-line1"
  | "move-to-line2"
  | "eject-line2"
  | "logo-exit"
  | "done";

interface LineMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  centerY: number;
}

interface LayoutMeasurements {
  containerWidth: number;
  containerHeight: number;
  logoSize: number;
  line1: LineMetrics;
  line2: LineMetrics;
}

/**
 * One-time hero intro animation for the LendLoop landing page:
 * 1. Displays "LendLoop" in the hero heading size & emerald green.
 * 2. Collapses "end" and "oop" while spinning the two "L"s (one upright 360°, one inverted 540°)
 *    into the emerald rounded-square LendLoop logo.
 * 3. Moves the formed logo to the left of Line 1 and ejects "Borrow what you need." rightward.
 * 4. Moves the logo down to the left of Line 2 and ejects "Lend what you don't." rightward.
 * 5. Fades out the logo, leaving the final static two-line heading in place.
 */
export function HeroAnimatedHeading() {
  const [phase, setPhase] = useState<AnimationPhase>("word");
  const [metrics, setMetrics] = useState<LayoutMeasurements | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);

  // Measure the exact positions of the two static heading lines so the logo and marquee
  // align to the sub-pixel with the final resting text.
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !line1Ref.current || !line2Ref.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const l1Rect = line1Ref.current.getBoundingClientRect();
      const l2Rect = line2Ref.current.getBoundingClientRect();

      const line1: LineMetrics = {
        left: l1Rect.left - containerRect.left,
        top: l1Rect.top - containerRect.top,
        width: l1Rect.width,
        height: l1Rect.height,
        centerY: l1Rect.top - containerRect.top + l1Rect.height / 2,
      };

      const line2: LineMetrics = {
        left: l2Rect.left - containerRect.left,
        top: l2Rect.top - containerRect.top,
        width: l2Rect.width,
        height: l2Rect.height,
        centerY: l2Rect.top - containerRect.top + l2Rect.height / 2,
      };

      // Slightly larger than the single-line text height
      const logoSize = Math.round(Math.max(l1Rect.height, 44) * 1.08);

      setMetrics({
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        logoSize,
        line1,
        line2,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Run the one-shot animation timeline once on mount
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const immediateTimer = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(immediateTimer);
    }

    const timers: Array<ReturnType<typeof setTimeout>> = [
      // 1. Collapse "end" & "oop" and spin the two L's into the logo
      setTimeout(() => setPhase("spin-morph"), 550),
      // 2. Seamless lock into crisp vector logo while stationary at center
      setTimeout(() => setPhase("logo-locked"), 1300),
      // 3. Glide the formed logo to the left of Line 1
      setTimeout(() => setPhase("move-to-line1"), 1550),
      // 4. Eject "Borrow what you need." towards the right
      setTimeout(() => setPhase("eject-line1"), 2050),
      // 5. Glide the logo down to the left of Line 2
      setTimeout(() => setPhase("move-to-line2"), 3050),
      // 6. Eject "Lend what you don't." towards the right
      setTimeout(() => setPhase("eject-line2"), 3500),
      // 7. Dissolve logo
      setTimeout(() => setPhase("logo-exit"), 4500),
      // 8. Lock in static final state
      setTimeout(() => setPhase("done"), 4900),
    ];

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const isWordPhase = phase === "word";
  const isSpinMorphPhase = phase === "spin-morph";
  const isLogoLockedPhase = phase === "logo-locked";
  const isCenteredPhase = isWordPhase || isSpinMorphPhase || isLogoLockedPhase;

  const line1Visible =
    phase === "eject-line1" ||
    phase === "move-to-line2" ||
    phase === "eject-line2" ||
    phase === "logo-exit" ||
    phase === "done";

  const line2Visible =
    phase === "eject-line2" || phase === "logo-exit" || phase === "done";

  // Compute Logo (centerX, centerY) coordinates across phases
  const getLogoCenterPosition = () => {
    if (!metrics) {
      return { x: 0, y: 0 };
    }

    const { containerWidth, containerHeight, logoSize, line1, line2 } = metrics;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const gap = 16;

    if (isCenteredPhase) {
      return { x: centerX, y: centerY };
    }

    if (phase === "move-to-line1" || phase === "eject-line1") {
      // Place the logo's RIGHT edge at (line1.left - gap), moving it well clear of "B"
      const targetCenterX = line1.left - gap - logoSize / 2;
      return { x: targetCenterX, y: line1.centerY };
    }

    // move-to-line2, eject-line2, logo-exit, done:
    // Place the logo's RIGHT edge at (line2.left - gap)
    const targetCenterX = line2.left - gap - logoSize / 2;
    return { x: targetCenterX, y: line2.centerY };
  };

  const logoPos = getLogoCenterPosition();
  const logoSize = metrics?.logoSize ?? 64;

  // Subtle recoil pulse when ejecting text
  const isEjecting = phase === "eject-line1" || phase === "eject-line2";
  const isLogoExiting = phase === "logo-exit" || phase === "done";
  const showSpinningTextLs = isWordPhase || isSpinMorphPhase;
  const showVectorLogo = !isWordPhase && !isSpinMorphPhase;

  return (
    <div ref={containerRef} className="relative mx-auto max-w-3xl select-none">
      {/*
        1. Underlying Heading Structure (Always in normal document flow so layout height never shifts).
           Each line sits inside an overflow-hidden reveal track aligned to its exact text width,
           allowing the text to slide out from behind the logo on the left like a marquee.
      */}
      <h1
        aria-label="Borrow what you need. Lend what you don't."
        className="mx-auto max-w-3xl text-4xl leading-[1.15] font-extrabold tracking-tight text-stone-900 sm:text-6xl"
      >
        {/* Line 1: "Borrow what you need." */}
        <span className="block">
          <span
            ref={line1Ref}
            className="inline-block overflow-hidden align-bottom"
          >
            <span
              className="inline-block will-change-transform"
              style={{
                transform: line1Visible ? "translate3d(0%, 0, 0)" : "translate3d(-102%, 0, 0)",
                opacity: line1Visible ? 1 : 0,
                transition:
                  phase === "done"
                    ? "none"
                    : "transform 850ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out",
              }}
            >
              Borrow what you need.
            </span>
          </span>
        </span>

        {/* Line 2: "Lend what you don't." */}
        <span className="mt-1 block sm:mt-1.5">
          <span
            ref={line2Ref}
            className="inline-block overflow-hidden align-bottom text-emerald-800"
          >
            <span
              className="inline-block will-change-transform"
              style={{
                transform: line2Visible ? "translate3d(0%, 0, 0)" : "translate3d(-102%, 0, 0)",
                opacity: line2Visible ? 1 : 0,
                transition:
                  phase === "done"
                    ? "none"
                    : "transform 850ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out",
              }}
            >
              Lend what you don&apos;t.
            </span>
          </span>
        </span>
      </h1>

      {/*
        2. Animated Overlay Stage (Removed once phase === "done")
      */}
      {phase !== "done" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {/* Stage A: Initial "LendLoop" word with collapsing "end" and "oop" */}
          <div
            className="flex items-center justify-center text-4xl leading-[1.1] font-extrabold tracking-tight text-emerald-800 sm:text-6xl"
            style={{
              opacity: showSpinningTextLs ? 1 : 0,
              transition: "opacity 180ms ease-out",
              zIndex: 20,
            }}
          >
            {/* First "L" — spins 360° upright into the left L of the logo */}
            <span
              className="inline-block origin-center will-change-transform"
              style={{
                color: isSpinMorphPhase || isLogoLockedPhase ? "#ffffff" : "#065f46",
                transform:
                  isSpinMorphPhase || isLogoLockedPhase
                    ? "translate3d(3px, 4px, 0) rotate(360deg) scale(0.7)"
                    : "translate3d(0px, 0px, 0) rotate(0deg) scale(1)",
                transition:
                  "transform 720ms cubic-bezier(0.34, 1.56, 0.64, 1), color 380ms ease",
              }}
            >
              L
            </span>

            {/* "end" — collapses smoothly so the two L's come together */}
            <span
              className="inline-block overflow-hidden whitespace-nowrap"
              style={{
                maxWidth: isWordPhase ? "220px" : "0px",
                opacity: isWordPhase ? 1 : 0,
                transform: isWordPhase ? "scaleX(1)" : "scaleX(0)",
                transition:
                  "max-width 520ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms ease, transform 480ms ease",
              }}
            >
              end
            </span>

            {/* Second "L" — spins 540° (1.5 turns) to land inverted (180°) as the right L of the logo */}
            <span
              className="inline-block origin-center will-change-transform"
              style={{
                color: isSpinMorphPhase || isLogoLockedPhase ? "#ffffff" : "#065f46",
                transform:
                  isSpinMorphPhase || isLogoLockedPhase
                    ? "translate3d(-3px, -4px, 0) rotate(540deg) scale(0.7)"
                    : "translate3d(0px, 0px, 0) rotate(0deg) scale(1)",
                transition:
                  "transform 720ms cubic-bezier(0.34, 1.56, 0.64, 1), color 380ms ease",
              }}
            >
              L
            </span>

            {/* "oop" — collapses smoothly */}
            <span
              className="inline-block overflow-hidden whitespace-nowrap"
              style={{
                maxWidth: isWordPhase ? "240px" : "0px",
                opacity: isWordPhase ? 1 : 0,
                transform: isWordPhase ? "scaleX(1)" : "scaleX(0)",
                transition:
                  "max-width 520ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms ease, transform 480ms ease",
              }}
            >
              oop
            </span>
          </div>

          {/* Stage B: The Formed LendLoop Logo Badge */}
          {metrics && (
            <div
              className="absolute top-0 left-0 flex items-center justify-center rounded-2xl bg-[#00583d] shadow-lg will-change-transform"
              style={{
                width: `${logoSize}px`,
                height: `${logoSize}px`,
                transform: `translate3d(${logoPos.x - logoSize / 2}px, ${
                  logoPos.y - logoSize / 2
                }px, 0) scale(${
                  isWordPhase
                    ? 0.2
                    : isLogoExiting
                      ? 0
                      : isEjecting
                        ? 1.06
                        : 1
                })`,
                opacity: isWordPhase || isLogoExiting ? 0 : 1,
                transition: isCenteredPhase
                  ? "transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 350ms ease-out"
                  : "transform 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 350ms ease-in-out",
                zIndex: 15,
              }}
            >
              {/* Crisp SVG recreation of lendloop-logo.png (Upright L + Inverted L) */}
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full"
                style={{
                  opacity: showVectorLogo ? 1 : 0,
                  transition: "opacity 180ms ease-in",
                }}
              >
                {/* Left Upright L */}
                <path
                  d="M 30 31 H 38.5 V 59.5 H 51 V 68.5 H 30 Z"
                  fill="#ffffff"
                />
                {/* Right Inverted L */}
                <path
                  d="M 47 27.5 H 68 V 65 H 59.5 V 36.5 H 47 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
