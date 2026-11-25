import React, { useState } from 'react';
import { Terminal, Code2, Copy, Check, Trash2 } from 'lucide-react';
import { SerialLogEntry } from '../types/plantSystem';
import { generateArduinoSketch } from '../utils/arduinoLogic';

interface SerialMonitorProps {
  logs: SerialLogEntry[];
  onClearLogs: () => void;
  dryThreshold: number;
  targetThreshold: number;
  activeLowRelay: boolean;
}

export const SerialMonitor: React.FC<SerialMonitorProps> = ({
  logs,
  onClearLogs,
  dryThreshold,
  targetThreshold,
  activeLowRelay,
}) => {
  const [activeTab, setActiveTab] = useState<'serial' | 'sketch'>('serial');
  const [copied, setCopied] = useState(false);

  const sketchCode = generateArduinoSketch(
    dryThreshold,
    targetThreshold,
    activeLowRelay,
  );

  const handleCopySketch = async () => {
    try {
      await navigator.clipboard.writeText(sketchCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('serial')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'serial'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Serial Monitor (9600 baud)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sketch')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'sketch'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Arduino .ino Sketch
          </button>
        </div>

        {activeTab === 'serial' ? (
          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCopySketch}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Sketch
              </>
            )}
          </button>
        )}
      </div>

      {activeTab === 'serial' ? (
        <div className="h-56 overflow-y-auto rounded-lg bg-stone-950 p-3 font-mono text-xs leading-relaxed text-stone-200">
          {logs.length === 0 ? (
            <p className="text-stone-500">Waiting for serial output...</p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex gap-2">
                <span className="shrink-0 text-stone-500">
                  [{entry.timestamp}]
                </span>
                <span
                  className={
                    entry.level === 'pump'
                      ? 'text-sky-400'
                      : entry.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <pre className="h-56 overflow-auto rounded-lg bg-stone-950 p-3 font-mono text-xs leading-relaxed text-emerald-300">
          <code>{sketchCode}</code>
        </pre>
      )}
    </div>
  );
};
