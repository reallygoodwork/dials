import { createRoot } from "react-dom/client";
import { useDialsStore } from "./store";
import { getVariableType } from "./utils";
import { ColorInput } from "./inputs/ColorInput";
import { NumberInput } from "./inputs/NumberInput";
import { injectFontStyles } from "./fonts";
import css from "./styles.css?inline";
import { injectThemeVariables } from "./themeVariables";
import { useState } from "react";
let root: ReturnType<typeof createRoot> | null = null;
let shadowRoot: ShadowRoot | null = null;

function Panel() {
  const variables = useDialsStore((state) => state.variables);
  const updateVariable = useDialsStore((state) => state.updateVariable);
  const resetVariable = useDialsStore((state) => state.resetVariable);
  const resetAllVariables = useDialsStore((state) => state.resetAllVariables);
  const originalValues = useDialsStore((state) => state.originalValues);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'variables' | 'export'>('variables');

  // Store original values on mount - this is now handled by the detection system
  // So we can remove this useEffect as it's handled in index.ts

  const handleCopy = (name: string, value: string) => {
    navigator.clipboard.writeText(`${name}: ${value};`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1200);
  };

  const getChangedVariables = () => {
    return variables.filter(variable => {
      const original = originalValues[variable.name];
      return original !== undefined && variable.value !== original;
    });
  };

  const handleExportCopy = (format: 'css' | 'json') => {
    const changedVars = getChangedVariables();
    let exportText = '';

    if (format === 'css') {
      exportText = ':root {\n' +
        changedVars.map(v => `  ${v.name}: ${v.value};`).join('\n') +
        '\n}';
    } else if (format === 'json') {
      const jsonObj = changedVars.reduce((acc, v) => {
        acc[v.name] = v.value;
        return acc;
      }, {} as Record<string, string>);
      exportText = JSON.stringify(jsonObj, null, 2);
    }

    navigator.clipboard.writeText(exportText);
    setCopied(`export-${format}`);
    setTimeout(() => setCopied(null), 1200);
  };

  const renderInput = (variable: { name: string; value: string }) => {
    const type = getVariableType(variable.value);

    switch (type) {
      case "color":
        return (
          <ColorInput
            value={variable.value}
            onChange={(value) => updateVariable(variable.name, value)}
          />
        );
      case "number":
        return (
          <NumberInput
            value={variable.value}
            onChange={(value) => updateVariable(variable.name, value)}
          />
        );
      default:
        return (
          <input
            type="text"
            value={variable.value}
            onChange={(e) => updateVariable(variable.name, e.target.value)}
            className="dials-input"
          />
        );
    }
  };

  const changedVariables = getChangedVariables();

  return (
    <div className="dials-panel">
      <header className="dials-panel-header">
        <h2 className="dials-title">CSS Variables</h2>
        <div className="dials-tabs">
          <button
            className={`dials-tab ${activeTab === 'variables' ? 'dials-tab-active' : ''}`}
            onClick={() => setActiveTab('variables')}
          >
            Variables {changedVariables.length > 0 && <span className="dials-tab-badge">{changedVariables.length}</span>}
          </button>
          <button
            className={`dials-tab ${activeTab === 'export' ? 'dials-tab-active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>
      </header>

      {activeTab === 'variables' && (
        <div className="dials-list">
          {variables.map((variable) => {
            const original = originalValues[variable.name];
            const changed = original !== undefined && variable.value !== original;
            return (
              <div
                className="dials-item"
                key={variable.name}
                style={{ background: changed ? 'rgba(173,250,29,0.08)' : undefined }}
              >
                <div className="dials-item-header">
                  <label className="dials-label">
                    {variable.name}
                    {changed && (
                      <span style={{ color: 'var(--dials-accent)', marginLeft: 4, fontWeight: 700 }} title="Changed">*</span>
                    )}
                  </label>
                  <div className="dials-item-actions">
                    {changed && (
                      <button
                        className="dials-reset-btn"
                        onClick={() => resetVariable(variable.name)}
                        aria-label="Reset variable"
                        title="Reset to original value"
                      >
                        ↺
                      </button>
                    )}
                    <button
                      className="dials-copy-btn"
                      onClick={() => handleCopy(variable.name, variable.value)}
                      aria-label="Copy variable"
                    >
                      {copied === variable.name ? 'Copied!' : '⧉'}
                    </button>
                  </div>
                </div>
                <div className="dials-item-input">
                  {renderInput(variable)}
                  {changed && (
                    <div className="dials-original-value">
                      {original}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="dials-export">
          {changedVariables.length === 0 ? (
            <div className="dials-export-empty">
              <p>No changes to export</p>
              <p className="dials-export-empty-sub">Modify some variables to see export options</p>
            </div>
          ) : (
            <>
              <div className="dials-export-header">
                <h3 className="dials-export-title">Changed Variables ({changedVariables.length})</h3>
              </div>

              <div className="dials-export-actions">
                <button
                  className="dials-export-btn"
                  onClick={() => handleExportCopy('css')}
                >
                  {copied === 'export-css' ? 'Copied!' : 'Copy as CSS'}
                </button>
                <button
                  className="dials-export-btn"
                  onClick={() => handleExportCopy('json')}
                >
                  {copied === 'export-json' ? 'Copied!' : 'Copy as JSON'}
                </button>
                <button
                  className="dials-export-btn dials-reset-all-btn"
                  onClick={resetAllVariables}
                >
                  Reset All Changes
                </button>
              </div>

              <div className="dials-export-preview">
                <h4 className="dials-export-preview-title">CSS Preview:</h4>
                <pre className="dials-export-code">
{`:root {
${changedVariables.map(v => `  ${v.name}: ${v.value};`).join('\n')}
}`}
                </pre>
              </div>

              <div className="dials-export-list">
                {changedVariables.map((variable) => {
                  const original = originalValues[variable.name];
                  return (
                    <div key={variable.name} className="dials-export-item">
                      <div className="dials-export-item-header">
                        <span className="dials-export-var-name">{variable.name}</span>
                        <div className="dials-export-item-actions">
                          <button
                            className="dials-reset-btn"
                            onClick={() => resetVariable(variable.name)}
                            aria-label="Reset variable"
                            title="Reset to original value"
                          >
                            ↺
                          </button>
                          <button
                            className="dials-copy-btn"
                            onClick={() => handleCopy(variable.name, variable.value)}
                            aria-label="Copy variable"
                          >
                            {copied === variable.name ? 'Copied!' : '⧉'}
                          </button>
                        </div>
                      </div>
                      <div className="dials-export-item-values">
                        <div className="dials-export-new-value">{variable.value}</div>
                        <div className="dials-export-old-value">was: {original}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function mountPanel() {
  const container = document.getElementById("dials-panel");
  if (container) {
    if (!shadowRoot) {
      shadowRoot = container.attachShadow({ mode: "open" });
      // Inject theme variables with actual values from the light DOM
      injectThemeVariables(shadowRoot);
      // Inject font styles
      injectFontStyles(shadowRoot);
      // Inject styles into shadow root
      const style = document.createElement("style");
      style.textContent = css;
      shadowRoot.appendChild(style);
    }
    if (!root) {
      root = createRoot(shadowRoot);
    }
    root.render(<Panel />);
  }
}
