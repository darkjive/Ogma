interface SparklineProps {
  values: number[];
  max?: number;
}

// Area sparkline; scales to the tile width.
export function Sparkline({ values, max = 100 }: SparklineProps) {
  if (values.length < 2) return <div className="h-9" />;
  const w = 100;
  const h = 32;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - (Math.min(v, max) / max) * (h - 6),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-9 text-accent">
      <path d={`${line} L${w} ${h} L0 ${h}Z`} fill="currentColor" opacity="0.14" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
