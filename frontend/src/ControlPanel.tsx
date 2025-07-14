import * as React from "react";

interface ControlPanelProps {
  selectedDepth: number;
  onDepthChange: (newDepth: number) => void;
}

const ControlPanel = ({
  selectedDepth,
  onDepthChange,
}: ControlPanelProps) => {
  const handleDepthChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onDepthChange(Number(event.target.value));
  };

  return (
    <div>
      <label htmlFor="depth-select">Depth:</label>
      <select
        id="depth-select"
        value={selectedDepth}
        onChange={handleDepthChange}
      >
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  );
};

export default ControlPanel;

