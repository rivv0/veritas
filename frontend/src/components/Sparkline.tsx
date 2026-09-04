'use client';

interface Props {
  data?: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ data = [], isPositive, width = 110, height = 32 }: Props) {
  if (!data || data.length < 2) {
    return (
      <div 
        style={{ width, height }} 
        className="flex items-center justify-center text-[10px] text-gray-600 font-mono"
      >
        —
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 3;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Compute SVG points
  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * drawWidth;
    const y = padding + drawHeight - ((val - min) / range) * drawHeight;
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Fill area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest price endpoint dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
