import React from 'react';
import { Droplets, Cpu, Zap, Waves } from 'lucide-react';
import { SoilStatus } from '../types/plantSystem';

interface CircuitSchematicProps {
  moisture: number;
  rawAdc: number;
  pumpOn: boolean;
  soilStatus: SoilStatus;
  reservoirLevel: number;
  activeLowRelay: boolean;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  moisture,
  rawAdc,
  pumpOn,
  soilStatus,
  reservoirLevel,
  activeLowRelay,
}) => {
  const pinD7State = pumpOn
    ? activeLowRelay
      ? 'LOW (0V)'
      : 'HIGH (5V)'
    : activeLowRelay
      ? 'HIGH (5V)'
      : 'LOW (0V)';

  const soilColor =
    soilStatus === 'dry'
      ? '#b48a60'
      : soilStatus === 'optimal'
        ? '#6b4c35'
        : '#3e2723';

  const leafColor =
    soilStatus === 'dry'
      ? '#84a955'
      : soilStatus === 'optimal'
        ? '#2e9e5b'
        : '#15803d';

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            Hardware Loop &amp; Circuit Schematic
          </h2>
          <p className="text-xs text-stone-500">
            Live simulation of Arduino Uno, A0 soil probe, D7 relay, and water pump
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
            pumpOn
              ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
              : 'bg-stone-100 text-stone-600 ring-1 ring-stone-200'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              pumpOn ? 'animate-pulse bg-sky-500' : 'bg-stone-400'
            }`}
          />
          {pumpOn ? 'Pump Flowing' : 'System Idle'}
        </span>
      </div>

      {/* Interactive SVG Circuit + Plant Diagram */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-3">
        <svg
          viewBox="0 0 720 330"
          className="h-auto w-full select-none"
          role="img"
          aria-label="Arduino smart plant watering schematic"
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#e7e5e4"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="720" height="330" fill="url(#grid)" rx="8" />

          {/* Wire: Sensor -> Arduino A0 */}
          <path
            d="M 188 188 L 235 188 L 235 108 L 270 108"
            fill="none"
            stroke="#d97706"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="228"
            y="100"
            fontSize="10"
            fontWeight="600"
            fill="#b45309"
            textAnchor="middle"
          >
            Analog A0
          </text>

          {/* Wire: Arduino D7 -> Relay */}
          <path
            d="M 415 108 L 478 108"
            fill="none"
            stroke={pumpOn ? '#0284c7' : '#78716c'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text
            x="446"
            y="99"
            fontSize="10"
            fontWeight="600"
            fill={pumpOn ? '#0369a1' : '#57534e'}
            textAnchor="middle"
          >
            Pin D7
          </text>

          {/* Wire: Relay -> Water Pump */}
          <path
            d="M 555 152 L 555 198"
            fill="none"
            stroke={pumpOn ? '#0ea5e9' : '#a8a29e'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text
            x="592"
            y="180"
            fontSize="10"
            fontWeight="600"
            fill={pumpOn ? '#0284c7' : '#78716c'}
          >
            5V Power
          </text>

          {/* Water Hose: Pump -> Plant Pot */}
          <path
            d="M 495 246 L 440 246 L 440 162 L 152 162 L 152 192"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pumpOn && (
            <path
              d="M 495 246 L 440 246 L 440 162 L 152 162 L 152 192"
              fill="none"
              stroke="#0284c7"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-water-flow"
            />
          )}

          {/* Water droplets falling onto soil when pumpOn */}
          {pumpOn && (
            <g fill="#0284c7">
              <circle cx="152" cy="198" r="3">
                <animate
                  attributeName="cy"
                  values="192;214"
                  dur="0.55s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="1;0"
                  dur="0.55s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="145" cy="202" r="2.5">
                <animate
                  attributeName="cy"
                  values="194;214"
                  dur="0.7s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="1;0"
                  dur="0.7s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {/* Plant & Pot (Left) */}
          <g transform="translate(36, 95)">
            {/* Stem & Leaves */}
            <path
              d="M 85 115 Q 85 75 85 52"
              fill="none"
              stroke="#15803d"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d={
                soilStatus === 'dry'
                  ? 'M 85 88 Q 55 82 48 100 Q 68 104 85 92'
                  : 'M 85 88 Q 52 65 44 82 Q 66 92 85 92'
              }
              fill={leafColor}
            />
            <path
              d={
                soilStatus === 'dry'
                  ? 'M 85 74 Q 116 68 124 88 Q 102 92 85 78'
                  : 'M 85 74 Q 118 52 126 70 Q 104 80 85 78'
              }
              fill={leafColor}
            />
            <path
              d={
                soilStatus === 'dry'
                  ? 'M 85 56 Q 74 36 88 28 Q 98 42 85 58'
                  : 'M 85 56 Q 70 28 86 20 Q 102 36 85 58'
              }
              fill={leafColor}
            />

            {/* Pot Rim & Body */}
            <polygon
              points="34,118 136,118 122,202 48,202"
              fill="#c26d4a"
              stroke="#9a4e32"
              strokeWidth="2"
            />
            <rect
              x="28"
              y="108"
              width="114"
              height="14"
              rx="4"
              fill="#d97f59"
              stroke="#9a4e32"
              strokeWidth="2"
            />
            {/* Soil inside pot */}
            <ellipse cx="85" cy="116" rx="46" ry="5" fill={soilColor} />

            {/* Soil Moisture Probe inserted into soil */}
            <rect
              x="128"
              y="84"
              width="16"
              height="36"
              rx="2"
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            <rect x="131" y="120" width="3" height="28" fill="#eab308" />
            <rect x="138" y="120" width="3" height="28" fill="#eab308" />
            <circle cx="136" cy="92" r="2.5" fill="#22c55e" />

            <text
              x="85"
              y="222"
              fontSize="11"
              fontWeight="600"
              fill="#44403c"
              textAnchor="middle"
            >
              Plant &amp; Moisture Probe
            </text>
          </g>

          {/* Arduino Uno Board (Top Center) */}
          <g transform="translate(270, 42)">
            <rect
              width="145"
              height="104"
              rx="8"
              fill="#0f766e"
              stroke="#115e59"
              strokeWidth="2"
            />
            <rect x="-6" y="18" width="14" height="22" rx="2" fill="#cbd5e1" />
            <rect x="12" y="14" width="12" height="12" rx="2" fill="#334155" />
            <rect x="44" y="42" width="66" height="22" rx="2" fill="#1e293b" />
            <text
              x="77"
              y="56"
              fontSize="8.5"
              fontFamily="monospace"
              fill="#e2e8f0"
              textAnchor="middle"
            >
              ATmega328P
            </text>
            <text
              x="72"
              y="24"
              fontSize="11"
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
            >
              ARDUINO UNO
            </text>
            {/* Pin indicators */}
            <rect x="4" y="60" width="28" height="14" rx="2" fill="#134e4a" />
            <text x="18" y="70" fontSize="8.5" fill="#fde68a" textAnchor="middle">
              A0:{rawAdc}
            </text>
            <rect x="108" y="60" width="32" height="14" rx="2" fill="#134e4a" />
            <text
              x="124"
              y="70"
              fontSize="8.5"
              fill={pumpOn ? '#7dd3fc' : '#cbd5e1'}
              textAnchor="middle"
            >
              D7:{pumpOn ? 'ON' : 'OFF'}
            </text>
            {/* TX/PWR LEDs */}
            <circle cx="126" cy="24" r="3" fill="#22c55e" />
            <circle
              cx="114"
              cy="24"
              r="3"
              fill={pumpOn ? '#f59e0b' : '#475569'}
            />
          </g>

          {/* 5V Relay Module (Top Right) */}
          <g transform="translate(478, 56)">
            <rect
              width="154"
              height="96"
              rx="8"
              fill="#1e3a8a"
              stroke="#1e40af"
              strokeWidth="2"
            />
            <rect
              x="68"
              y="22"
              width="68"
              height="52"
              rx="4"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1.5"
            />
            <text
              x="102"
              y="45"
              fontSize="9"
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
            >
              5V RELAY
            </text>
            <text
              x="102"
              y="59"
              fontSize="8.5"
              fill="#e0f2fe"
              textAnchor="middle"
            >
              {pumpOn ? 'CLOSED (ON)' : 'OPEN (OFF)'}
            </text>

            {/* Relay LED */}
            <circle
              cx="22"
              cy="28"
              r="4.5"
              fill={pumpOn ? '#ef4444' : '#334155'}
            />
            <text x="32" y="31" fontSize="8" fill="#dbeafe">
              IN1
            </text>

            {/* Switch symbol */}
            <line
              x1="18"
              y1="66"
              x2="34"
              y2="66"
              stroke="#93c5fd"
              strokeWidth="2.5"
            />
            <line
              x1="34"
              y1="66"
              x2="52"
              y2={pumpOn ? '66' : '54'}
              stroke="#fde047"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="52"
              y1="66"
              x2="62"
              y2="66"
              stroke="#93c5fd"
              strokeWidth="2.5"
            />
          </g>

          {/* Water Reservoir & Submersible Pump (Bottom Right) */}
          <g transform="translate(495, 198)">
            <rect
              width="136"
              height="94"
              rx="8"
              fill="#f1f5f9"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Water fill */}
            <rect
              x="3"
              y={91 - Math.max(4, (reservoirLevel / 100) * 76)}
              width="130"
              height={Math.max(4, (reservoirLevel / 100) * 76)}
              rx="5"
              fill="#bae6fd"
              opacity="0.85"
            />
            {/* Submersible Pump body */}
            <rect
              x="22"
              y="44"
              width="48"
              height="36"
              rx="5"
              fill={pumpOn ? '#0369a1' : '#475569'}
              stroke="#1e293b"
              strokeWidth="1.5"
            />
            <text
              x="46"
              y="66"
              fontSize="9"
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
            >
              PUMP
            </text>
            <text
              x="98"
              y="32"
              fontSize="10"
              fontWeight="700"
              fill="#0f172a"
              textAnchor="middle"
            >
              {reservoirLevel}%
            </text>
            <text
              x="98"
              y="45"
              fontSize="8.5"
              fill="#475569"
              textAnchor="middle"
            >
              Tank
            </text>
            <text
              x="68"
              y="112"
              fontSize="11"
              fontWeight="600"
              fill="#44403c"
              textAnchor="middle"
            >
              Water Pump &amp; Reservoir
            </text>
          </g>
        </svg>
      </div>

      {/* Pinout & Signal Summary Row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Droplets className="h-3.5 w-3.5 text-amber-600" />
            <span>Sensor Pin A0</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-semibold text-stone-900">
            {rawAdc} ADC
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Cpu className="h-3.5 w-3.5 text-teal-600" />
            <span>Relay Pin D7</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-semibold text-stone-900">
            {pinD7State}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span>Relay Coil</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-stone-900">
            {pumpOn ? 'Energized (NO Closed)' : 'De-energized (Open)'}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Waves className="h-3.5 w-3.5 text-sky-600" />
            <span>Moisture Gauge</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full transition-all duration-300 ${
                soilStatus === 'dry'
                  ? 'bg-amber-500'
                  : soilStatus === 'optimal'
                    ? 'bg-emerald-500'
                    : 'bg-sky-500'
              }`}
              style={{ width: `${Math.round(moisture)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
