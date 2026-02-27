import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design Tokens ───────────────────────────────────────────────
const T = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceWarm: "#F5F0EB",
  surfaceDark: "#1A1714",
  text: "#1A1714",
  textMuted: "#8A8478",
  textLight: "#B8B0A4",
  accent: "#C4703E",
  accentLight: "#E8C9AD",
  accentSoft: "#F5EDE4",
  success: "#5A8A6A",
  warning: "#D4913B",
  danger: "#C45B4A",
  border: "#E8E4DE",
  borderLight: "#F0ECE6",
};

const font = `'Instrument Serif', Georgia, serif`;
const fontSans = `'DM Sans', system-ui, sans-serif`;

// ─── Mock Data ───────────────────────────────────────────────────
const mockBean = {
  name: "Hydrangea",
  roaster: "Onyx Coffee Lab",
  roastDate: "2026-02-10",
  origin: "Colombia",
  process: "Washed",
  grower: "Andrés Martinez",
  variety: "Geisha",
  elevation: "1,850 masl",
  notes: ["Blueberry", "Jasmine", "Honey"],
};

const mockLastBrew = {
  coffeeAmount: 15,
  waterAmount: 240,
  grindSetting: "5 (first click after)",
  waterTemp: 198,
  targetTimeRange: "3:00–3:30",
  steps: [
    { id: 1, name: "Bloom", waterTo: 42, time: 0, duration: 40, note: "Gentle spiral pour, let degas" },
    { id: 2, name: "First Pour", waterTo: 160, time: 40, duration: 50, note: "Steady spiral to edges" },
    { id: 3, name: "Final Pour", waterTo: 240, time: 90, duration: 30, note: "Center pour, gentle" },
    { id: 4, name: "Drawdown", waterTo: null, time: 120, duration: 90, note: "Wait for complete drain" },
  ],
};

const mockChangesFromLast = [
  "Try slightly coarser grind — bed stalled a bit at the end",
  "Start water at 200°F instead of 198°F",
];

const mockPourTemplates = [
  { name: "Standard 3-Pour V60", id: "t1" },
  { name: "Tetsu 4:6 Method", id: "t2" },
  { name: "Single Pour Bloom-and-Go", id: "t3" },
];

// ─── Utility ─────────────────────────────────────────────────────
const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const ratio = (c, w) => `1:${(w / c).toFixed(1)}`;

// ─── Styles ──────────────────────────────────────────────────────
const styles = {
  app: {
    fontFamily: fontSans,
    color: T.text,
    background: T.bg,
    minHeight: "100vh",
    maxWidth: 430,
    margin: "0 auto",
    position: "relative",
    overflow: "hidden",
  },
  // Phase indicator
  phaseBar: {
    display: "flex",
    gap: 6,
    padding: "12px 20px",
    background: T.bg,
  },
  phaseDot: (active) => ({
    flex: 1,
    height: 3,
    borderRadius: 2,
    background: active ? T.accent : T.border,
    transition: "background 0.4s ease",
  }),
};

