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
  const updateVariable = useDialsStore((state) => state.updateVariable);
  const updateContextualVariable = useDialsStore((state) => state.updateContextualVariable);
  const resetVariable = useDialsStore((state) => state.resetVariable);
  const resetAllVariables = useDialsStore((state) => state.resetAllVariables);
  const originalValues = useDialsStore((state) => state.originalValues);
  const isUserChanged = useDialsStore((state) => state.isUserChanged);
  const getCurrentActiveContext = useDialsStore((state) => state.getCurrentActiveContext);
  const getRewrittenVariables = useDialsStore((state) => state.getRewrittenVariables);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'variables' | 'export'>('variables');
  const [selectedContexts, setSelectedContexts] = useState<{[variableName: string]: string}>({}); // Track selected context per variable

  // Monitor for context changes (window resize, etc.) to trigger re-renders
  useEffect(() => {
    const updateActiveContexts = () => {
      // Force re-render by updating a timestamp or counter
      // This ensures the Auto tab indicator updates in real-time
      setSelectedContexts(prev => ({ ...prev }));
    };

    updateActiveContexts(); // Initial check

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
      mq.addListener(updateActiveContexts);
      listeners.push(mq);
    });

    return () => {
      listeners.forEach(mq => mq.removeListener(updateActiveContexts));
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

  const renderInput = (variable: { name: string; value: string }, isContextual = false, contextOverride?: string) => {
    const type = getVariableType(variable.value);

    const handleChange = (value: string) => {
      if (isContextual) {
        updateContextualVariable(variable.name, value, undefined, contextOverride);
      } else {
        updateVariable(variable.name, value);
      }
    };

    switch (type) {
      case "color":
        return (
          <ColorInput
            value={variable.value}
            onChange={handleChange}
          />
        );
      case "number":
        return (
          <NumberInput
            value={variable.value}
            onChange={handleChange}
          />
        );
      default:
        return (
          <input
            type="text"
            value={variable.value}
            onChange={(e) => handleChange(e.target.value)}
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

  const isContextCurrentlyActive = (context: any) => {
    if (!context.condition) {
      // Base context is always "active" in the sense that it's the fallback
      return true;
    }
    
    if (context.conditionType === 'media') {
      return window.matchMedia(context.condition).matches;
    }
    
    return false;
  };

  const changedVariables = getChangedVariables();
  const rewrittenVariables = getRewrittenVariables();


  // Function to get unified variables list with context awareness
  const getUnifiedVariables = () => {
    const contextualMap = new Map();
    rewrittenVariables.forEach(variable => {
      contextualMap.set(variable.name, variable);
    });

    return variables.map(variable => {
      const contextualVar = contextualMap.get(variable.name);
      if (contextualVar) {
        // This variable has contextual versions
        return {
          ...variable,
          isContextual: true,
          contextualVariable: contextualVar
        };
      }

      return {
        ...variable,
        isContextual: false,
        contextualVariable: null
      };
    });
  };

  const unifiedVariables = getUnifiedVariables();

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
            {unifiedVariables.map((variable) => {
              const userChanged = isUserChanged(variable.name);
              const isContextualVar = variable.isContextual;

              if (isContextualVar && variable.contextualVariable) {
                // Render contextual variable with tabs
                const contextualVar = variable.contextualVariable;

                // Get unique contexts and deduplicate
                const uniqueContexts = [];
                const baseContext = contextualVar.contexts.find((c: any) => !c.condition);
                const conditionalContexts = contextualVar.contexts.filter((c: any) => c.condition);

                if (baseContext) {
                  uniqueContexts.push({ ...baseContext, contextId: 'base' });
                }

                const seenConditions = new Set();
                conditionalContexts.forEach((context: any) => {
                  if (!seenConditions.has(context.condition)) {
                    seenConditions.add(context.condition);
                    uniqueContexts.push({ ...context, contextId: context.condition });
                  }
                });

                // Get currently selected context for this variable
                const selectedContext = selectedContexts[variable.name] || 'auto';
                let activeContext;
                let currentValue;

                if (selectedContext === 'auto') {
                  activeContext = getCurrentActiveContext(contextualVar);
                  currentValue = activeContext?.value || variable.value;
                } else {
                  const selectedContextObj = uniqueContexts.find(c =>
                    (selectedContext === 'base' && !c.condition) ||
                    (c.condition === selectedContext)
                  );
                  activeContext = selectedContextObj;
                  currentValue = selectedContextObj?.value || variable.value;
                }

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
                          onClick={() => handleCopy(variable.name, currentValue)}
                          aria-label="Copy variable"
                        >
                          {copied === variable.name ? 'Copied!' : '⧉'}
                        </button>
                      </div>
                    </div>

                    {/* Context Tabs */}
                    <div className="dials-context-tabs">
                      <div className="dials-context-tabs-header">
                        <button
                          className={`dials-context-tab ${selectedContext === 'auto' ? 'active' : ''}`}
                          onClick={() => setSelectedContexts(prev => ({ ...prev, [variable.name]: 'auto' }))}
                        >
                          Auto
                          {selectedContext === 'auto' && (
                            <span className="dials-context-tab-indicator">
                              ({getContextDisplayName(activeContext?.condition, activeContext?.conditionType)})
                            </span>
                          )}
                        </button>
                        {uniqueContexts.map((context: any, index: number) => {
                          const displayName = getContextDisplayName(context.condition, context.conditionType);
                          const contextId = context.contextId;
                          const isActive = selectedContext === contextId;
                          const isCurrentlyActive = isContextCurrentlyActive(context);

                          return (
                            <button
                              key={index}
                              className={`dials-context-tab ${isActive ? 'active' : ''} ${!isCurrentlyActive && context.condition ? 'inactive-context' : ''}`}
                              onClick={() => setSelectedContexts(prev => ({ ...prev, [variable.name]: contextId }))}
                              title={!isCurrentlyActive && context.condition ? `${displayName} context is not currently active in browser` : `Edit ${displayName} context`}
                            >
                              {displayName}
                              {!isCurrentlyActive && context.condition && (
                                <span className="dials-context-inactive-indicator">⚬</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="dials-context-tab-content">
                        {/* Show warning for non-active contexts */}
                        {selectedContext !== 'auto' && (() => {
                          const selectedContextObj = uniqueContexts.find(c => 
                            (selectedContext === 'base' && !c.condition) || 
                            (c.condition === selectedContext)
                          );
                          const isCurrentlyActive = selectedContextObj ? isContextCurrentlyActive(selectedContextObj) : false;
                          
                          if (!isCurrentlyActive && selectedContextObj?.condition) {
                            return (
                              <div className="dials-context-warning">
                                <span className="dials-context-warning-icon">⚠️</span>
                                This context is not currently active in your browser. Changes won't be visible until the context becomes active.
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {renderInput({ name: variable.name, value: currentValue }, true, selectedContext === 'auto' ? undefined : selectedContext)}
                        {userChanged && (
                          <div className="dials-original-value">
                            was: {originalValues[variable.name]}
                          </div>
                        )}

                        {/* Show value comparison */}
                        {uniqueContexts.length > 1 && (
                          <div className="dials-context-comparison">
                            {uniqueContexts.map((context: any, index: number) => {
                              const displayName = getContextDisplayName(context.condition, context.conditionType);
                              const isCurrentContext = selectedContext === 'auto' ?
                                context === activeContext :
                                ((selectedContext === 'base' && !context.condition) || (selectedContext === context.condition));

                              return (
                                <div key={index} className={`dials-context-value ${isCurrentContext ? 'current' : ''}`}>
                                  <span className="dials-context-value-label">{displayName}:</span>
                                  <span className="dials-context-value-text">{context.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Render regular variable
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
              }
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
