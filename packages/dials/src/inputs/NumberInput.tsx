import { useState, useEffect, useRef } from "react";
import { parseNumberWithUnit, clamp } from "../utils";

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

const UNITS = ["px", "rem", "em", "%", "vw", "vh"];
const STEP_OPTIONS = [0.1, 0.25, 0.5, 1, 5, 10, 25];

function getDefaultStep(val: number): number {
  if (Number.isInteger(val)) return 1;
  const decimals = (val.toString().split(".")[1] || "").length;
  if (decimals === 1) return 0.1;
  if (decimals === 2) return 0.01;
  return 1;
}

export function NumberInput({ value, onChange }: NumberInputProps) {
  const parsed = parseNumberWithUnit(value);
  const [localValue, setLocalValue] = useState(parsed?.value || 0);
  const [unit, setUnit] = useState(parsed?.unit || "px");
  const [step, setStep] = useState(() => getDefaultStep(parsed?.value || 0));
  const isFirstRender = useRef(true);

  useEffect(() => {
    const newParsed = parseNumberWithUnit(value);
    if (newParsed) {
      setLocalValue(newParsed.value);
      setUnit(newParsed.unit);
      // Only set step on first render
      if (isFirstRender.current) {
        setStep(getDefaultStep(newParsed.value));
        isFirstRender.current = false;
      }
    }
  }, [value]);

  const handleChange = (newValue: number) => {
    const clampedValue = clamp(newValue, -1000, 1000);
    setLocalValue(clampedValue);
    onChange(`${clampedValue}${unit}`);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setUnit(newUnit);
    onChange(`${localValue}${newUnit}`);
  };

  const handleStepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStep(Number(e.target.value));
  };

  return (
    <div className="dials-number-input">
      <div className="dials-number-controls">
        <button
          type="button"
          className="dials-number-button"
          onClick={() => handleChange(localValue - step)}
        >
          -
        </button>
        <div className="dials-number-input-container">
          <input
            type="number"
            value={localValue}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            className="dials-input"
            step={step}
          />
          <select
            className="dials-number-unit"
            value={unit}
            onChange={handleUnitChange}
            aria-label="Unit"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="dials-number-button"
          onClick={() => handleChange(localValue + step)}
        >
          +
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min="0"
          max="100"
          value={localValue}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="dials-range"
          step={step}
        />
        <select
          value={step}
          onChange={handleStepChange}
          aria-label="Step size"
          style={{ minWidth: 48 }}
        >
          {STEP_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
