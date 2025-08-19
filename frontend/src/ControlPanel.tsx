import * as React from "react";

interface ControlPanelProps {
  selectedDepth: string;
  onDepthChange: (newDepth: string) => void;
  selectedTime: string;
  onTimeChange: (newTime: string) => void;
}

const depths = ['05m', '10m', '15m'];
const times = ['00d-07d', '07d-14d', '14d-28d'];

export default function ControlPanel({
  selectedDepth,
  onDepthChange,
  selectedTime,
  onTimeChange,
}: ControlPanelProps) {
  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onDepthChange(String(e.target.value));
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onTimeChange(String(e.target.value));
  

  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 8 }}>ControlPanel</legend>
      {depths.map((d) => (
        <label key={d} style={{ display: "inline-flex", alignItems: "left", marginRight: 12, cursor: "pointer" }}>
          <input
            type="radio"
            name="depth"
            value={d}
            checked={selectedDepth === d}
            onChange={handleDepthChange}
            style={{ marginRight: 6 }}
          />
          {d}
        </label>
      ))}
      {times.map((t) => (
        <label key={t} style={{ display: "inline-flex", alignItems: "right", marginRight: 12, cursor: "pointer" }}>
          <input
            type="radio"
            name="time"
            value={t}
            checked={selectedTime === t}
            onChange={handleTimeChange}
            style={{ marginRight: 6 }}
          />
          {t}
        </label>
      ))}
    </fieldset>
  );
}

