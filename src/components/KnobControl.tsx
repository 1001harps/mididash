import type { FC } from "react";
import { Rotary } from "../Rotary";
import "./KnobControl.css";

export interface KnobControlProps {
  label: string;
  ccNumber: number;
  value: number;
  onLabelChange: (label: string) => void;
  onCCChange: (cc: number) => void;
  onValueChange: (value: number) => void;
  onRemove?: () => void;
}

export const KnobControl: FC<KnobControlProps> = ({
  label,
  ccNumber,
  value,
  onLabelChange,
  onCCChange,
  onValueChange,
  onRemove,
}) => {
  const midiValue = Math.round(value * 127);

  return (
    <div className="knob-control">
      {onRemove && (
        <button
          className="knob-remove-btn"
          onClick={onRemove}
          title="Remove control"
        >
          ×
        </button>
      )}
      <input
        className="knob-label"
        type="text"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
      />

      <div className="knob-wrapper">
        <Rotary value={value} onChange={onValueChange} size={80} />
      </div>

      <div className="knob-value">{midiValue}</div>

      <div className="knob-cc">
        <label className="knob-cc-label">CC</label>
        <input
          className="knob-cc-input"
          type="number"
          min={0}
          max={127}
          value={ccNumber}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= 0 && n <= 127) {
              onCCChange(n);
            }
          }}
        />
      </div>
    </div>
  );
};
