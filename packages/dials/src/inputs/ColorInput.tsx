import { useState, useEffect } from "react";
import { AlphaPicker, HuePicker } from "react-color";
import tinycolor from "tinycolor2";
import { ColorFormat, formatColor, getColorInfo } from "../utils";

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ value, onChange }: ColorInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const color = tinycolor(value);
  const [localColor, setLocalColor] = useState(color);
  const [selectedFormat, setSelectedFormat] = useState<ColorFormat>("hex");

  // Sync localColor with value prop changes
  useEffect(() => {
    const newColor = tinycolor(value);
    if (newColor.isValid()) {
      setLocalColor(newColor);
    }
  }, [value]);

  const handleColorChange = (newColor: tinycolor.Instance) => {
    setLocalColor(newColor);
    onChange(formatColor(newColor, selectedFormat));
  };

  const handleFormatChange = (format: ColorFormat) => {
    setSelectedFormat(format);
    onChange(formatColor(localColor, format));
  };

  const colorInfo = getColorInfo(localColor);

  return (
    <div
      className={`dials-color-input ${isOpen ? "dials-color-input-open" : ""}`}
    >
      <div className="dials-color-preview">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const newColor = tinycolor(e.target.value);
            if (newColor.isValid()) {
              handleColorChange(newColor);
            }
          }}
          className="dials-input"
        />
        <div
          className="dials-color-swatch"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            backgroundColor: localColor.toString(),
            boxShadow: `0 0 0 1px ${localColor.isDark() ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
          }}
        />
      </div>

      {isOpen && (
        <div className="dials-color-controls">
          <div className="dials-color-sliders">
            <div className="dials-color-hue">
              <HuePicker
                color={localColor.toRgb()}
                onChange={(color) => handleColorChange(tinycolor(color.hex))}
              />
            </div>
            <div className="dials-color-alpha">
              <AlphaPicker
                color={localColor.toRgb()}
                onChange={(color) => handleColorChange(tinycolor({ ...color.rgb }))}
              />
            </div>
          </div>

          <div className="dials-color-info">
            <div className="dials-color-format-selector">
              {(["hex", "rgba", "hsla", "oklch"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => handleFormatChange(format)}
                  className={`dials-color-format-button ${
                    selectedFormat === format
                      ? "dials-color-format-button-active"
                      : ""
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="dials-color-format">
              {Object.entries(colorInfo).map(([format, value]) => (
                <div key={format} className="dials-color-format-value">
                  <span className="dials-color-format-label">{format}:</span>
                  <span className="dials-color-format-text">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
