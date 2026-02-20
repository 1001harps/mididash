import { useState, useCallback } from "react";
import { useMIDI } from "./hooks/useMIDI";
import { KnobControl } from "./components/KnobControl";
import { SettingsModal } from "./components/SettingsModal";
import "./App.css";

interface KnobConfig {
  id: number;
  label: string;
  ccNumber: number;
  value: number;
}

const STORAGE_KEY_KNOBS = "mididash-knobs";
const STORAGE_KEY_CHANNEL = "mididash-channel";

function loadKnobs(): KnobConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_KNOBS);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    label: `Knob ${i + 1}`,
    ccNumber: i + 1,
    value: 0,
  }));
}

function loadChannel(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CHANNEL);
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= 1 && n <= 16) return n;
    }
  } catch {
    /* ignore */
  }
  return 1;
}

function App() {
  const [knobs, setKnobs] = useState<KnobConfig[]>(loadKnobs);
  const [channel, setChannel] = useState<number>(loadChannel);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const midi = useMIDI();

  const updateKnob = useCallback((id: number, patch: Partial<KnobConfig>) => {
    setKnobs((prev) => {
      const next = prev.map((k) => (k.id === id ? { ...k, ...patch } : k));
      localStorage.setItem(STORAGE_KEY_KNOBS, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleChannelChange = (ch: number) => {
    if (ch >= 1 && ch <= 16) {
      setChannel(ch);
      localStorage.setItem(STORAGE_KEY_CHANNEL, String(ch));
    }
  };

  const handleValueChange = useCallback(
    (knob: KnobConfig, value: number) => {
      updateKnob(knob.id, { value });
      midi.sendCC(channel - 1, knob.ccNumber, Math.round(value * 127));
    },
    [channel, midi, updateKnob],
  );

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Mididash</h1>

        <div className="header-controls">
          <div className="status-group">
            <span
              className={`status-dot ${midi.isConnected ? "connected" : ""}`}
            />
            <span className="status-text">
              {midi.error
                ? "Error"
                : midi.isConnected
                  ? "Connected"
                  : "No output"}
            </span>
          </div>

          <div className="channel-group">
            <label className="channel-label" htmlFor="channel-select">
              CH
            </label>
            <select
              id="channel-select"
              className="channel-select"
              value={channel}
              onChange={(e) =>
                handleChannelChange(parseInt(e.target.value, 10))
              }
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {midi.error && <div className="error-banner">{midi.error}</div>}

      <main className="knob-grid">
        {knobs.map((knob) => (
          <KnobControl
            key={knob.id}
            label={knob.label}
            ccNumber={knob.ccNumber}
            value={knob.value}
            onLabelChange={(label) => updateKnob(knob.id, { label })}
            onCCChange={(ccNumber) => updateKnob(knob.id, { ccNumber })}
            onValueChange={(value) => handleValueChange(knob, value)}
          />
        ))}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        outputs={midi.outputs}
        selectedOutputId={midi.selectedOutputId}
        onSelectOutput={midi.selectOutput}
      />
    </div>
  );
}

export default App;
