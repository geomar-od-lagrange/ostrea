import * as React from "react";

interface ControlPanelProps {
  selectedDepth: number;
  onDepthChange: (newDepth: number) => void;
  selectedTime: string;
  onTimeChange: (newTime: string) => void;
}

const depths = [5, 15, 25];
const times = ['0-7', '7-14', '14-28'];

export default function ControlPanel({
  selectedDepth,
  onDepthChange,
  selectedTime,
  onTimeChange,
}: ControlPanelProps) {
  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onDepthChange(Number(e.target.value));
  
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

