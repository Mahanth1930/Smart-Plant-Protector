import { SoilStatus } from '../types/plantSystem';

// Typical Arduino capacitive/resistive soil moisture sensor calibration:
// Dry air / bone-dry soil ~ 980 ADC, submerged / saturated soil ~ 260 ADC
export const DRY_ADC = 980;
export const WET_ADC = 260;

export function moisturePercentToRaw(moisturePercent: number): number {
  const clamped = Math.max(0, Math.min(100, moisturePercent));
  const raw = DRY_ADC - (clamped / 100) * (DRY_ADC - WET_ADC);
  return Math.round(raw);
}

export function getSoilStatus(
  moisturePercent: number,
  dryThreshold: number,
  targetThreshold: number,
): SoilStatus {
  if (moisturePercent < dryThreshold) return 'dry';
  if (moisturePercent >= targetThreshold) return 'wet';
  return 'optimal';
}

export function evaluateAutoRelay(
  moisturePercent: number,
  currentlyPumping: boolean,
  dryThreshold: number,
  targetThreshold: number,
  reservoirLevel: number,
): boolean {
  if (reservoirLevel <= 0) {
    return false;
  }
  if (moisturePercent < dryThreshold) {
    return true;
  }
  if (currentlyPumping && moisturePercent < targetThreshold) {
    return true;
  }
  return false;
}

export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function generateArduinoSketch(
  dryThreshold: number,
  targetThreshold: number,
  activeLowRelay: boolean,
): string {
  const dryAdc = moisturePercentToRaw(dryThreshold);
  const wetAdc = moisturePercentToRaw(targetThreshold);
  const relayOnLevel = activeLowRelay ? 'LOW' : 'HIGH';
  const relayOffLevel = activeLowRelay ? 'HIGH' : 'LOW';

  return `// Smart-Plant-Protector — Arduino Automatic Plant Watering Sketch
// Hardware: Arduino Uno + Soil Moisture Sensor (A0) + Relay Module (D7) + Water Pump

const int SENSOR_PIN = A0;
const int RELAY_PIN  = 7;

// Calibrated ADC thresholds (higher ADC = drier soil)
const int DRY_THRESHOLD_ADC = ${dryAdc}; // ~${dryThreshold}% moisture
const int WET_THRESHOLD_ADC = ${wetAdc}; // ~${targetThreshold}% moisture

bool pumpActive = false;

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, ${relayOffLevel}); // Keep relay OFF on boot
  Serial.println("Smart-Plant-Protector initialized.");
}

void loop() {
  int rawValue = analogRead(SENSOR_PIN);
  int moisturePct = constrain(map(rawValue, ${DRY_ADC}, ${WET_ADC}, 0, 100), 0, 100);

  // Hysteresis control prevents rapid relay chattering
  if (rawValue > DRY_THRESHOLD_ADC) {
    pumpActive = true;
  } else if (rawValue <= WET_THRESHOLD_ADC) {
    pumpActive = false;
  }

  digitalWrite(RELAY_PIN, pumpActive ? ${relayOnLevel} : ${relayOffLevel});

  Serial.print("A0=");
  Serial.print(rawValue);
  Serial.print(" | Moisture=");
  Serial.print(moisturePct);
  Serial.print("% | Pump=");
  Serial.println(pumpActive ? "ON (WATERING)" : "OFF");

  delay(1000);
}`;
}
