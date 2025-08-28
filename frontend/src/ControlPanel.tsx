import * as React from "react";

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
  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDepthChange(toggle(selectedDepths, e.target.value));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(toggle(selectedTimes, e.target.value));
  };

  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 8 }}>ControlPanel</legend>

      {depths.map(d => (
        <label
          key={d}
          style={{
            display: "inline-flex",
            alignItems: "center", // "left/right" isn't valid; use flex-start/center
            marginRight: 12,
            cursor: "pointer",
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

      {times.map(t => (
        <label
          key={t}
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: 12,
            cursor: "pointer",
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
      
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={clearHex} style={{ padding: "6px 10px", borderRadius: 6 }}>
          Clear hex input
        </button>
      </div>
      
      <label style={{ display: "inline-flex", alignItems: "center", marginRight: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="aqc"
          checked={isAQCHighlighted}
          onChange={(e) => onAQCChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: "#16a34a" }}
        />
        Highlight aquacultures
      </label>
      
      <label style={{ display: "inline-flex", alignItems: "center", marginRight: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="rest"
          checked={isRestHighlighted}
          onChange={(e) => onRestChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: "#16a34a" }}
        />
        Highlight restoration sites
      </label>
      
      <label style={{ display: "inline-flex", alignItems: "center", marginRight: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="disease"
          checked={isDiseaseHighlighted}
          onChange={(e) => onDiseaseChange(e.target.checked)}
          style={{ marginRight: 6, accentColor: "#16a34a" }}
        />
        Highlight confirmed outbreaks
      </label>
      
    </fieldset>
  );
}

