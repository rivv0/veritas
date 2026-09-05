import React, { useId, useMemo } from 'react';

interface Props {
  data?: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ data = [], isPositive, width = 110, height = 32 }: Props) {
  const gradientId = useId();

  const chart = useMemo(() => {
    if (!data || data.length === 0) return null;

    // If only 1 point, expand to 2 points for a steady line
    const pointsData = data.length === 1 ? [data[0], data[0]] : data;

    const min = Math.min(...pointsData);
    const max = Math.max(...pointsData);
    const range = max - min;
    const isFlat = range === 0 || !isFinite(range);

    const paddingY = 4;
    const paddingX = 2;
    const drawWidth = width - paddingX * 2;
    const drawHeight = height - paddingY * 2;

    // Compute coordinate points
    const points = pointsData.map((val, idx) => {
      const x = paddingX + (idx / (pointsData.length - 1)) * drawWidth;
      const y = isFlat
        ? height / 2
        : paddingY + drawHeight - ((val - min) / range) * drawHeight;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val };
    });

    // Build smooth SVG curve path using bezier control points
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    const lastPt = points[points.length - 1];
    const areaD = `${pathD} L ${lastPt.x},${height} L ${points[0].x},${height} Z`;

    return { pathD, areaD, lastPt, isFlat };
  }, [data, width, height]);

  if (!chart) {
    return (
      <div 
        style={{ width, height }} 
        className="flex items-center justify-center text-[10px] text-zinc-600 font-mono"
      >
        —
      </div>
    );
  }

  const strokeColor = isPositive ? '#34d399' : '#f87171';

  return (
    <svg width={width} height={height} className="overflow-visible select-none shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Gradient Fill Under Curve */}
      <path d={chart.areaD} fill={`url(#${gradientId})`} />

      {/* Intraday Line Trace */}
      <path
        d={chart.pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Real-time endpoint beacon */}
      <circle
        cx={chart.lastPt.x}
        cy={chart.lastPt.y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
