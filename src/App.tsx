import { useState, useCallback, useRef } from "react";
import { useMIDI } from "./hooks/useMIDI";
import { Rack } from "./components/Rack";
import type { RackConfig, KnobConfig } from "./components/Rack";
import { SettingsModal } from "./components/SettingsModal";
import "./App.css";

interface Control {
  cc: number;
  name: string;
}

interface Bank {
  name: string;
  channel: number;
  controls: Control[];
}

const STORAGE_KEY_RACKS = "mididash-racks";

function defaultRack(id = 0): RackConfig {
  return {
    id,
    name: "Untitled Rack",
    channel: 1,
    knobs: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      label: `Knob ${i + 1}`,
      ccNumber: i + 1,
      value: 0,
    })),
  };
}

function loadRacks(): RackConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RACKS);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return [defaultRack()];
}

function App() {
  const [racks, setRacks] = useState<RackConfig[]>(loadRacks);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const racksRef = useRef(racks);
  racksRef.current = racks;

  const midi = useMIDI();

  const saveAndSetRacks = useCallback(
    (updater: (prev: RackConfig[]) => RackConfig[]) => {
      setRacks((prev) => {
        const next = updater(prev);
        localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const updateRack = useCallback(
    (rackId: number, patch: Partial<Omit<RackConfig, "knobs">>) => {
      saveAndSetRacks((prev) =>
        prev.map((r) => (r.id === rackId ? { ...r, ...patch } : r)),
      );
    },
    [saveAndSetRacks],
  );

  const addRack = useCallback(() => {
    saveAndSetRacks((prev) => {
      const maxId = prev.reduce((m, r) => Math.max(m, r.id), -1);
      return [...prev, defaultRack(maxId + 1)];
    });
  }, [saveAndSetRacks]);

  const removeRack = useCallback(
    (rackId: number) => {
      saveAndSetRacks((prev) => prev.filter((r) => r.id !== rackId));
    },
    [saveAndSetRacks],
  );

  const updateKnob = useCallback(
    (rackId: number, knobId: number, patch: Partial<KnobConfig>) => {
      saveAndSetRacks((prev) =>
        prev.map((r) =>
          r.id === rackId
            ? {
                ...r,
                knobs: r.knobs.map((k) =>
                  k.id === knobId ? { ...k, ...patch } : k,
                ),
              }
            : r,
        ),
      );
    },
    [saveAndSetRacks],
  );

  const addKnob = useCallback(
    (rackId: number) => {
      saveAndSetRacks((prev) =>
        prev.map((r) => {
          if (r.id !== rackId) return r;
          const maxId = r.knobs.reduce((m, k) => Math.max(m, k.id), -1);
          return {
            ...r,
            knobs: [
              ...r.knobs,
              {
                id: maxId + 1,
                label: `Knob ${r.knobs.length + 1}`,
                ccNumber: r.knobs.length + 1,
                value: 0,
              },
            ],
          };
        }),
      );
    },
    [saveAndSetRacks],
  );

  const removeKnob = useCallback(
    (rackId: number, knobId: number) => {
      saveAndSetRacks((prev) =>
        prev.map((r) =>
          r.id === rackId
            ? { ...r, knobs: r.knobs.filter((k) => k.id !== knobId) }
            : r,
        ),
      );
    },
    [saveAndSetRacks],
  );

  const handleValueChange = useCallback(
    (rackId: number, knobId: number, value: number) => {
      updateKnob(rackId, knobId, { value });
      const rack = racksRef.current.find((r) => r.id === rackId);
      if (rack) {
        const knob = rack.knobs.find((k) => k.id === knobId);
        if (knob) {
          midi.sendCC(rack.channel - 1, knob.ccNumber, Math.round(value * 127));
        }
      }
    },
    [midi, updateKnob],
  );

  const sendAll = useCallback(
    (rackId: number) => {
      const rack = racksRef.current.find((r) => r.id === rackId);
      if (!rack) return;
      for (const knob of rack.knobs) {
        midi.sendCC(
          rack.channel - 1,
          knob.ccNumber,
          Math.round(knob.value * 127),
        );
      }
    },
    [midi],
  );

  const sendAllRacks = useCallback(() => {
    for (const rack of racksRef.current) {
      for (const knob of rack.knobs) {
        midi.sendCC(
          rack.channel - 1,
          knob.ccNumber,
          Math.round(knob.value * 127),
        );
      }
    }
  }, [midi]);

  const exportBanks = useCallback(() => {
    const banks: Bank[] = racksRef.current.map((r) => ({
      name: r.name,
      channel: r.channel,
      controls: r.knobs.map((k) => ({ cc: k.ccNumber, name: k.label })),
    }));
    const json = JSON.stringify(banks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const firstName = racksRef.current[0]?.name || "mididash";
    a.download = `${firstName.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const applyBankJSON = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      const banks: Bank[] = parsed;
      for (const b of banks) {
        if (typeof b.channel !== "number" || !Array.isArray(b.controls)) {
          alert("Invalid bank data.");
          return false;
        }
      }
      const newRacks: RackConfig[] = banks.map((b, i) => ({
        id: i,
        name: b.name || "Untitled Rack",
        channel: Math.max(1, Math.min(16, b.channel)),
        knobs: b.controls.map((c, j) => ({
          id: j,
          label: c.name,
          ccNumber: c.cc,
          value: 0,
        })),
      }));
      setRacks(newRacks);
      localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(newRacks));
      return true;
    } catch {
      alert("Failed to parse bank data.");
      return false;
    }
  }, []);

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

          <button
            className="header-btn"
            onClick={exportBanks}
            title="Export"
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
            title="Import from File"
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
            title="Import from JSON"
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
            onClick={sendAllRacks}
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

      <div className="racks-container">
        {racks.map((rack) => (
          <Rack
            key={rack.id}
            rack={rack}
            onNameChange={(name) => updateRack(rack.id, { name })}
            onChannelChange={(channel) => updateRack(rack.id, { channel })}
            onAddKnob={() => addKnob(rack.id)}
            onRemoveKnob={(knobId) => removeKnob(rack.id, knobId)}
            onKnobLabelChange={(knobId, label) =>
              updateKnob(rack.id, knobId, { label })
            }
            onKnobCCChange={(knobId, ccNumber) =>
              updateKnob(rack.id, knobId, { ccNumber })
            }
            onKnobValueChange={(knobId, value) =>
              handleValueChange(rack.id, knobId, value)
            }
            onRemoveRack={() => removeRack(rack.id)}
            onSendAll={() => sendAll(rack.id)}
          />
        ))}
      </div>

      <button className="add-rack-btn" onClick={addRack}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="10" y1="4" x2="10" y2="16" />
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
        Add Rack
      </button>

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
