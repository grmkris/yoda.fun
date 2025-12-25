export function EmptyState() {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-3xl p-8 text-center"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.14 0.04 280 / 40%), oklch(0.10 0.03 270 / 20%))",
        border: "1px dashed oklch(0.65 0.25 290 / 30%)",
        boxShadow: "inset 0 0 60px oklch(0.65 0.25 290 / 5%)",
      }}
    >
      {/* Floating crystal ball */}
      <div
        className="animate-float text-7xl"
        style={{
          filter: "drop-shadow(0 0 20px oklch(0.65 0.25 290 / 50%))",
        }}
      >
        🔮
      </div>

      <div>
        <h3
          className="mb-3 font-heading text-2xl font-bold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.65 0.25 290))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          The Stars Have Aligned
        </h3>
        <p
          className="max-w-xs text-sm leading-relaxed"
          style={{ color: "oklch(0.65 0.04 280)" }}
        >
          You've explored all current predictions.
          <br />
          <span style={{ color: "oklch(0.72 0.18 175)" }}>
            New cosmic insights arriving soon...
          </span>
        </p>
      </div>

      {/* Decorative stars */}
      <div className="mt-2 flex gap-3">
        <span
          className="animate-twinkle text-lg"
          style={{ animationDelay: "0s" }}
        >
          ✦
        </span>
        <span
          className="animate-twinkle text-sm"
          style={{
            animationDelay: "0.5s",
            color: "oklch(0.70 0.15 200)",
          }}
        >
          ✦
        </span>
        <span
          className="animate-twinkle text-lg"
          style={{ animationDelay: "1s" }}
        >
          ✦
        </span>
      </div>
    </div>
  );
}
