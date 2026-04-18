"use client";

type Point = { month: string; value: number };

export default function MRRChart({ data }: { data: Point[] }) {
  const width = 720;
  const height = 180;
  const padding = { top: 16, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = data.length > 0 ? innerW / data.length - 4 : 0;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 176 }}
      >
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * innerH : 0;
          const x = padding.left + i * (innerW / data.length) + 2;
          const y = padding.top + (innerH - h);
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={d.value > 0 ? "var(--accent)" : "var(--border)"}
              />
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fill="var(--muted)"
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
