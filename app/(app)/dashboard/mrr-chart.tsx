"use client";

type Point = { month: string; value: number };

function formatShort(v: number): string {
  if (v <= 0) return "";
  if (v >= 1000) {
    const n = v / 1000;
    return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}k`;
  }
  return `$${Math.round(v)}`;
}

export default function MRRChart({ data }: { data: Point[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 28, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const colW = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.max(0, colW - 4);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 196 }}
      >
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * innerH : 0;
          const x = padding.left + i * colW + 2;
          const y = padding.top + (innerH - h);
          const cx = x + barW / 2;
          return (
            <g key={d.month}>
              {d.value > 0 && (
                <text
                  x={cx}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--muted)"
                  style={{
                    fontSize: "var(--fs-11)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {formatShort(d.value)}
                </text>
              )}
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={d.value > 0 ? "var(--accent)" : "var(--border)"}
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fill="var(--muted)"
                style={{
                  fontSize: "var(--fs-10)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {d.month.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
