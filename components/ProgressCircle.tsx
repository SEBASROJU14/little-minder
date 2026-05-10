"use client";

interface Props {
  progress: number; // 0 | 25 | 50 | 75 | 100
  onProgress?: (next: number) => void;
  size?: number;
  readonly?: boolean;
}

const STEPS = [0, 25, 50, 75, 100];

export default function ProgressCircle({ progress, onProgress, size = 48, readonly = false }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const fill = (progress / 100) * circ;
  const done = progress === 100;

  const handleTap = () => {
    if (readonly || !onProgress) return;
    const idx = STEPS.indexOf(progress);
    const next = STEPS[(idx + 1) % STEPS.length];
    onProgress(next);
  };

  return (
    <button
      onClick={handleTap}
      disabled={readonly}
      aria-label={`progress ${progress}%. ${readonly ? "" : "tap to change"}`}
      className="shrink-0 active:scale-90 transition-transform duration-100 disabled:cursor-default"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#DDD0B8" strokeWidth="3.5" />

        {/* Progress arc */}
        {progress > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={done ? "#4A5240" : "#7D2E3A"}
            strokeWidth="3.5"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.3s ease" }}
          />
        )}

        {/* Center content */}
        {done ? (
          // Checkmark
          <polyline
            points={`${size * 0.3},${size * 0.52} ${size * 0.46},${size * 0.66} ${size * 0.7},${size * 0.37}`}
            fill="none"
            stroke="#4A5240"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : progress === 0 ? (
          // Empty dot
          <circle cx={cx} cy={cy} r={r * 0.25} fill="#7D2E3A" />
        ) : (
          // Percentage text
          <text
            x={cx} y={cy + size * 0.11}
            textAnchor="middle"
            fontSize={size * 0.22}
            fontFamily="var(--font-sans)"
            fill="#7A6A52"
          >
            {progress}%
          </text>
        )}
      </svg>
    </button>
  );
}