// ─── Swipe Card Component ────────────────────────────────────────
function SwipeCards({ cards, currentIndex, onSwipe }) {
  const startX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  const handleStart = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setDragging(true);
  };
  const handleMove = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setOffset(x - startX.current);
  };
  const handleEnd = () => {
    setDragging(false);
    if (Math.abs(offset) > 60) {
      onSwipe(offset < 0 ? 1 : -1);
    }
    setOffset(0);
  };

  return (
    <div
      style={{ position: "relative", overflow: "hidden", minHeight: 200 }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
    >
      <div
        style={{
          display: "flex",
          transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          transform: `translateX(calc(${-currentIndex * 100}% + ${offset}px))`,
        }}
      >
        {cards.map((card, i) => (
          <div key={i} style={{ minWidth: "100%", padding: "0 20px", boxSizing: "border-box" }}>
            {card}
          </div>
        ))}
      </div>
      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentIndex ? T.accent : T.border,
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Phase 1: Recipe Assembly ────────────────────────────────────
function RecipeAssembly({ recipe, bean, changes, onStartBrew }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [changesAccepted, setChangesAccepted] = useState({});
  const [editing, setEditing] = useState(false);

  const handleSwipe = (dir) => {
    setCardIndex((prev) => Math.max(0, Math.min(2, prev + dir)));
  };

  const essentialsCard = (
    <div
      style={{
        background: T.surface,
        borderRadius: 16,
        padding: "24px 20px",
        border: `1px solid ${T.borderLight}`,
        boxShadow: "0 2px 12px rgba(26,23,20,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2
            style={{
              fontFamily: font,
              fontSize: 28,
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {bean.name}
          </h2>
          <p style={{ color: T.textMuted, fontSize: 14, margin: "4px 0 0" }}>{bean.roaster}</p>
        </div>
        <div
          style={{
            background: T.accentSoft,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            color: T.accent,
            fontWeight: 500,
          }}
        >
          Roasted {bean.roastDate}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        {bean.notes.map((n) => (
          <span
            key={n}
            style={{
              background: T.surfaceWarm,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              color: T.textMuted,
            }}
          >
            {n}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}
      >
        {[
          { label: "Coffee", value: `${recipe.coffeeAmount}g` },
          { label: "Water", value: `${recipe.waterAmount}g` },
          { label: "Ratio", value: ratio(recipe.coffeeAmount, recipe.waterAmount) },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              textAlign: "center",
              padding: "12px 0",
              background: T.bg,
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {item.label}
            </div>
            <div style={{ fontFamily: font, fontSize: 22, fontWeight: 400 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "Grind", value: recipe.grindSetting },
          { label: "Temp", value: `${recipe.waterTemp}°F` },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              textAlign: "center",
              padding: "12px 0",
              background: T.bg,
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {item.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: T.textMuted, textAlign: "center" }}>
        Target time: <span style={{ color: T.text, fontWeight: 500 }}>{recipe.targetTimeRange}</span>
      </div>
    </div>
  );

  const stepsCard = (
    <div
      style={{
        background: T.surface,
        borderRadius: 16,
        padding: "24px 20px",
        border: `1px solid ${T.borderLight}`,
        boxShadow: "0 2px 12px rgba(26,23,20,0.04)",
      }}
    >
      <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 400, margin: "0 0 16px", letterSpacing: "-0.01em" }}>
        Brew Steps
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recipe.steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: T.accentSoft,
                color: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{step.name}</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>
                  {fmt(step.time)} → {fmt(step.time + step.duration)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {step.waterTo && (
                  <span style={{ fontSize: 12, color: T.accent, fontWeight: 500 }}>↑ {step.waterTo}g</span>
                )}
                <span style={{ fontSize: 12, color: T.textMuted }}>{step.note}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const originCard = (
    <div
      style={{
        background: T.surface,
        borderRadius: 16,
        padding: "24px 20px",
        border: `1px solid ${T.borderLight}`,
        boxShadow: "0 2px 12px rgba(26,23,20,0.04)",
      }}
    >
      <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 400, margin: "0 0 16px", letterSpacing: "-0.01em" }}>
        Origin Details
      </h3>
      {[
        { label: "Origin", value: bean.origin },
        { label: "Grower", value: bean.grower },
        { label: "Process", value: bean.process },
        { label: "Variety", value: bean.variety },
        { label: "Elevation", value: bean.elevation },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: `1px solid ${T.borderLight}`,
            fontSize: 14,
          }}
        >
          <span style={{ color: T.textMuted }}>{item.label}</span>
          <span style={{ fontWeight: 500 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Recipe
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 400, margin: 0 }}>Prepare Your Brew</h1>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              color: T.textMuted,
              cursor: "pointer",
            }}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {/* Changes from last brew prompt */}
      {changes.length > 0 && (
        <div style={{ padding: "0 20px", marginTop: 12 }}>
          <div
            style={{
              background: "#FEF9F3",
              border: `1px solid ${T.accentLight}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>💡</span> Notes from last brew
            </div>
            {changes.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: i < changes.length - 1 ? 8 : 0,
                  opacity: changesAccepted[i] === false ? 0.4 : 1,
                  transition: "opacity 0.3s ease",
                }}
              >
                <div style={{ flex: 1, fontSize: 13, color: T.text, lineHeight: 1.4 }}>
                  {changesAccepted[i] === true && <span style={{ color: T.success }}>✓ </span>}
                  {c}
                </div>
                {changesAccepted[i] === undefined && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setChangesAccepted((p) => ({ ...p, [i]: true }))}
                      style={{
                        background: T.success,
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setChangesAccepted((p) => ({ ...p, [i]: false }))}
                      style={{
                        background: T.bg,
                        color: T.textMuted,
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swipeable Cards */}
      <div style={{ marginTop: 16 }}>
        <SwipeCards cards={[essentialsCard, stepsCard, originCard]} currentIndex={cardIndex} onSwipe={handleSwipe} />
      </div>

      {/* Pour Template Quick Select */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Pour Templates
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {mockPourTemplates.map((t) => (
            <button
              key={t.id}
              style={{
                background: t.id === "t1" ? T.accentSoft : T.surface,
                border: `1px solid ${t.id === "t1" ? T.accent : T.border}`,
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: t.id === "t1" ? T.accent : T.textMuted,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontWeight: t.id === "t1" ? 600 : 400,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Brew Button */}
      <div style={{ padding: "24px 20px", position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", background: `linear-gradient(transparent, ${T.bg} 20%)` }}>
        <button
          onClick={onStartBrew}
          style={{
            width: "100%",
            padding: "16px 0",
            background: T.surfaceDark,
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: fontSans,
            cursor: "pointer",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 20px rgba(26,23,20,0.15)",
          }}
        >
          Brew This ☕
        </button>
      </div>
    </div>
  );
}

// ─── Phase 2: Active Brew ────────────────────────────────────────
function ActiveBrew({ recipe, onFinish }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [tappedSteps, setTappedSteps] = useState({});
  const [skippedSteps, setSkippedSteps] = useState({});
  const intervalRef = useRef(null);
  const stepsContainerRef = useRef(null);
  const stepRefs = useRef({});

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Keep screen awake via wakeLock API (progressive enhancement)
  useEffect(() => {
    let wakeLock = null;
    const requestWake = async () => {
      try {
        if ("wakeLock" in navigator && running) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (e) { /* silent fail - not all browsers support */ }
    };
    requestWake();
    return () => { if (wakeLock) wakeLock.release(); };
  }, [running]);

  const steps = recipe.steps;
  const totalDuration = steps[steps.length - 1].time + steps[steps.length - 1].duration;

  // Determine current step
  let currentStepIdx = 0;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (elapsed >= steps[i].time && !skippedSteps[steps[i].id]) {
      currentStepIdx = i;
      break;
    }
  }

  // Auto-scroll to current step
  useEffect(() => {
    const currentStep = steps[currentStepIdx];
    const ref = stepRefs.current[currentStep.id];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStepIdx]);

  const handleTapStep = (step) => {
    if (!tappedSteps[step.id]) {
      setTappedSteps((p) => ({ ...p, [step.id]: elapsed }));
    }
  };

  const handleSkipStep = (step) => {
    setSkippedSteps((p) => ({ ...p, [step.id]: true }));
  };

  const progress = Math.min(elapsed / totalDuration, 1);

  return (
    <div
      style={{
        background: running ? "#FFFFFF" : T.bg,
        minHeight: "100vh",
        transition: "background 0.8s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Timer Display */}
      <div style={{ textAlign: "center", padding: "40px 20px 20px" }}>
        <div
          style={{
            fontFamily: font,
            fontSize: 72,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            color: T.text,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(elapsed)}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>
          Target: {recipe.targetTimeRange}
        </div>

        {/* Progress bar */}
        <div style={{ margin: "16px auto 0", maxWidth: 200, height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: progress > 1 ? T.danger : T.accent,
              borderRadius: 2,
              transition: "width 1s linear",
            }}
          />
        </div>
      </div>

      {/* Play/Pause */}
      {!running && elapsed === 0 && (
        <div style={{ textAlign: "center", padding: "0 20px 20px" }}>
          <button
            onClick={() => setRunning(true)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: T.surfaceDark,
              color: "#fff",
              border: "none",
              fontSize: 28,
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(26,23,20,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            ▶
          </button>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 10 }}>Tap to start brewing</div>
        </div>
      )}

      {running && (
        <div style={{ textAlign: "center", paddingBottom: 12 }}>
          <button
            onClick={() => setRunning(false)}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: "6px 20px",
              fontSize: 12,
              color: T.textMuted,
              cursor: "pointer",
            }}
          >
            Pause
          </button>
        </div>
      )}

      {!running && elapsed > 0 && (
        <div style={{ textAlign: "center", paddingBottom: 12, display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => setRunning(true)}
            style={{
              background: T.surfaceDark,
              color: "#fff",
              border: "none",
              borderRadius: 20,
              padding: "8px 24px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Resume
          </button>
        </div>
      )}

      {/* Steps Teleprompter */}
      <div
        ref={stepsContainerRef}
        style={{
          flex: 1,
          padding: "0 20px 140px",
          overflowY: "auto",
        }}
      >
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIdx && running;
          const isPast = elapsed >= step.time + step.duration || skippedSteps[step.id];
          const isFuture = !isCurrent && !isPast;
          const tappedAt = tappedSteps[step.id];
          const variance = tappedAt !== undefined ? tappedAt - step.time : null;
          const skipped = skippedSteps[step.id];

          return (
            <div
              key={step.id}
              ref={(el) => (stepRefs.current[step.id] = el)}
              onClick={() => running && !isPast && !skipped && handleTapStep(step)}
              style={{
                padding: "16px",
                marginBottom: 8,
                borderRadius: 12,
                background: skipped ? T.bg : isCurrent ? T.surfaceDark : isPast ? T.bg : T.surface,
                color: skipped ? T.textLight : isCurrent ? "#fff" : isPast ? T.textMuted : T.text,
                border: isCurrent ? "none" : `1px solid ${skipped ? T.borderLight : isFuture ? T.border : T.borderLight}`,
                opacity: skipped ? 0.4 : isFuture && running ? 0.5 : 1,
                transition: "all 0.4s ease",
                cursor: running && !isPast && !skipped ? "pointer" : "default",
                textDecoration: skipped ? "line-through" : "none",
                position: "relative",
              }}
            >
              {/* Skip button */}
              {running && !isPast && !skipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipStep(step);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "none",
                    border: "none",
                    fontSize: 16,
                    color: isCurrent ? "rgba(255,255,255,0.4)" : T.textLight,
                    cursor: "pointer",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{step.name}</span>
                  {step.waterTo && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isCurrent ? T.accentLight : T.accent,
                        background: isCurrent ? "rgba(255,255,255,0.12)" : T.accentSoft,
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      → {step.waterTo}g
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(step.time)}
                </span>
              </div>

              <div style={{ fontSize: 13, marginTop: 6, opacity: 0.8, lineHeight: 1.3 }}>{step.note}</div>

              {/* Variance indicator */}
              {variance !== null && !skipped && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: isCurrent
                      ? Math.abs(variance) <= 3 ? "#8FE0A0" : "#FFB87A"
                      : Math.abs(variance) <= 3 ? T.success : T.warning,
                  }}
                >
                  Tapped at {fmt(tappedAt)} ({variance > 0 ? "+" : ""}{variance}s)
                </div>
              )}

              {/* Tap prompt for current step */}
              {isCurrent && !tappedAt && !skipped && (
                <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  Tap when you start this step
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finish Brew Button */}
      {(running || elapsed > 0) && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 430,
            margin: "0 auto",
            padding: "16px 20px 28px",
            background: "linear-gradient(transparent, #fff 30%)",
          }}
        >
          <button
            onClick={() => {
              setRunning(false);
              onFinish({ elapsed, tappedSteps, skippedSteps });
            }}
            style={{
              width: "100%",
              padding: "16px 0",
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: fontSans,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Finish Brew
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Phase 3: Post-Brew Commit ───────────────────────────────────
function PostBrewCommit({ recipe, brewData, onCommit }) {
  const [retroNotes, setRetroNotes] = useState("");
  const [nextBrewChanges, setNextBrewChanges] = useState("");
  const [committed, setCommitted] = useState(false);

  const steps = recipe.steps;

  if (committed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: T.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            marginBottom: 20,
          }}
        >
          ✓
        </div>
        <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 400, margin: "0 0 8px" }}>Brew Committed</h2>
        <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.5, maxWidth: 260 }}>
          Your brew report is saved. You can edit it anytime from your brew history.
        </p>
        <button
          onClick={onCommit}
          style={{
            marginTop: 24,
            background: T.surfaceDark,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to Start
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 120px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Brew Complete
        </div>
        <h1 style={{ fontFamily: font, fontSize: 28, fontWeight: 400, margin: 0 }}>Brew Report</h1>
        <div
          style={{
            fontFamily: font,
            fontSize: 48,
            color: T.accent,
            marginTop: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt(brewData.elapsed)}
        </div>
        <div style={{ fontSize: 13, color: T.textMuted }}>Target: {recipe.targetTimeRange}</div>
      </div>

      {/* Step Results */}
      <div
        style={{
          background: T.surface,
          borderRadius: 16,
          border: `1px solid ${T.borderLight}`,
          padding: "20px",
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 400, margin: "0 0 14px" }}>Step Timing</h3>
        {steps.map((step) => {
          const tappedAt = brewData.tappedSteps[step.id];
          const skipped = brewData.skippedSteps[step.id];
          const variance = tappedAt !== undefined ? tappedAt - step.time : null;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${T.borderLight}`,
                opacity: skipped ? 0.4 : 1,
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: 14, textDecoration: skipped ? "line-through" : "none" }}>
                  {step.name}
                </span>
                {skipped && <span style={{ fontSize: 11, color: T.danger, marginLeft: 8 }}>Skipped</span>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                  {skipped ? "—" : tappedAt !== undefined ? fmt(tappedAt) : fmt(step.time)}
                </div>
                {variance !== null && !skipped && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: Math.abs(variance) <= 3 ? T.success : T.warning,
                    }}
                  >
                    {variance > 0 ? "+" : ""}{variance}s
                  </div>
                )}
                {!skipped && tappedAt === undefined && (
                  <div style={{ fontSize: 11, color: T.textLight }}>as planned</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Retro Notes */}
      <div
        style={{
          background: T.surface,
          borderRadius: 16,
          border: `1px solid ${T.borderLight}`,
          padding: "20px",
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 400, margin: "0 0 4px" }}>Brew Notes</h3>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 10px" }}>
          What happened during this brew? Observations, anomalies, things that went well.
        </p>
        <textarea
          value={retroNotes}
          onChange={(e) => setRetroNotes(e.target.value)}
          placeholder="Bed looked uneven after bloom, water temp dropped fast..."
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: T.bg,
            fontSize: 14,
            fontFamily: fontSans,
            color: T.text,
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Changes for Next Brew */}
      <div
        style={{
          background: "#FEF9F3",
          borderRadius: 16,
          border: `1px solid ${T.accentLight}`,
          padding: "20px",
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 400, margin: "0 0 4px", color: T.accent }}>
          Changes for Next Brew
        </h3>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 10px" }}>
          These notes will appear as suggestions next time you brew this bean.
        </p>
        <textarea
          value={nextBrewChanges}
          onChange={(e) => setNextBrewChanges(e.target.value)}
          placeholder="Try coarser grind, extend bloom to 45s..."
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${T.accentLight}`,
            background: "#fff",
            fontSize: 14,
            fontFamily: fontSans,
            color: T.text,
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Tasting Notes Placeholder */}
      <div
        style={{
          background: T.surface,
          borderRadius: 16,
          border: `1px dashed ${T.border}`,
          padding: "20px",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>👅</div>
        <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 400, margin: "0 0 4px" }}>Tasting Notes</h3>
        <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Coming soon — taste as the cup cools and log your experience</p>
      </div>

      {/* Commit Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 430,
          margin: "0 auto",
          padding: "16px 20px 28px",
          background: `linear-gradient(transparent, ${T.bg} 30%)`,
        }}
      >
        <button
          onClick={() => setCommitted(true)}
          style={{
            width: "100%",
            padding: "16px 0",
            background: T.surfaceDark,
            color: "#fff",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: fontSans,
            cursor: "pointer",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 20px rgba(26,23,20,0.15)",
          }}
        >
          Commit Brew
        </button>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function BrewScreen() {
  const [phase, setPhase] = useState(0); // 0=recipe, 1=brew, 2=post
  const [brewData, setBrewData] = useState(null);

  const handleStartBrew = () => setPhase(1);
  const handleFinishBrew = (data) => {
    setBrewData(data);
    setPhase(2);
  };
  const handleCommit = () => {
    setPhase(0);
    setBrewData(null);
  };

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${T.bg}; }
        textarea:focus { border-color: ${T.accent} !important; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={styles.app}>
        {/* Phase Indicator */}
        <div style={styles.phaseBar}>
          <div style={styles.phaseDot(phase >= 0)} />
          <div style={styles.phaseDot(phase >= 1)} />
          <div style={styles.phaseDot(phase >= 2)} />
        </div>

        {/* Render Phase */}
        {phase === 0 && (
          <RecipeAssembly
            recipe={mockLastBrew}
            bean={mockBean}
            changes={mockChangesFromLast}
            onStartBrew={handleStartBrew}
          />
        )}
        {phase === 1 && <ActiveBrew recipe={mockLastBrew} onFinish={handleFinishBrew} />}
        {phase === 2 && <PostBrewCommit recipe={mockLastBrew} brewData={brewData} onCommit={handleCommit} />}
      </div>
    </>
  );
}
