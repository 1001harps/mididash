import { useState, type FC } from "react";
import { KnobControl } from "./KnobControl";
import "./Rack.css";

export interface KnobConfig {
  id: number;
  label: string;
  ccNumber: number;
  value: number;
}

export interface RackConfig {
  id: number;
  name: string;
  channel: number;
  knobs: KnobConfig[];
}

interface RackProps {
  rack: RackConfig;
  onNameChange: (name: string) => void;
  onChannelChange: (channel: number) => void;
  onAddKnob: () => void;
  onRemoveKnob: (knobId: number) => void;
  onKnobLabelChange: (knobId: number, label: string) => void;
  onKnobCCChange: (knobId: number, cc: number) => void;
  onKnobValueChange: (knobId: number, value: number) => void;
  onRemoveRack: () => void;
  onSendAll: () => void;
}

export const Rack: FC<RackProps> = ({
  rack,
  onNameChange,
  onChannelChange,
  onAddKnob,
  onRemoveKnob,
  onKnobLabelChange,
  onKnobCCChange,
  onKnobValueChange,
  onRemoveRack,
  onSendAll,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="rack">
      <div className="rack-header">
        <button
          className="rack-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
          >
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </button>
        <input
          className="rack-name-input"
          type="text"
          value={rack.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Rack name"
        />
        <div className="rack-header-actions">
          <div className="channel-group">
            <label className="channel-label" htmlFor={`channel-select-${rack.id}`}>
              CH
            </label>
            <select
              id={`channel-select-${rack.id}`}
              className="channel-select"
              value={rack.channel}
              onChange={(e) => onChannelChange(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <button
            className="rack-btn"
            onClick={onSendAll}
            title="Send All CCs"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              stroke="none"
            >
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          </button>
          <button
            className="rack-btn rack-remove-btn"
            onClick={onRemoveRack}
            title="Remove rack"
          >
            ×
          </button>
        </div>
      </div>
      {!collapsed && <div className="knob-grid">
        {rack.knobs.map((knob) => (
          <KnobControl
            key={knob.id}
            label={knob.label}
            ccNumber={knob.ccNumber}
            value={knob.value}
            onLabelChange={(label) => onKnobLabelChange(knob.id, label)}
            onCCChange={(cc) => onKnobCCChange(knob.id, cc)}
            onValueChange={(value) => onKnobValueChange(knob.id, value)}
            onRemove={() => onRemoveKnob(knob.id)}
          />
        ))}
        <button
          className="add-control-btn"
          onClick={onAddKnob}
          title="Add control"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="16" y1="10" x2="16" y2="22" />
            <line x1="10" y1="16" x2="22" y2="16" />
          </svg>
          <span>Add Control</span>
        </button>
      </div>}
    </section>
  );
};
