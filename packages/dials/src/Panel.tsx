import { createRoot } from "react-dom/client";
import { useDialsStore } from "./store";
import { getVariableType, parseMediaQuery, getCurrentActiveContexts } from "./utils";
import { ColorInput } from "./inputs/ColorInput";
import { NumberInput } from "./inputs/NumberInput";
import { injectFontStyles } from "./fonts";
import css from "./styles.css?inline";
import { injectThemeVariables } from "./themeVariables";
import { useState, useEffect } from "react";
let root: ReturnType<typeof createRoot> | null = null;
let shadowRoot: ShadowRoot | null = null;

function Panel() {
  const variables = useDialsStore((state) => state.variables);
  const contextualVariables = useDialsStore((state) => state.contextualVariables);
  const updateVariable = useDialsStore((state) => state.updateVariable);
  const updateContextualVariable = useDialsStore((state) => state.updateContextualVariable);
  const resetVariable = useDialsStore((state) => state.resetVariable);
  const resetAllVariables = useDialsStore((state) => state.resetAllVariables);
  const originalValues = useDialsStore((state) => state.originalValues);
  const isUserChanged = useDialsStore((state) => state.isUserChanged);
  const getCurrentActiveContext = useDialsStore((state) => state.getCurrentActiveContext);
  const getRewrittenVariables = useDialsStore((state) => state.getRewrittenVariables);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'variables' | 'contextual' | 'export'>('variables');
  const [currentContexts, setCurrentContexts] = useState<string[]>([]);

  // Monitor for context changes (window resize, etc.)
  useEffect(() => {
    const updateContexts = () => {
      setCurrentContexts(getCurrentActiveContexts());
    };

    updateContexts(); // Initial check

    // Listen for media query changes
    const mediaQueries = [
      '(max-width: 768px)',
      '(min-width: 769px) and (max-width: 1024px)',
      '(min-width: 1400px)',
      '(prefers-color-scheme: dark)',
      '(prefers-contrast: high)',
      '(prefers-reduced-motion: reduce)'
    ];

    const listeners: MediaQueryList[] = [];
    mediaQueries.forEach(query => {
      const mq = window.matchMedia(query);
      mq.addListener(updateContexts);
      listeners.push(mq);
    });

    return () => {
      listeners.forEach(mq => mq.removeListener(updateContexts));
    };
  }, []);

  const handleCopy = (name: string, value: string) => {
    navigator.clipboard.writeText(`${name}: ${value};`);
    setCopied(name);
    setTimeout(() => setCopied(null), 1200);
  };

  const getChangedVariables = () => {
    return variables.filter(variable => isUserChanged(variable.name));
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

  const renderInput = (variable: { name: string; value: string }, isContextual = false) => {
    const type = getVariableType(variable.value);
    const updateFn = isContextual ? updateContextualVariable : updateVariable;

    switch (type) {
      case "color":
        return (
          <ColorInput
            value={variable.value}
            onChange={(value) => updateFn(variable.name, value)}
          />
        );
      case "number":
        return (
          <NumberInput
            value={variable.value}
            onChange={(value) => updateFn(variable.name, value)}
          />
        );
      default:
        return (
          <input
            type="text"
            value={variable.value}
            onChange={(e) => updateFn(variable.name, e.target.value)}
            className="dials-input"
          />
        );
    }
  };

  const getContextDisplayName = (condition: string | undefined, conditionType: string | undefined) => {
    if (!condition) return 'Base';

    if (conditionType === 'media') {
      if (condition.includes('max-width: 768px')) return 'Mobile';
      if (condition.includes('min-width: 769px') && condition.includes('max-width: 1024px')) return 'Tablet';
      if (condition.includes('min-width: 1400px')) return 'Large Screen';
      if (condition.includes('prefers-color-scheme: dark')) return 'Dark Theme';
      if (condition.includes('prefers-contrast: high')) return 'High Contrast';
      if (condition.includes('prefers-reduced-motion')) return 'Reduced Motion';
      if (condition.includes('print')) return 'Print';
    }

    return parseMediaQuery(condition);
  };

  const changedVariables = getChangedVariables();
  const rewrittenVariables = getRewrittenVariables();

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
            className={`dials-tab ${activeTab === 'contextual' ? 'dials-tab-active' : ''}`}
            onClick={() => setActiveTab('contextual')}
          >
            Contextual {rewrittenVariables.length > 0 && <span className="dials-tab-badge">{rewrittenVariables.length}</span>}
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
            const userChanged = isUserChanged(variable.name);
            return (
              <div
                className="dials-item"
                key={variable.name}
                style={{ background: userChanged ? 'rgba(173,250,29,0.08)' : undefined }}
              >
                <div className="dials-item-header">
                  <label className="dials-label">
                    {variable.name}
                    {userChanged && (
                      <span style={{ color: 'var(--dials-accent)', marginLeft: 4, fontWeight: 700 }} title="Changed by user">*</span>
                    )}
                  </label>
                  <div className="dials-item-actions">
                    {userChanged && (
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
                  {userChanged && (
                    <div className="dials-original-value">
                      was: {originalValues[variable.name]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'contextual' && (
        <div className="dials-list">
          {rewrittenVariables.length === 0 ? (
            <div className="dials-export-empty">
              <p>No contextual variables found</p>
              <p className="dials-export-empty-sub">Variables that are redefined in media queries or other contexts will appear here</p>
            </div>
          ) : (
            <>
              {currentContexts.length > 1 && (
                <div className="dials-context-info">
                  <p><strong>Active contexts:</strong> {currentContexts.filter(c => c !== 'base').join(', ') || 'base only'}</p>
                  <p className="dials-context-sub">Changes will affect the currently active context</p>
                </div>
              )}

              {rewrittenVariables.map((variable) => {
                const userChanged = isUserChanged(variable.name);
                const activeContext = getCurrentActiveContext(variable);
                const activeContextName = getContextDisplayName(activeContext?.condition, activeContext?.conditionType);

                return (
                  <div
                    className="dials-item dials-contextual-item"
                    key={variable.name}
                    style={{
                      background: userChanged ? 'rgba(173,250,29,0.08)' : 'rgba(59, 130, 246, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <div className="dials-item-header">
                      <label className="dials-label">
                        {variable.name}
                        <span className="dials-context-badge">{activeContextName}</span>
                        {userChanged && (
                          <span style={{ color: 'var(--dials-accent)', marginLeft: 4, fontWeight: 700 }} title="Changed by user">*</span>
                        )}
                      </label>
                      <div className="dials-item-actions">
                        {userChanged && (
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
                      {renderInput(variable, true)}
                      {userChanged && (
                        <div className="dials-original-value">
                          was: {originalValues[variable.name]}
                        </div>
                      )}
                    </div>

                    {/* Context information */}
                    <div className="dials-context-list">
                      <div className="dials-context-title">Available in {variable.contexts.length} context{variable.contexts.length > 1 ? 's' : ''}:</div>
                      {variable.contexts.map((context, index) => {
                        const isActive = context === activeContext;
                        const displayName = getContextDisplayName(context.condition, context.conditionType);

                        return (
                          <div
                            key={index}
                            className={`dials-context-item ${isActive ? 'dials-context-active' : ''}`}
                          >
                            <span className="dials-context-name">{displayName}</span>
                            {isActive && <span className="dials-context-current">← editing</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
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
