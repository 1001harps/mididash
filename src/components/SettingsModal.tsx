import type { FC } from "react";
import type { MIDIOutputInfo } from "../hooks/useMIDI";
import "./SettingsModal.css";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  outputs: MIDIOutputInfo[];
  selectedOutputId: string | null;
  onSelectOutput: (id: string) => void;
}

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  outputs,
  selectedOutputId,
  onSelectOutput,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <h3>MIDI Output</h3>
          {outputs.length === 0 ? (
            <p className="no-devices">No MIDI output devices found.</p>
          ) : (
            <div className="device-list">
              {outputs.map((output) => (
                <label key={output.id} className="device-item">
                  <input
                    type="radio"
                    name="midi-output"
                    checked={selectedOutputId === output.id}
                    onChange={() => onSelectOutput(output.id)}
                  />
                  <span className="device-name">{output.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
