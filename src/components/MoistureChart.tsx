import React from 'react';
import { TelemetryPoint } from '../types/plantSystem';

interface MoistureChartProps {
  history: TelemetryPoint[];
  dryThreshold: number;
  targetThreshold: number;
}

export const MoistureChart: React.FC<MoistureChartProps> = ({
  history,
  dryThreshold,
  targetThreshold,
}) => {
  const width = 560;
  const height = 190;
  const padLeft = 36;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 26;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = history.length > 0 ? history : [];
  const count = Math.max(points.length - 1, 1);

  const yForValue = (val: number) =>
    padTop + chartH - (Math.max(0, Math.min(100, val)) / 100) * chartH;

  const linePath = points
    .map((pt, idx) => {
      const x = padLeft + (idx / count) * chartW;
      const y = yForValue(pt.moisture);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L ${(padLeft + chartW).toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${padLeft} ${(padTop + chartH).toFixed(1)} Z`
      : '';

  const dryY = yForValue(dryThreshold);
  const targetY = yForValue(targetThreshold);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            Soil Moisture &amp; Pump Cycle History
          </h2>
          <p className="text-xs text-stone-500">
            Real-time moisture percentage with pump activation bands
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
            Moisture %
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-sky-200" />
            Pump ON
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-stone-100 bg-stone-50/70 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          {/* Y-axis gridlines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = yForValue(val);
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e7e5e4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  fontSize="9.5"
                  fill="#78716c"
                  textAnchor="end"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Shaded Pump ON intervals */}
          {points.map((pt, idx) => {
            if (!pt.pumpOn || points.length < 2) return null;
            const stepW = chartW / count;
            const x = padLeft + idx * stepW - stepW / 2;
            return (
              <rect
                key={pt.tick}
                x={Math.max(padLeft, x)}
                y={padTop}
                width={Math.min(stepW, width - padRight - Math.max(padLeft, x))}
                height={chartH}
                fill="#bae6fd"
                opacity="0.45"
              />
            );
          })}

          {/* Target threshold dashed line */}
          <line
            x1={padLeft}
            y1={targetY}
            x2={width - padRight}
            y2={targetY}
            stroke="#0284c7"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={width - padRight - 2}
            y={targetY - 4}
            fontSize="9"
            fontWeight="600"
            fill="#0369a1"
            textAnchor="end"
          >
            Target Stop ({targetThreshold}%)
          </text>

          {/* Dry threshold dashed line */}
          <line
            x1={padLeft}
            y1={dryY}
            x2={width - padRight}
            y2={dryY}
            stroke="#d97706"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text
            x={width - padRight - 2}
            y={dryY - 4}
            fontSize="9"
            fontWeight="600"
            fill="#b45309"
            textAnchor="end"
          >
            Dry Trigger ({dryThreshold}%)
          </text>

          {/* Area fill & moisture curve */}
          {areaPath && <path d={areaPath} fill="#10b981" opacity="0.14" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Latest point marker */}
          {points.length > 0 && (
            <circle
              cx={padLeft + ((points.length - 1) / count) * chartW}
              cy={yForValue(points[points.length - 1].moisture)}
              r="3.8"
              fill="#059669"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          )}

          {/* X-axis start / end timestamps */}
          {points.length > 1 && (
            <>
              <text
                x={padLeft}
                y={height - 6}
                fontSize="9"
                fill="#78716c"
                textAnchor="start"
              >
                {points[0].timestamp}
              </text>
              <text
                x={width - padRight}
                y={height - 6}
                fontSize="9"
                fill="#78716c"
                textAnchor="end"
              >
                {points[points.length - 1].timestamp}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
