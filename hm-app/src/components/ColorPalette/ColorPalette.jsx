import React, { useState } from "react";
import "../styles/palette.css";

export default function ColorPalette({ colors = [], labels = [], onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (idx) => {
    setSelected(idx);
    if (onSelect) onSelect(colors[idx], idx);
  };

  return (
    <div className="palette" role="list">
      {colors.map((c, i) => (
        <button
          key={c + i}
          type="button"
          className={`swatch ${selected === i ? "selected" : ""}`}
          style={{ background: c }}
          aria-label={labels[i] ?? `color ${i + 1}`}
          onClick={() => handleSelect(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleSelect(i);
          }}
        />
      ))}
    </div>
  );
}