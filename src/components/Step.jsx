// Step.jsx
export function Step({ n, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div
        style={{
          width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 500, flexShrink: 0,
          background: done
            ? "var(--color-bg-success)"
            : active
            ? "var(--color-text-info)"
            : "var(--color-bg-tertiary)",
          color: done
            ? "var(--color-text-success)"
            : active
            ? "#fff"
            : "var(--color-text-tertiary)",
        }}
      >
        {done ? "✓" : n}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 500 : 400,
          color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Badge.jsx
const BADGE_COLORS = {
  green: { bg: "var(--color-bg-success)",  txt: "var(--color-text-success)" },
  blue:  { bg: "var(--color-bg-info)",     txt: "var(--color-text-info)" },
  amber: { bg: "var(--color-bg-warning)",  txt: "var(--color-text-warning)" },
};

export function Badge({ color = "blue", children }) {
  const { bg, txt } = BADGE_COLORS[color] || BADGE_COLORS.blue;
  return (
    <span
      style={{
        background: bg, color: txt,
        borderRadius: 20, padding: "2px 9px",
        fontSize: 11, fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}