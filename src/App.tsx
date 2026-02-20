import { useState, useCallback, useRef } from "react";
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

interface Control {
  cc: number;
  name: string;
}

interface Bank {
  name: string;
  channel: number;
  controls: Control[];
}

const STORAGE_KEY_KNOBS = "mididash-knobs";
const STORAGE_KEY_CHANNEL = "mididash-channel";
const STORAGE_KEY_BANK_NAME = "mididash-bank-name";

function loadBankName(): string {
  return localStorage.getItem(STORAGE_KEY_BANK_NAME) || "Untitled Bank";
}

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
  const [bankName, setBankName] = useState<string>(loadBankName);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const midi = useMIDI();

  const updateKnob = useCallback((id: number, patch: Partial<KnobConfig>) => {
    setKnobs((prev) => {
      const next = prev.map((k) => (k.id === id ? { ...k, ...patch } : k));
      localStorage.setItem(STORAGE_KEY_KNOBS, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleChannelChange = useCallback((ch: number) => {
    if (ch >= 1 && ch <= 16) {
      setChannel(ch);
      localStorage.setItem(STORAGE_KEY_CHANNEL, String(ch));
    }
  }, []);

  const handleBankNameChange = useCallback((name: string) => {
    setBankName(name);
    localStorage.setItem(STORAGE_KEY_BANK_NAME, name);
  }, []);

  const exportBank = useCallback(() => {
    const bank: Bank = {
      name: bankName,
      channel,
      controls: knobs.map((k) => ({ cc: k.ccNumber, name: k.label })),
    };
    const json = JSON.stringify(bank, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bankName.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bankName, channel, knobs]);

  const applyBankJSON = useCallback(
    (json: string): boolean => {
      try {
        const bank: Bank = JSON.parse(json);
        if (typeof bank.channel !== "number" || !Array.isArray(bank.controls)) {
          alert("Invalid bank data.");
          return false;
        }
        handleChannelChange(bank.channel);
        if (bank.name) handleBankNameChange(bank.name);
        const newKnobs: KnobConfig[] = bank.controls.map((c, i) => ({
          id: i,
          label: c.name,
          ccNumber: c.cc,
          value: 0,
        }));
        setKnobs(newKnobs);
        localStorage.setItem(STORAGE_KEY_KNOBS, JSON.stringify(newKnobs));
        return true;
      } catch {
        alert("Failed to parse bank data.");
        return false;
      }
    },
    [handleChannelChange, handleBankNameChange],
  );

  const importBank = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        applyBankJSON(e.target?.result as string);
      };
      reader.readAsText(file);
    },
    [applyBankJSON],
  );

  const handleValueChange = useCallback(
    (knob: KnobConfig, value: number) => {
      updateKnob(knob.id, { value });
      midi.sendCC(channel - 1, knob.ccNumber, Math.round(value * 127));
    },
    [channel, midi, updateKnob],
  );

  const sendAll = useCallback(() => {
    for (const knob of knobs) {
      midi.sendCC(channel - 1, knob.ccNumber, Math.round(knob.value * 127));
    }
  }, [channel, knobs, midi]);

  return (
    <div className="app">
      <header className="header">
        <div className="title-group">
          <h1 className="title">Mididash</h1>
          <input
            className="bank-name-input"
            type="text"
            value={bankName}
            onChange={(e) => handleBankNameChange(e.target.value)}
            placeholder="Bank name"
          />
        </div>

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
            className="header-btn"
            onClick={exportBank}
            title="Export Bank"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M3 13h10" />
            </svg>
          </button>

          <button
            className="header-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import Bank from File"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 13V6.5a1 1 0 0 1 1-1h2.5L7 3.5h5a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />
            </svg>
          </button>

          <button
            className="header-btn"
            onClick={() => {
              setPasteValue("");
              setPasteOpen(true);
            }}
            title="Import Bank from JSON"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="8" height="12" rx="1" />
              <path d="M6 2V1.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V2" />
              <path d="M6.5 6h3M6.5 8.5h3M6.5 11h2" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importBank(file);
              e.target.value = "";
            }}
          />

          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            ⚙
          </button>

          <button
            className="header-btn send-btn"
            onClick={sendAll}
            title="Send All CCs"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              stroke="none"
            >
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
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

      {pasteOpen && (
        <div className="modal-backdrop" onClick={() => setPasteOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import JSON</h2>
              <button
                className="modal-close"
                onClick={() => setPasteOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <textarea
                className="paste-textarea"
                placeholder="Paste bank JSON here..."
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                rows={10}
              />
              <button
                className="paste-import-btn"
                disabled={!pasteValue.trim()}
                onClick={() => {
                  if (applyBankJSON(pasteValue)) {
                    setPasteOpen(false);
                  }
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

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
