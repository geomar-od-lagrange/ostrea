import * as React from "react";
import { theme } from "./theme";

interface ControlPanelProps {
  selectedDepths: string[];
  onDepthChange: (newDepths: string[]) => void;
  selectedTimes: string[];
  onTimeChange: (newTimes: string[]) => void;
  clearHex?: (payload: { depths: string[]; times: string[] }) => void;
  isAQCHighlighted: boolean;
  onAQCChange: (newAQC: boolean) => void;
  isRestHighlighted: boolean;
  onRestChange: (newRest: boolean) => void;
  isDiseaseHighlighted: boolean;
  onDiseaseChange: (newDisease: boolean) => void; 
}

const depths = ["05m", "10m", "15m"];
const times = ["00d-07d", "07d-14d", "14d-28d"];

// helper to toggle values in an array
const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value];

export default function ControlPanel({
  selectedDepths,
  onDepthChange,
  selectedTimes,
  onTimeChange,
  clearHex,
  isAQCHighlighted,
  onAQCChange,
  isRestHighlighted,
  onRestChange,
  isDiseaseHighlighted,
  onDiseaseChange
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = React.useState(() => window.innerWidth <= 480);

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDepthChange(toggle(selectedDepths, e.target.value));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(toggle(selectedTimes, e.target.value));
  };

  const stopScroll = (e: React.WheelEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          background: "transparent",
          border: "none",
          color: theme.ui.controlPanel.text,
          fontSize: 12,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
        }}
        title="Show controls"
      >
        Controls
      </button>
    );
  }

  return (
    <div
      onWheel={stopScroll}
      onTouchMove={stopScroll}
      style={{
        overscrollBehavior: "none",
        maxHeight: "100%",
      }}
    >
    <fieldset className="control-panel-fieldset">
      <div className="control-panel-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="control-panel-section-inner">
          <div className="control-panel-section-label">Depth</div>
        <div className="control-panel-section-options">
          {depths.map(d => (
            <label key={d} className="control-panel-option">
              <input
                type="checkbox"
                name="depth"
                value={d}
                checked={selectedDepths.includes(d)}
                onChange={handleDepthChange}
              />
              {d}
            </label>
          ))}
        </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => clearHex?.({ depths: selectedDepths, times: selectedTimes })}
            style={{
              background: "transparent",
              border: "none",
              color: theme.ui.controlPanel.text,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            clear
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "transparent",
              border: "none",
              color: theme.ui.controlPanel.text,
              fontSize: 14,
              cursor: "pointer",
              padding: "2px 6px",
              lineHeight: 1,
            }}
            title="Collapse"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="control-panel-section">
        <div className="control-panel-section-label">Time range</div>
        <div className="control-panel-section-options">
          {times.map(t => (
            <label key={t} className="control-panel-option">
              <input
                type="checkbox"
                name="time"
                value={t}
                checked={selectedTimes.includes(t)}
                onChange={handleTimeChange}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="control-panel-section">
        <div className="control-panel-section-label">Highlights</div>
        <div className="control-panel-section-options">
          <label className="control-panel-option">
            <input
              type="checkbox"
              name="aqc"
              checked={isAQCHighlighted}
              onChange={(e) => onAQCChange(e.target.checked)}
            />
            <span style={{ color: theme.colors.aquaculture, fontWeight: 600 }}>Aquacultures</span>
          </label>

          <label className="control-panel-option">
            <input
              type="checkbox"
              name="rest"
              checked={isRestHighlighted}
              onChange={(e) => onRestChange(e.target.checked)}
            />
            <span style={{ color: theme.colors.restoration, fontWeight: 600 }}>Restoration</span>
          </label>

          <label className="control-panel-option">
            <input
              type="checkbox"
              name="disease"
              checked={isDiseaseHighlighted}
              onChange={(e) => onDiseaseChange(e.target.checked)}
            />
            <span style={{ color: theme.colors.disease, fontWeight: 600 }}>Outbreaks</span>
          </label>
        </div>
      </div>

    </fieldset>
    </div>
  );
}

