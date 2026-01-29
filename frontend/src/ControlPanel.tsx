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
  const [collapsed, setCollapsed] = React.useState(false);

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
          cursor: "pointer",
          padding: "2px 0",
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ fontWeight: 600 }}>Controls</span>
      <button
        onClick={() => setCollapsed(true)}
        style={{
          background: "transparent",
          border: "none",
          color: theme.ui.controlPanel.text,
          fontSize: 16,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
        title="Collapse"
      >
        ✕
      </button>
    </div>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => clearHex?.({ depths: selectedDepths, times: selectedTimes })}
          style={{ padding: "6px 10px", borderRadius: 6 }}
        >
          Clear
        </button>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 8 }}>Depth</div>
      {depths.map(d => (
        <label
          key={d}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: 4,
          }}
        >
          <input
            type="checkbox"
            name="depth"
            value={d}
            checked={selectedDepths.includes(d)}
            onChange={handleDepthChange}
            style={{ marginRight: 6 }}
          />
          {d}
        </label>
      ))}

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 8 }}>Time range</div>
      {times.map(t => (
        <label
          key={t}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: 4,
          }}
        >
          <input
            type="checkbox"
            name="time"
            value={t}
            checked={selectedTimes.includes(t)}
            onChange={handleTimeChange}
            style={{ marginRight: 6 }}
          />
          {t}
        </label>
      ))}

      <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 8 }}>Highlights</div>
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: 4 }}>
        <input
          type="checkbox"
          name="aqc"
          checked={isAQCHighlighted}
          onChange={(e) => onAQCChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: theme.colors.aquaculture }}
        />
        <span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: theme.colors.aquaculture, marginRight: 6, borderRadius: 2 }} />
        Aquacultures
      </label>

      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: 4 }}>
        <input
          type="checkbox"
          name="rest"
          checked={isRestHighlighted}
          onChange={(e) => onRestChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: theme.colors.restoration }}
        />
        <span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: theme.colors.restoration, marginRight: 6, borderRadius: 2 }} />
        Restoration
      </label>

      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: 4 }}>
        <input
          type="checkbox"
          name="disease"
          checked={isDiseaseHighlighted}
          onChange={(e) => onDiseaseChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: theme.colors.disease }}
        />
        <span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: theme.colors.disease, marginRight: 6, borderRadius: 2 }} />
        Outbreaks
      </label>
      
    </fieldset>
    </div>
  );
}

