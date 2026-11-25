export type ControlMode = 'auto' | 'manual';

export type SoilStatus = 'dry' | 'optimal' | 'wet';

export interface PlantPreset {
  id: string;
  name: string;
  dryThreshold: number;
  targetThreshold: number;
  evaporationRate: number;
  description: string;
}

export interface TelemetryPoint {
  tick: number;
  timestamp: string;
  moisture: number;
  rawAdc: number;
  pumpOn: boolean;
}

export interface SerialLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'pump';
  message: string;
}

export const PLANT_PRESETS: PlantPreset[] = [
  {
    id: 'basil',
    name: 'Sweet Basil',
    dryThreshold: 38,
    targetThreshold: 68,
    evaporationRate: 1.4,
    description: 'Prefers consistently moist, well-drained soil.',
  },
  {
    id: 'fern',
    name: 'Boston Fern',
    dryThreshold: 45,
    targetThreshold: 75,
    evaporationRate: 1.8,
    description: 'High moisture requirement; sensitive to dry soil.',
  },
  {
    id: 'succulent',
    name: 'Aloe Succulent',
    dryThreshold: 18,
    targetThreshold: 42,
    evaporationRate: 0.8,
    description: 'Thrives on dry cycles between light waterings.',
  },
  {
    id: 'tomato',
    name: 'Cherry Tomato',
    dryThreshold: 35,
    targetThreshold: 65,
    evaporationRate: 1.6,
    description: 'Steady watering cycle prevents blossom-end stress.',
  },
];
