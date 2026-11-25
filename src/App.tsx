import { useEffect, useRef, useState } from 'react';
import {
  Droplets,
  Play,
  Pause,
  Power,
  RefreshCw,
  Sprout,
  Sun,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import {
  ControlMode,
  PLANT_PRESETS,
  SerialLogEntry,
  TelemetryPoint,
} from './types/plantSystem';
import {
  evaluateAutoRelay,
  formatTime,
  getSoilStatus,
  moisturePercentToRaw,
} from './utils/arduinoLogic';
import { CircuitSchematic } from './components/CircuitSchematic';
import { MoistureChart } from './components/MoistureChart';
import { SerialMonitor } from './components/SerialMonitor';

const MAX_HISTORY_POINTS = 40;
const MAX_LOGS = 80;

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('basil');
  const [moisture, setMoisture] = useState<number>(52);
  const [dryThreshold, setDryThreshold] = useState<number>(38);
  const [targetThreshold, setTargetThreshold] = useState<number>(68);
  const [evaporationRate, setEvaporationRate] = useState<number>(1.4);
  const [reservoirLevel, setReservoirLevel] = useState<number>(85);

  const [mode, setMode] = useState<ControlMode>('auto');
  const [manualPumpOn, setManualPumpOn] = useState<boolean>(false);
  const [autoPumpOn, setAutoPumpOn] = useState<boolean>(false);
  const [activeLowRelay, setActiveLowRelay] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(1);
  const [wateringCycles, setWateringCycles] = useState<number>(0);

  const tickRef = useRef<number>(1);
  const logIdRef = useRef<number>(2);
  const prevPumpRef = useRef<boolean>(false);

  const [history, setHistory] = useState<TelemetryPoint[]>(() => [
    {
      tick: 0,
      timestamp: formatTime(),
      moisture: 52,
      rawAdc: moisturePercentToRaw(52),
      pumpOn: false,
    },
  ]);

  const [logs, setLogs] = useState<SerialLogEntry[]>(() => [
    {
      id: 1,
      timestamp: formatTime(),
      level: 'info',
      message: 'Smart-Plant-Protector booted. Sensor A0 online, Relay D7 ready.',
    },
  ]);

  const pumpOn =
    reservoirLevel > 0 && (mode === 'auto' ? autoPumpOn : manualPumpOn);
  const rawAdc = moisturePercentToRaw(moisture);
  const soilStatus = getSoilStatus(moisture, dryThreshold, targetThreshold);

  const appendLog = (level: SerialLogEntry['level'], message: string) => {
    logIdRef.current += 1;
    const entry: SerialLogEntry = {
      id: logIdRef.current,
      timestamp: formatTime(),
      level,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  };

  const handlePresetChange = (presetId: string) => {
    const preset = PLANT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setDryThreshold(preset.dryThreshold);
    setTargetThreshold(preset.targetThreshold);
    setEvaporationRate(preset.evaporationRate);
    appendLog(
      'info',
      `Profile loaded: ${preset.name} (Dry < ${preset.dryThreshold}%, Target ${preset.targetThreshold}%).`,
    );
  };

  // Simulation loop mimicking Arduino loop()
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.round(1000 / simSpeed);
    const timer = window.setInterval(() => {
      setMoisture((prevMoisture) => {
        const currentlyPumping =
          reservoirLevel > 0 && (mode === 'auto' ? autoPumpOn : manualPumpOn);

        const nextPumpState =
          mode === 'auto'
            ? evaluateAutoRelay(
                prevMoisture,
                currentlyPumping,
                dryThreshold,
                targetThreshold,
                reservoirLevel,
              )
            : manualPumpOn && reservoirLevel > 0;

        if (mode === 'auto' && nextPumpState !== autoPumpOn) {
          setAutoPumpOn(nextPumpState);
        }

        // Update watering cycle counter & transition logs
        if (nextPumpState && !prevPumpRef.current) {
          setWateringCycles((c) => c + 1);
          appendLog(
            'pump',
            `Soil DRY (${Math.round(prevMoisture)}% / A0=${moisturePercentToRaw(prevMoisture)}) -> Relay energized, Water Pump ON.`,
          );
        } else if (!nextPumpState && prevPumpRef.current) {
          appendLog(
            'info',
            reservoirLevel <= 0
              ? 'Water tank empty! Safety shutoff turned Pump OFF.'
              : `Target moisture reached (${Math.round(prevMoisture)}%) -> Relay opened, Water Pump OFF.`,
          );
        }
        prevPumpRef.current = nextPumpState;

        // Calculate moisture delta: pump adds +4.5% per tick, evaporation removes evaporationRate
        const pumpGain = nextPumpState ? 4.5 : 0;
        const nextMoisture = Math.max(
          0,
          Math.min(100, prevMoisture - evaporationRate + pumpGain),
        );

        if (nextPumpState) {
          setReservoirLevel((prevTank) => Math.max(0, +(prevTank - 1.2).toFixed(1)));
        }

        const nextRaw = moisturePercentToRaw(nextMoisture);
        const ts = formatTime();
        tickRef.current += 1;

        setHistory((prevHistory) =>
          [
            ...prevHistory,
            {
              tick: tickRef.current,
              timestamp: ts,
              moisture: Math.round(nextMoisture * 10) / 10,
              rawAdc: nextRaw,
              pumpOn: nextPumpState,
            },
          ].slice(-MAX_HISTORY_POINTS),
        );

        // Emit periodic telemetry log every 4 ticks
        if (tickRef.current % 4 === 0) {
          appendLog(
            nextPumpState ? 'pump' : nextMoisture < dryThreshold ? 'warn' : 'info',
            `A0=${nextRaw} | Moisture=${Math.round(nextMoisture)}% | Relay=${nextPumpState ? 'ON' : 'OFF'}`,
          );
        }

        return nextMoisture;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    isRunning,
    simSpeed,
    mode,
    autoPumpOn,
    manualPumpOn,
    dryThreshold,
    targetThreshold,
    evaporationRate,
    reservoirLevel,
  ]);

  const handleDrySoil = () => {
    const dropped = Math.max(8, moisture - 22);
    setMoisture(dropped);
    appendLog(
      'warn',
      `Environment event: Hot sun dried soil to ${Math.round(dropped)}% (A0=${moisturePercentToRaw(dropped)}).`,
    );
  };

  const handleManualSplash = () => {
    const boosted = Math.min(95, moisture + 20);
    setMoisture(boosted);
    appendLog(
      'info',
      `Manual watering event: Moisture rose to ${Math.round(boosted)}% (A0=${moisturePercentToRaw(boosted)}).`,
    );
  };

  const handleRefillTank = () => {
    setReservoirLevel(100);
    appendLog('info', 'Water reservoir refilled to 100%.');
  };

  const handleToggleMode = (nextMode: ControlMode) => {
    setMode(nextMode);
    if (nextMode === 'manual') {
      setManualPumpOn(pumpOn);
      appendLog('info', 'Switched to MANUAL relay override mode.');
    } else {
      appendLog('info', 'Switched to AUTO Arduino sensor control mode.');
    }
  };

  const activePreset = PLANT_PRESETS.find((p) => p.id === selectedPresetId);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top Bar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900">
                Smart Plant Protector
              </h1>
              <p className="text-xs text-stone-500">
                Arduino Soil Moisture Sensor &amp; Relay Water Pump Controller
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Plant Preset Selector */}
            <select
              aria-label="Plant preset"
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs focus:border-emerald-500 focus:outline-none"
            >
              {PLANT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* Simulation Speed */}
            <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs">
              {([1, 2, 5] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSimSpeed(speed)}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    simSpeed === speed
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isRunning
                  ? 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause Loop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Resume Loop
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Low Reservoir Alert */}
        {reservoirLevel <= 15 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {reservoirLevel <= 0
                  ? 'Water reservoir is empty! Pump shut off to prevent dry-run damage.'
                  : `Water reservoir is low (${reservoirLevel}%). Refill soon.`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefillTank}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Refill Tank
            </button>
          </div>
        )}

        {/* Top KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Soil Moisture</span>
              <Droplets className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">
                {Math.round(moisture)}%
              </span>
              <span className="font-mono text-xs text-stone-500">
                A0: {rawAdc}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {activePreset?.description}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Relay &amp; Water Pump</span>
              <Power
                className={`h-4 w-4 ${pumpOn ? 'text-sky-600' : 'text-stone-400'}`}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  pumpOn ? 'text-sky-600' : 'text-stone-800'
                }`}
              >
                {pumpOn ? 'ACTIVE' : 'OFF'}
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 uppercase">
                {mode}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Completed cycles: {wateringCycles}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Soil Condition</span>
              <Sprout className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-md px-2.5 py-0.5 text-sm font-semibold capitalize ${
                  soilStatus === 'dry'
                    ? 'bg-amber-100 text-amber-800'
                    : soilStatus === 'optimal'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                }`}
              >
                {soilStatus === 'dry'
                  ? 'Dry — Needs Water'
                  : soilStatus === 'optimal'
                    ? 'Optimal Moisture'
                    : 'Well Watered'}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Trigger &lt; {dryThreshold}% • Stop ≥ {targetThreshold}%
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>Water Reservoir</span>
              <RefreshCw className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-stone-900">
                {Math.round(reservoirLevel)}%
              </span>
              <button
                type="button"
                onClick={handleRefillTank}
                className="text-xs font-medium text-sky-700 hover:underline"
              >
                Refill 100%
              </button>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${reservoirLevel}%` }}
              />
            </div>
          </div>
        </section>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Hardware Schematic & Interactive Actions */}
          <div className="space-y-6 lg:col-span-7">
            <CircuitSchematic
              moisture={moisture}
              rawAdc={rawAdc}
              pumpOn={pumpOn}
              soilStatus={soilStatus}
              reservoirLevel={Math.round(reservoirLevel)}
              activeLowRelay={activeLowRelay}
            />

            {/* Environment & Sensor Testing Controls */}
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    Relay Control &amp; Field Test Actions
                  </h2>
                  <p className="text-xs text-stone-500">
                    Simulate drying soil, manual watering, or override the relay directly
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="flex rounded-lg bg-stone-100 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('auto')}
                    className={`rounded-md px-3 py-1 transition ${
                      mode === 'auto'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Auto Sensor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMode('manual')}
                    className={`rounded-md px-3 py-1 transition ${
                      mode === 'manual'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Manual Override
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDrySoil}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <Sun className="h-4 w-4" />
                  Simulate Dry Soil (-22%)
                </button>
                <button
                  type="button"
                  onClick={handleManualSplash}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                >
                  <Droplets className="h-4 w-4" />
                  Add Rain / Water (+20%)
                </button>

                {mode === 'manual' && (
                  <button
                    type="button"
                    disabled={reservoirLevel <= 0}
                    onClick={() => {
                      const next = !manualPumpOn;
                      setManualPumpOn(next);
                      appendLog(
                        next ? 'pump' : 'info',
                        `Manual override: Pump switched ${next ? 'ON' : 'OFF'}.`,
                      );
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                      manualPumpOn
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                    {manualPumpOn ? 'Turn Pump OFF' : 'Turn Pump ON'}
                  </button>
                )}
              </div>

              {/* Direct Moisture Probe Slider */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-700">
                    Direct Moisture Probe Override
                  </span>
                  <span className="font-mono text-stone-600">
                    {Math.round(moisture)}% ({rawAdc} ADC)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(moisture)}
                  onChange={(e) => setMoisture(Number(e.target.value))}
                  className="mt-2 w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Calibration, Telemetry Chart & Serial Monitor */}
          <div className="space-y-6 lg:col-span-5">
            {/* Threshold Calibration */}
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-stone-600" />
                  <h2 className="text-base font-semibold text-stone-900">
                    Arduino Threshold Calibration
                  </h2>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={activeLowRelay}
                    onChange={(e) => setActiveLowRelay(e.target.checked)}
                    className="rounded border-stone-300 accent-emerald-600"
                  />
                  Active-LOW Relay
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">
                      Dry Trigger (Pump ON below)
                    </span>
                    <span className="font-mono font-semibold text-amber-700">
                      {dryThreshold}% (A0 &gt; {moisturePercentToRaw(dryThreshold)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={65}
                    value={dryThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDryThreshold(val);
                      if (targetThreshold <= val + 5) {
                        setTargetThreshold(Math.min(95, val + 10));
                      }
                    }}
                    className="mt-1.5 w-full accent-amber-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">
                      Target Moisture (Pump OFF at)
                    </span>
                    <span className="font-mono font-semibold text-sky-700">
                      {targetThreshold}% (A0 ≤ {moisturePercentToRaw(targetThreshold)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={dryThreshold + 5}
                    max={95}
                    value={targetThreshold}
                    onChange={(e) => setTargetThreshold(Number(e.target.value))}
                    className="mt-1.5 w-full accent-sky-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">
                      Evaporation Rate (Ambient Heat)
                    </span>
                    <span className="font-mono text-stone-600">
                      -{evaporationRate.toFixed(1)}% / tick
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={4.0}
                    step={0.2}
                    value={evaporationRate}
                    onChange={(e) => setEvaporationRate(Number(e.target.value))}
                    className="mt-1.5 w-full accent-stone-600"
                  />
                </div>
              </div>
            </div>

            <MoistureChart
              history={history}
              dryThreshold={dryThreshold}
              targetThreshold={targetThreshold}
            />

            <SerialMonitor
              logs={logs}
              onClearLogs={() => setLogs([])}
              dryThreshold={dryThreshold}
              targetThreshold={targetThreshold}
              activeLowRelay={activeLowRelay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
