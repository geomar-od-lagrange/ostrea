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
  isHabitableShown: boolean;
  onHabitableChange: (v: boolean) => void;
  isHistoricHighlighted: boolean;
  onHistoricChange: (v: boolean) => void;
}

const depths = [
  { value: "05m",     label: "5 meters" },
  { value: "10m",     label: "10 meters" },
  { value: "15m",     label: "15 meters" },
];
const times = [
  { value: "00d-07d", label: "0–7 days" },
  { value: "07d-14d", label: "7–14 days" },
  { value: "07d-28d", label: "7–28 days" },
];

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
  onDiseaseChange,
  isHabitableShown,
  onHabitableChange,
  isHistoricHighlighted,
  onHistoricChange,
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
      <div className="control-panel-section control-panel-actions">
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "transparent",
            border: "none",
            color: theme.ui.controlPanel.text,
            fontSize: 14,
            cursor: "pointer",
            padding: "2px 4px",
            lineHeight: 1,
          }}
          title="Collapse"
        >
          ✕
        </button>
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
      </div>

      <div className="control-panel-section">
        <div className="control-panel-section-label">Drifting Depth</div>
        <div className="control-panel-section-options">
          {depths.map(({ value, label }) => (
            <label key={value} className="control-panel-option">
              <input
                type="checkbox"
                name="depth"
                value={value}
                checked={selectedDepths.includes(value)}
                onChange={handleDepthChange}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="control-panel-section">
        <div className="control-panel-section-label">Time range</div>
        <div className="control-panel-section-options">
          {times.map(({ value, label }) => (
            <label key={value} className="control-panel-option">
              <input
                type="checkbox"
                name="time"
                value={value}
                checked={selectedTimes.includes(value)}
                onChange={handleTimeChange}
              />
              {label}
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
              name="historic"
              checked={isHistoricHighlighted}
              onChange={(e) => onHistoricChange(e.target.checked)}
              style={{ accentColor: theme.colors.historic }}
            />
            <span>Historic population</span>
          </label>

          <label className="control-panel-option">
            <input
              type="checkbox"
              name="aqc"
              checked={isAQCHighlighted}
              onChange={(e) => onAQCChange(e.target.checked)}
              style={{ accentColor: theme.colors.aquaculture }}
            />
            <span>Aquaculture</span>
          </label>

          <label className="control-panel-option">
            <input
              type="checkbox"
              name="rest"
              checked={isRestHighlighted}
              onChange={(e) => onRestChange(e.target.checked)}
              style={{ accentColor: theme.colors.restoration }}
            />
            <span>Restoration</span>
          </label>

          <label className="control-panel-option">
            <input
              type="checkbox"
              name="disease"
              checked={isDiseaseHighlighted}
              onChange={(e) => onDiseaseChange(e.target.checked)}
              style={{ accentColor: theme.colors.disease }}
            />
            <span>Outbreak</span>
          </label>
        </div>
      </div>

    </fieldset>

      {/* Habitable toggle — separate from highlights */}
      <div className="control-panel-section" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="habitable-toggle"
            type="checkbox"
            checked={isHabitableShown}
            onChange={(e) => onHabitableChange(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <label htmlFor="habitable-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ position: 'relative', flexShrink: 0, width: 34, height: 18 }}>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: isHabitableShown ? '#4a9eff' : '#555',
                borderRadius: 9, transition: 'background-color .2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, width: 14, height: 14,
                  left: isHabitableShown ? 18 : 2,
                  backgroundColor: 'white', borderRadius: '50%', transition: 'left .2s',
                }} />
              </div>
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ whiteSpace: 'nowrap' }}>habitable only</div>
              <div style={{ opacity: 0.65 }}>(≤ 85 m depth)</div>
            </div>
          </label>
        </div>
      </div>

      <div className="control-panel-section control-panel-scale-section" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ opacity: 0.7 }}>low</span>
          <div style={{
            flex: 1,
            height: 8,
            borderRadius: 2,
            background: `linear-gradient(to right, ${theme.colorScale.join(', ')})`,
          }} />
          <span style={{ opacity: 0.7 }}>high</span>
        </div>
        <div style={{ marginTop: 3, opacity: 0.75, fontWeight: 'normal' }}>
          Relative concentration (logarithmic scale)
        </div>
      </div>
    </div>
  );
}

