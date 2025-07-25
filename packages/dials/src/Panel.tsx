import { createRoot } from "react-dom/client";
import { useDialsStore } from "./store";
import { getVariableType, parseMediaQuery, getDetectedMediaQueries, getDetectedSelectorContexts } from "./utils";
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
  const updateContextualVariable = useDialsStore(
    (state) => state.updateContextualVariable
  );
  const resetVariable = useDialsStore((state) => state.resetVariable);
  const resetAllVariables = useDialsStore((state) => state.resetAllVariables);
  const originalValues = useDialsStore((state) => state.originalValues);
  const isUserChanged = useDialsStore((state) => state.isUserChanged);
  const getCurrentActiveContext = useDialsStore(
    (state) => state.getCurrentActiveContext
  );
  const getRewrittenVariables = useDialsStore(
    (state) => state.getRewrittenVariables
  );
  const contextualUserChanges = useDialsStore(
    (state) => state.contextualUserChanges
  );
  const userChanges = useDialsStore((state) => state.userChanges);
  const panelState = useDialsStore((state) => state.panelState);
  const setPanelPosition = useDialsStore((state) => state.setPanelPosition);
  const setCustomPosition = useDialsStore((state) => state.setCustomPosition);
  const setDragging = useDialsStore((state) => state.setDragging);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"variables" | "export">(
    "variables"
  );
  const [selectedContexts, setSelectedContexts] = useState<{
    [variableName: string]: string;
  }>({}); // Track selected context per variable
  const [manuallySelectedContexts, setManuallySelectedContexts] = useState<{
    [variableName: string]: boolean;
  }>({}); // Track which contexts were manually selected
  const [showCopyMenu, setShowCopyMenu] = useState<string | null>(null); // Track which variable's copy menu is open
  const [expandedVariables, setExpandedVariables] = useState<{
    [variableName: string]: boolean;
  }>({}); // Track which contextual variables are expanded
  const [variableActiveTabs, setVariableActiveTabs] = useState<{
    [variableName: string]: "edit" | "copy";
  }>({}); // Track active tab per variable
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);

  // Monitor for context changes (window resize, etc.) to trigger re-renders
  useEffect(() => {
    const updateActiveContexts = () => {
      // Update selected contexts to follow currently active contexts automatically
      const rewrittenVars = getRewrittenVariables();
      const newSelectedContexts: { [variableName: string]: string } = {};

      rewrittenVars.forEach((variable) => {
        // Only auto-update if not manually selected
        if (!manuallySelectedContexts[variable.name]) {
          const currentlyActiveContext = getCurrentActiveContext(variable);
          if (currentlyActiveContext) {
            const activeContextId = currentlyActiveContext.condition || "base";
            newSelectedContexts[variable.name] = activeContextId;
          } else {
            // Check if there's a base context
            const baseContext = variable.contexts.find((c) => !c.condition);
            newSelectedContexts[variable.name] = baseContext ? "base" : "auto";
          }
        } else {
          // Keep the manually selected context
          newSelectedContexts[variable.name] = selectedContexts[variable.name];
        }
      });

      setSelectedContexts(newSelectedContexts);
    };

    updateActiveContexts(); // Initial check

    // Listen for media query changes - dynamically get all media queries from the stylesheets
    const detectedMediaQueries = getDetectedMediaQueries();

    const listeners: MediaQueryList[] = [];
    detectedMediaQueries.forEach(({ query }) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', updateActiveContexts);
      listeners.push(mq);
    });

    // Monitor for selector context changes (like data-theme, class changes)
    const selectorContexts = getDetectedSelectorContexts();
    let domObserver: MutationObserver | null = null;

    if (selectorContexts.length > 0) {
      domObserver = new MutationObserver((mutations) => {
        let shouldUpdate = false;

        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.target === document.documentElement) {
            // Check if any attributes that affect contexts have changed
            const attrName = mutation.attributeName;
            if (attrName && (attrName.startsWith('data-') || attrName === 'class')) {
              shouldUpdate = true;
            }
          }
        });

        if (shouldUpdate) {
          updateActiveContexts();
        }
      });

      domObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-mode', 'data-contrast', 'data-motion'],
        attributeOldValue: true
      });
    }

    return () => {
      listeners.forEach((mq) => mq.removeEventListener('change', updateActiveContexts));
      domObserver?.disconnect();
    };
  }, []);

  // Handle click outside to close copy menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showCopyMenu &&
        !(event.target as Element)?.closest(".dials-copy-container")
      ) {
        setShowCopyMenu(null);
      }
    };

    if (showCopyMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCopyMenu]);

  // Handle click outside to close position dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPositionDropdown &&
        !(event.target as Element)?.closest(".dials-position-controls")
      ) {
        setShowPositionDropdown(false);
      }
    };

    if (showPositionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPositionDropdown]);

  // Drag and drop functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelState.isDragging || !dragStart) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep panel within viewport bounds
      const maxX = window.innerWidth - 420; // panel width
      const maxY = window.innerHeight - 100; // minimum height to keep visible

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      setCustomPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      if (panelState.isDragging) {
        setDragging(false);
        setDragStart(null);
      }
    };

    if (panelState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panelState.isDragging, dragStart, setCustomPosition, setDragging]);

  // Calculate panel position
  const getPanelStyle = (): React.CSSProperties => {
    if (panelState.customPosition) {
      return {
        position: 'fixed',
        left: panelState.customPosition.x,
        top: panelState.customPosition.y,
        right: 'auto',
        bottom: 'auto',
      };
    }

    const baseStyle: React.CSSProperties = {
      position: 'fixed',
    };

    switch (panelState.position) {
      case 'top-left':
        return { ...baseStyle, top: 'var(--dials-offset)', left: 'var(--dials-offset)' };
      case 'top-right':
        return { ...baseStyle, top: 'var(--dials-offset)', right: 'var(--dials-offset)' };
      case 'bottom-left':
        return { ...baseStyle, bottom: 'var(--dials-offset)', left: 'var(--dials-offset)' };
      case 'bottom-right':
        return { ...baseStyle, bottom: 'var(--dials-offset)', right: 'var(--dials-offset)' };
      default:
        return { ...baseStyle, top: 'var(--dials-offset)', right: 'var(--dials-offset)' };
    }
  };

  const handleCopy = (name: string, value: string, context?: string) => {
    const contextSuffix =
      context && context !== "base"
        ? ` (${getContextDisplayName(context, "media")})`
        : "";
    navigator.clipboard.writeText(`${name}: ${value};`);
    setCopied(`${name}${contextSuffix}`);
    setTimeout(() => setCopied(null), 1200);
    setShowCopyMenu(null); // Close the copy menu after copying
  };

  const handleCopyMenuToggle = (variableName: string) => {
    setShowCopyMenu(showCopyMenu === variableName ? null : variableName);
  };

  const toggleVariableExpansion = (variableName: string) => {
    setExpandedVariables((prev) => ({
      ...prev,
      [variableName]: !prev[variableName],
    }));
    // Default to edit tab when expanding
    if (!variableActiveTabs[variableName]) {
      setVariableActiveTabs((prev) => ({
        ...prev,
        [variableName]: "edit",
      }));
    }
  };

  const setVariableActiveTab = (variableName: string, tab: "edit" | "copy") => {
    setVariableActiveTabs((prev) => ({
      ...prev,
      [variableName]: tab,
    }));
  };

  const getVariableChangedContexts = (variableName: string) => {
    const grouped: {
      [contextKey: string]: {
        name: string;
        value: string;
        contextDisplayName: string;
        condition?: string;
      };
    } = {};

    // Check regular user changes (base context)
    if (userChanges[variableName]) {
      grouped["base"] = {
        name: variableName,
        value: userChanges[variableName],
        contextDisplayName: "Base",
      };
    }

    // Check contextual user changes
    if (contextualUserChanges[variableName]) {
      Object.entries(contextualUserChanges[variableName]).forEach(
        ([contextKey, value]) => {
          // Find the original contextual variable to get display info
          const contextualVar = rewrittenVariables.find(
            (v) => v.name === variableName
          );
          const context = contextualVar?.contexts.find(
            (c) => (c.condition || "base") === contextKey
          );

          grouped[contextKey] = {
            name: variableName,
            value,
            contextDisplayName: getContextDisplayName(
              context?.condition,
              context?.conditionType
            ),
            condition: context?.condition,
          };
        }
      );
    }

    return grouped;
  };

  const handleVariableCopy = (variableName: string, format: "css" | "json") => {
    const variableChanges = getVariableChangedContexts(variableName);
    let exportText = "";

    if (format === "css") {
      const groups: string[] = [];

      // Sort contexts so base comes first
      const sortedContextKeys = Object.keys(variableChanges).sort((a, b) => {
        if (a === "base") return -1;
        if (b === "base") return 1;
        return a.localeCompare(b);
      });

      sortedContextKeys.forEach((contextKey) => {
        const variable = variableChanges[contextKey];

        if (contextKey === "base") {
          groups.push(`:root {\n  ${variable.name}: ${variable.value};\n}`);
        } else {
          const condition = variable.condition;
          if (condition) {
            groups.push(
              `@media ${condition} {\n  :root {\n    ${variable.name}: ${variable.value};\n  }\n}`
            );
          }
        }
      });

      exportText = groups.join("\n\n");
    } else if (format === "json") {
      const jsonObj: {
        [contextKey: string]: { [variableName: string]: string };
      } = {};

      Object.entries(variableChanges).forEach(([, variable]) => {
        jsonObj[variable.contextDisplayName] = {
          [variable.name]: variable.value,
        };
      });

      exportText = JSON.stringify(jsonObj, null, 2);
    }

    navigator.clipboard.writeText(exportText);
    setCopied(`${variableName}-export-${format}`);
    setTimeout(() => setCopied(null), 1200);
  };

  const getCopyableContexts = (variableName: string) => {
    const contexts = [];

    // Add base context if it has a value (either original or user-changed)
    const baseValue = userChanges[variableName] || originalValues[variableName];
    if (baseValue) {
      contexts.push({
        key: "base",
        displayName: "Base",
        value: baseValue,
        condition: undefined,
        isUserChanged: !!userChanges[variableName],
      });
    }

    // Add contextual contexts
    const contextualVar = rewrittenVariables.find(
      (v) => v.name === variableName
    );
    if (contextualVar) {
      contextualVar.contexts.forEach((context) => {
        if (context.condition) {
          // Skip base context as we handle it above
          const contextKey = context.condition;
          const userValue = contextualUserChanges[variableName]?.[contextKey];
          const currentValue = userValue || context.value;

          contexts.push({
            key: contextKey,
            displayName: getContextDisplayName(
              context.condition,
              context.conditionType
            ),
            value: currentValue,
            condition: context.condition,
            isUserChanged: !!userValue,
          });
        }
      });
    }

    return contexts;
  };

  const getChangedVariables = () => {
    return variables.filter((variable) => isUserChanged(variable.name));
  };

  const getContextualChangedVariables = () => {
    const grouped: {
      [contextKey: string]: Array<{
        name: string;
        value: string;
        contextDisplayName: string;
        condition?: string;
      }>;
    } = {};

    // Process regular user changes (base context)
    Object.entries(userChanges).forEach(([name, value]) => {
      if (!grouped["base"]) grouped["base"] = [];
      grouped["base"].push({
        name,
        value,
        contextDisplayName: "Base",
      });
    });

    // Process contextual user changes
    Object.entries(contextualUserChanges).forEach(
      ([variableName, contexts]) => {
        Object.entries(contexts).forEach(([contextKey, value]) => {
          if (!grouped[contextKey]) grouped[contextKey] = [];

          // Find the original contextual variable to get display info
          const contextualVar = rewrittenVariables.find(
            (v) => v.name === variableName
          );
          const context = contextualVar?.contexts.find(
            (c) => (c.condition || "base") === contextKey
          );

          grouped[contextKey].push({
            name: variableName,
            value,
            contextDisplayName: getContextDisplayName(
              context?.condition,
              context?.conditionType
            ),
            condition: context?.condition,
          });
        });
      }
    );

    return grouped;
  };

  const handleExportCopy = (format: "css" | "json") => {
    const contextualChanges = getContextualChangedVariables();
    let exportText = "";

    if (format === "css") {
      const groups: string[] = [];

      // Sort contexts so base comes first, then others
      const sortedContextKeys = Object.keys(contextualChanges).sort((a, b) => {
        if (a === "base") return -1;
        if (b === "base") return 1;
        return a.localeCompare(b);
      });

      sortedContextKeys.forEach((contextKey) => {
        const variables = contextualChanges[contextKey];
        if (variables.length === 0) return;

        if (contextKey === "base") {
          // Base context goes in :root
          groups.push(
            `:root {\n${variables.map((v) => `  ${v.name}: ${v.value};`).join("\n")}\n}`
          );
        } else {
          // Contextual changes go in media queries
          const condition = variables[0].condition;
          if (condition) {
            groups.push(
              `@media ${condition} {\n  :root {\n${variables.map((v) => `    ${v.name}: ${v.value};`).join("\n")}\n  }\n}`
            );
          }
        }
      });

      exportText = groups.join("\n\n");
    } else if (format === "json") {
      const jsonObj: {
        [contextKey: string]: { [variableName: string]: string };
      } = {};

      Object.entries(contextualChanges).forEach(([contextKey, variables]) => {
        const contextDisplayName =
          variables[0]?.contextDisplayName || contextKey;
        jsonObj[contextDisplayName] = variables.reduce(
          (acc, v) => {
            acc[v.name] = v.value;
            return acc;
          },
          {} as Record<string, string>
        );
      });

      exportText = JSON.stringify(jsonObj, null, 2);
    }

    navigator.clipboard.writeText(exportText);
    setCopied(`export-${format}`);
    setTimeout(() => setCopied(null), 1200);
  };

  const renderInput = (
    variable: { name: string; value: string },
    isContextual = false,
    contextOverride?: string
  ) => {
    const type = getVariableType(variable.value);

    const handleChange = (value: string) => {
      if (isContextual) {
        updateContextualVariable(
          variable.name,
          value,
          undefined,
          contextOverride
        );
      } else {
        updateVariable(variable.name, value);
      }
    };

    switch (type) {
      case "color":
        return <ColorInput value={variable.value} onChange={handleChange} />;
      case "number":
        return <NumberInput value={variable.value} onChange={handleChange} />;
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

  const getContextDisplayName = (
    condition: string | undefined,
    conditionType: string | undefined
  ) => {
    if (!condition) return "Base";

    if (conditionType === "media") {
      if (condition.includes("max-width: 768px")) return "Mobile";
      if (
        condition.includes("min-width: 769px") &&
        condition.includes("max-width: 1024px")
      )
        return "Tablet";
      if (condition.includes("min-width: 1400px")) return "Large Screen";
      if (condition.includes("prefers-color-scheme: dark")) return "Dark Theme";
      if (condition.includes("prefers-contrast: high")) return "High Contrast";
      if (condition.includes("prefers-reduced-motion")) return "Reduced Motion";
      if (condition.includes("print")) return "Print";
    }

    return parseMediaQuery(condition);
  };

  const isContextCurrentlyActive = (context: any) => {
    if (!context.condition) {
      // Base context is always "active" in the sense that it's the fallback
      return true;
    }

    if (context.conditionType === "media") {
      return window.matchMedia(context.condition).matches;
    }

    return false;
  };

  // Function to get the current value for a context, including user edits
  const getCurrentValueForContext = (variableName: string, context: any) => {
    // Check for contextual user changes first
    if (contextualUserChanges[variableName]) {
      const contextKey = context.condition || "base";
      const editedValue = contextualUserChanges[variableName][contextKey];
      if (editedValue !== undefined) {
        return editedValue;
      }
    }

    // Check for regular user changes (for base context)
    if (!context.condition && userChanges[variableName]) {
      return userChanges[variableName];
    }

    // Fall back to original value
    return context.value;
  };

  // Function to check if a specific context for a variable has been changed
  const hasSpecificContextChanged = (variableName: string, context: any) => {
    const currentValue = getCurrentValueForContext(variableName, context);
    return currentValue !== context.value;
  };

  const changedVariables = getChangedVariables();
  const rewrittenVariables = getRewrittenVariables();

  // Function to get unified variables list with context awareness
  const getUnifiedVariables = () => {
    const contextualMap = new Map();
    rewrittenVariables.forEach((variable) => {
      contextualMap.set(variable.name, variable);
    });

    return variables.map((variable) => {
      const contextualVar = contextualMap.get(variable.name);
      if (contextualVar) {
        // This variable has contextual versions
        return {
          ...variable,
          isContextual: true,
          contextualVariable: contextualVar,
        };
      }

      return {
        ...variable,
        isContextual: false,
        contextualVariable: null,
      };
    });
  };

  const unifiedVariables = getUnifiedVariables();

  return (
    <div className="dials-panel" style={getPanelStyle()}>
      <header className="dials-panel-header">
        <div className="dials-panel-title-row">
          <h2 className="dials-title" onMouseDown={handleMouseDown}>CSS Variables</h2>
          <div className="dials-position-controls">
            {/* <button
              className="dials-position-btn"
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              title="Change position"
            >
              📍
            </button> */}
            {showPositionDropdown && (
              <div className="dials-position-dropdown">
                <button
                  className={`dials-position-option ${panelState.position === 'top-left' ? 'active' : ''}`}
                  onClick={() => {
                    setPanelPosition('top-left');
                    setShowPositionDropdown(false);
                  }}
                >
                  ↖️ Top Left
                </button>
                <button
                  className={`dials-position-option ${panelState.position === 'top-right' ? 'active' : ''}`}
                  onClick={() => {
                    setPanelPosition('top-right');
                    setShowPositionDropdown(false);
                  }}
                >
                  ↗️ Top Right
                </button>
                <button
                  className={`dials-position-option ${panelState.position === 'bottom-left' ? 'active' : ''}`}
                  onClick={() => {
                    setPanelPosition('bottom-left');
                    setShowPositionDropdown(false);
                  }}
                >
                  ↙️ Bottom Left
                </button>
                <button
                  className={`dials-position-option ${panelState.position === 'bottom-right' ? 'active' : ''}`}
                  onClick={() => {
                    setPanelPosition('bottom-right');
                    setShowPositionDropdown(false);
                  }}
                >
                  ↘️ Bottom Right
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="dials-tabs">
          <button
            className={`dials-tab ${activeTab === "variables" ? "dials-tab-active" : ""}`}
            onClick={() => setActiveTab("variables")}
          >
            Variables{" "}
            {changedVariables.length > 0 && (
              <span className="dials-tab-badge">{changedVariables.length}</span>
            )}
          </button>
          <button
            className={`dials-tab ${activeTab === "export" ? "dials-tab-active" : ""}`}
            onClick={() => setActiveTab("export")}
          >
            Export
          </button>
        </div>
      </header>

      {activeTab === "variables" && (
        <div className="dials-list">
          {unifiedVariables.map((variable) => {
            const userChanged = isUserChanged(variable.name);
            const isContextualVar = variable.isContextual;

            if (
              isContextualVar &&
              variable.contextualVariable &&
              variable.contextualVariable.contexts.length > 1
            ) {
              // Render contextual variable with tabs (only if multiple contexts exist)
              const contextualVar = variable.contextualVariable;

              // Get unique contexts and deduplicate
              const uniqueContexts = [];
              const baseContext = contextualVar.contexts.find(
                (c: any) => !c.condition
              );
              const conditionalContexts = contextualVar.contexts.filter(
                (c: any) => c.condition
              );

              if (baseContext) {
                uniqueContexts.push({ ...baseContext, contextId: "base" });
              }

              const seenConditions = new Set();
              conditionalContexts.forEach((context: any) => {
                if (!seenConditions.has(context.condition)) {
                  seenConditions.add(context.condition);
                  uniqueContexts.push({
                    ...context,
                    contextId: context.condition,
                  });
                }
              });

              // Get currently active context for this variable
              const currentlyActiveContext =
                getCurrentActiveContext(contextualVar);

              // Determine the active context ID
              let activeContextId;
              if (currentlyActiveContext) {
                activeContextId = currentlyActiveContext.condition || "base";
              } else {
                activeContextId = baseContext ? "base" : "auto";
              }

              // Use manually selected context if set, otherwise follow the active context
              const selectedContext =
                selectedContexts[variable.name] || activeContextId;
              let activeContext;
              let currentValue;

              if (selectedContext === "auto") {
                activeContext = getCurrentActiveContext(contextualVar);
                currentValue = activeContext
                  ? getCurrentValueForContext(variable.name, activeContext)
                  : variable.value;
              } else {
                const selectedContextObj = uniqueContexts.find(
                  (c) =>
                    (selectedContext === "base" && !c.condition) ||
                    c.condition === selectedContext
                );
                activeContext = selectedContextObj;
                currentValue = selectedContextObj
                  ? getCurrentValueForContext(variable.name, selectedContextObj)
                  : variable.value;
              }

              return (
                <div
                  className={`dials-item dials-contextual-item ${userChanged ? "dials-contextual-item-changed" : ""}`}
                  key={variable.name}

                >
                  <div className="dials-item-header">
                    <label className="dials-label">
                      {variable.name}
                      {userChanged && (
                        <span
                          style={{
                            color: "var(--dials-accent)",
                            marginLeft: 4,
                            fontWeight: 700,
                          }}
                          title="Changed by user"
                        >
                          *
                        </span>
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
                        className="dials-expand-btn"
                        onClick={() => toggleVariableExpansion(variable.name)}
                        aria-label={
                          expandedVariables[variable.name]
                            ? "Collapse"
                            : "Expand"
                        }
                        title={
                          expandedVariables[variable.name]
                            ? "Collapse"
                            : "Show copy options"
                        }
                      >
                        {expandedVariables[variable.name] ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Variable Tabs - Only show when expanded */}
                  {expandedVariables[variable.name] && (
                    <div className="dials-variable-tabs">
                      <div className="dials-variable-tabs-header">
                        <button
                          className={`dials-tab ${(variableActiveTabs[variable.name] || "edit") === "edit" ? "dials-tab-active" : ""}`}
                          onClick={() =>
                            setVariableActiveTab(variable.name, "edit")
                          }
                        >
                          Edit
                        </button>
                        <button
                          className={`dials-tab ${variableActiveTabs[variable.name] === "copy" ? "dials-tab-active" : ""}`}
                          onClick={() =>
                            setVariableActiveTab(variable.name, "copy")
                          }
                        >
                          Copy
                        </button>
                      </div>

                      {(variableActiveTabs[variable.name] || "edit") ===
                        "edit" && (
                        <div className="dials-context-tabs">
                          <div className="dials-context-tabs-header">
                            {/* Only show Auto tab if there's no Base context (to avoid redundancy) */}
                            {!baseContext && (
                              <button
                                className={`dials-context-tab ${selectedContext === "auto" ? "active" : ""}`}
                                onClick={() => {
                                  setSelectedContexts((prev) => ({
                                    ...prev,
                                    [variable.name]: "auto",
                                  }));
                                  setManuallySelectedContexts((prev) => ({
                                    ...prev,
                                    [variable.name]: true,
                                  }));
                                }}
                              >
                                Auto
                                {selectedContext === "auto" && (
                                  <span className="dials-context-tab-indicator">
                                    (
                                    {getContextDisplayName(
                                      activeContext?.condition,
                                      activeContext?.conditionType
                                    )}
                                    )
                                  </span>
                                )}
                              </button>
                            )}
                            {uniqueContexts.map(
                              (context: any, index: number) => {
                                const displayName = getContextDisplayName(
                                  context.condition,
                                  context.conditionType
                                );
                                const contextId = context.contextId;
                                const isSelected =
                                  selectedContext === contextId;
                                const isCurrentlyActive =
                                  isContextCurrentlyActive(context);
                                const isActiveInBrowser =
                                  activeContextId === contextId;

                                return (
                                  <button
                                    key={index}
                                    className={`dials-context-tab ${isSelected ? "active" : ""} ${isActiveInBrowser ? "currently-active" : ""} ${!isCurrentlyActive && context.condition ? "inactive-context" : ""}`}
                                    onClick={() => {
                                      setSelectedContexts((prev) => ({
                                        ...prev,
                                        [variable.name]: contextId,
                                      }));
                                      setManuallySelectedContexts((prev) => ({
                                        ...prev,
                                        [variable.name]: true,
                                      }));
                                    }}
                                    title={
                                      isActiveInBrowser
                                        ? `${displayName} - Currently active in browser`
                                        : isCurrentlyActive
                                          ? `Edit ${displayName} context`
                                          : `${displayName} context is not currently active in browser`
                                    }
                                  >
                                    {displayName}
                                    {isActiveInBrowser && (
                                      <span className="dials-context-active-indicator">
                                        ●
                                      </span>
                                    )}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          <div className="dials-context-tab-content">
                            {/* Show warning for non-active contexts */}
                            {selectedContext !== "auto" &&
                              (() => {
                                const selectedContextObj = uniqueContexts.find(
                                  (c) =>
                                    (selectedContext === "base" &&
                                      !c.condition) ||
                                    c.condition === selectedContext
                                );
                                const isCurrentlyActive = selectedContextObj
                                  ? isContextCurrentlyActive(selectedContextObj)
                                  : false;

                                if (
                                  !isCurrentlyActive &&
                                  selectedContextObj?.condition
                                ) {
                                  return (
                                    <div className="dials-context-warning">
                                      <span className="dials-context-warning-icon">
                                        ⚠️
                                      </span>
                                      This context is not currently active in
                                      your browser. Changes won't be visible
                                      until the context becomes active.
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                            {renderInput(
                              { name: variable.name, value: currentValue },
                              true,
                              selectedContext === "auto"
                                ? activeContext?.condition || "base"
                                : selectedContext
                            )}

                            {/* Show value comparison */}
                            {uniqueContexts.length > 1 && (
                              <div className="dials-context-comparison">
                                {uniqueContexts.map(
                                  (context: any, index: number) => {
                                    const displayName = getContextDisplayName(
                                      context.condition,
                                      context.conditionType
                                    );
                                    const isCurrentContext =
                                      selectedContext === "auto"
                                        ? context === activeContext
                                        : (selectedContext === "base" &&
                                            !context.condition) ||
                                          selectedContext === context.condition;
                                    const currentValue =
                                      getCurrentValueForContext(
                                        variable.name,
                                        context
                                      );
                                    const hasContextChanged =
                                      hasSpecificContextChanged(
                                        variable.name,
                                        context
                                      );

                                    return (
                                      <div
                                        key={index}
                                        className={`dials-context-value ${isCurrentContext ? "current" : ""} ${hasContextChanged ? "changed" : ""}`}
                                      >
                                        <span className="dials-context-value-label">
                                          {displayName}:
                                        </span>
                                        <span className="dials-context-value-text">
                                          {hasContextChanged ? (
                                            <>
                                              <span className="dials-context-original-value">
                                                {context.value}
                                              </span>
                                              <span className="dials-context-arrow">
                                                →
                                              </span>
                                              <span className="dials-context-new-value">
                                                {currentValue}
                                              </span>
                                            </>
                                          ) : (
                                            currentValue
                                          )}
                                        </span>
                                        {/* Show color swatch for color values */}
                                        {getVariableType(currentValue) ===
                                          "color" && (
                                          <div className="dials-context-color-swatches">
                                            {hasContextChanged && (
                                              <div
                                                className="dials-context-color-swatch dials-context-color-swatch-original"
                                                style={{
                                                  backgroundColor:
                                                    context.value,
                                                }}
                                                title={`Original: ${context.value}`}
                                              />
                                            )}
                                            <div
                                              className="dials-context-color-swatch"
                                              style={{
                                                backgroundColor: currentValue,
                                              }}
                                              title={`Current: ${currentValue}`}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {variableActiveTabs[variable.name] === "copy" && (
                        <div className="dials-variable-copy">
                          {(() => {
                            const variableChanges = getVariableChangedContexts(
                              variable.name
                            );
                            const hasChanges =
                              Object.keys(variableChanges).length > 0;

                            return hasChanges ? (
                              <>
                                <div className="dials-variable-copy-actions">
                                  <button
                                    className="dials-export-btn"
                                    onClick={() =>
                                      handleVariableCopy(variable.name, "css")
                                    }
                                  >
                                    {copied === `${variable.name}-export-css`
                                      ? "Copied!"
                                      : "Copy as CSS"}
                                  </button>
                                  <button
                                    className="dials-export-btn"
                                    onClick={() =>
                                      handleVariableCopy(variable.name, "json")
                                    }
                                  >
                                    {copied === `${variable.name}-export-json`
                                      ? "Copied!"
                                      : "Copy as JSON"}
                                  </button>
                                </div>

                                <div className="dials-variable-copy-preview">
                                  <h4 className="dials-export-preview-title">
                                    CSS Preview:
                                  </h4>
                                  <pre className="dials-export-code">
                                    {(() => {
                                      const groups: string[] = [];
                                      const sortedContextKeys = Object.keys(
                                        variableChanges
                                      ).sort((a, b) => {
                                        if (a === "base") return -1;
                                        if (b === "base") return 1;
                                        return a.localeCompare(b);
                                      });

                                      sortedContextKeys.forEach(
                                        (contextKey) => {
                                          const variable =
                                            variableChanges[contextKey];

                                          if (contextKey === "base") {
                                            groups.push(
                                              `:root {\n  ${variable.name}: ${variable.value};\n}`
                                            );
                                          } else {
                                            const condition =
                                              variable.condition;
                                            if (condition) {
                                              groups.push(
                                                `@media ${condition} {\n  :root {\n    ${variable.name}: ${variable.value};\n  }\n}`
                                              );
                                            }
                                          }
                                        }
                                      );

                                      return groups.join("\n\n");
                                    })()}
                                  </pre>
                                </div>

                                <div className="dials-variable-copy-list">
                                  {Object.entries(variableChanges)
                                    .sort(([a], [b]) => {
                                      if (a === "base") return -1;
                                      if (b === "base") return 1;
                                      return a.localeCompare(b);
                                    })
                                    .map(([contextKey, variableData]) => (
                                      <div
                                        key={contextKey}
                                        className="dials-export-context-group"
                                      >
                                        <div className="dials-export-context-header">
                                          <h4 className="dials-export-context-title">
                                            {variableData.contextDisplayName}
                                            {contextKey !== "base" && (
                                              <span className="dials-export-context-condition">
                                                {variableData.condition}
                                              </span>
                                            )}
                                          </h4>
                                        </div>

                                        <div className="dials-export-item">
                                          <div className="dials-export-item-header">
                                            <span className="dials-export-var-name">
                                              {variableData.name}
                                            </span>
                                            <div className="dials-export-item-actions">
                                              <button
                                                className="dials-copy-btn"
                                                onClick={() =>
                                                  handleCopy(
                                                    variableData.name,
                                                    variableData.value,
                                                    variableData.condition
                                                  )
                                                }
                                                aria-label="Copy variable"
                                              >
                                                {copied?.startsWith(
                                                  variableData.name
                                                )
                                                  ? "Copied!"
                                                  : "⧉"}
                                              </button>
                                            </div>
                                          </div>
                                          <div className="dials-export-item-values">
                                            <div className="dials-export-new-value">
                                              {variableData.value}
                                            </div>
                                            <div className="dials-export-old-value">
                                              was:{" "}
                                              {
                                                originalValues[
                                                  variableData.name
                                                ]
                                              }
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </>
                            ) : (
                              <div className="dials-export-empty">
                                <p>No changes to copy</p>
                                <p className="dials-export-empty-sub">
                                  Modify this variable to see copy options
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            } else {
              // Render regular variable
              return (
                <div
                  className="dials-item"
                  key={variable.name}
                  style={{
                    background: userChanged
                      ? "rgba(173,250,29,0.08)"
                      : undefined,
                  }}
                >
                  <div className="dials-item-header">
                    <label className="dials-label">
                      {variable.name}
                      {userChanged && (
                        <span
                          style={{
                            color: "var(--dials-accent)",
                            marginLeft: 4,
                            fontWeight: 700,
                          }}
                          title="Changed by user"
                        >
                          *
                        </span>
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
                      <div className="dials-copy-container">
                        <button
                          className="dials-copy-btn"
                          onClick={() => handleCopyMenuToggle(variable.name)}
                          aria-label="Copy variable"
                        >
                          {copied?.startsWith(variable.name) ? "Copied!" : "⧉"}
                        </button>

                        {showCopyMenu === variable.name && (
                          <div className="dials-copy-menu">
                            <div className="dials-copy-menu-header">
                              Copy Value
                            </div>
                            {getCopyableContexts(variable.name).map(
                              (context) => (
                                <button
                                  key={context.key}
                                  className={`dials-copy-menu-item ${context.isUserChanged ? "changed" : ""}`}
                                  onClick={() =>
                                    handleCopy(
                                      variable.name,
                                      context.value,
                                      context.condition
                                    )
                                  }
                                >
                                  <div className="dials-copy-menu-item-header">
                                    <span className="dials-copy-menu-context">
                                      {context.displayName}
                                    </span>
                                    {context.isUserChanged && (
                                      <span className="dials-copy-menu-changed-indicator">
                                        *
                                      </span>
                                    )}
                                  </div>
                                  <div className="dials-copy-menu-value">
                                    {getVariableType(context.value) ===
                                      "color" && (
                                      <div
                                        className="dials-copy-menu-color-swatch"
                                        style={{
                                          backgroundColor: context.value,
                                        }}
                                      />
                                    )}
                                    <code>{context.value}</code>
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Regular variable expanded content */}
                  {expandedVariables[variable.name] && (
                    <div className="dials-variable-tabs">
                      <div className="dials-variable-tabs-header">
                        <button
                          className={`dials-tab ${(variableActiveTabs[variable.name] || "edit") === "edit" ? "dials-tab-active" : ""}`}
                          onClick={() =>
                            setVariableActiveTab(variable.name, "edit")
                          }
                        >
                          Edit
                        </button>
                        <button
                          className={`dials-tab ${variableActiveTabs[variable.name] === "copy" ? "dials-tab-active" : ""}`}
                          onClick={() =>
                            setVariableActiveTab(variable.name, "copy")
                          }
                        >
                          Copy
                        </button>
                      </div>

                      {(variableActiveTabs[variable.name] || "edit") ===
                        "edit" && (
                        <div className="dials-item-input">
                          {renderInput(variable)}
                          {userChanged && (
                            <div className="dials-original-value">
                              was: {originalValues[variable.name]}
                            </div>
                          )}
                        </div>
                      )}

                      {variableActiveTabs[variable.name] === "copy" && (
                        <div className="dials-variable-copy">
                          {(() => {
                            const variableChanges = getVariableChangedContexts(
                              variable.name
                            );
                            const hasChanges =
                              Object.keys(variableChanges).length > 0;

                            return hasChanges ? (
                              <>
                                <div className="dials-variable-copy-actions">
                                  <button
                                    className="dials-export-btn"
                                    onClick={() =>
                                      handleVariableCopy(variable.name, "css")
                                    }
                                  >
                                    {copied === `${variable.name}-export-css`
                                      ? "Copied!"
                                      : "Copy as CSS"}
                                  </button>
                                  <button
                                    className="dials-export-btn"
                                    onClick={() =>
                                      handleVariableCopy(variable.name, "json")
                                    }
                                  >
                                    {copied === `${variable.name}-export-json`
                                      ? "Copied!"
                                      : "Copy as JSON"}
                                  </button>
                                </div>

                                <div className="dials-variable-copy-preview">
                                  <h4 className="dials-export-preview-title">
                                    CSS Preview:
                                  </h4>
                                  <pre className="dials-export-code">
                                    {`:root {
  ${variable.name}: ${variable.value};
}`}
                                  </pre>
                                </div>

                                <div className="dials-variable-copy-list">
                                  <div className="dials-export-context-group">
                                    <div className="dials-export-context-header">
                                      <h4 className="dials-export-context-title">
                                        Base
                                      </h4>
                                    </div>

                                    <div className="dials-export-item">
                                      <div className="dials-export-item-header">
                                        <span className="dials-export-var-name">
                                          {variable.name}
                                        </span>
                                        <div className="dials-export-item-actions">
                                          <button
                                            className="dials-copy-btn"
                                            onClick={() =>
                                              handleCopy(
                                                variable.name,
                                                variable.value
                                              )
                                            }
                                            aria-label="Copy variable"
                                          >
                                            {copied?.startsWith(variable.name)
                                              ? "Copied!"
                                              : "⧉"}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="dials-export-item-values">
                                        <div className="dials-export-new-value">
                                          {variable.value}
                                        </div>
                                        <div className="dials-export-old-value">
                                          was: {originalValues[variable.name]}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="dials-export-empty">
                                <p>No changes to copy</p>
                                <p className="dials-export-empty-sub">
                                  Modify this variable to see copy options
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}

      {activeTab === "export" && (
        <div className="dials-export">
          {(() => {
            const contextualChanges = getContextualChangedVariables();
            const totalChanges = Object.values(contextualChanges).reduce(
              (sum, vars) => sum + vars.length,
              0
            );

            return totalChanges === 0 ? (
              <div className="dials-export-empty">
                <p>No changes to export</p>
                <p className="dials-export-empty-sub">
                  Modify some variables to see export options
                </p>
              </div>
            ) : (
              <>
                <div className="dials-export-header">
                  <h3 className="dials-export-title">
                    Changed Variables ({totalChanges})
                  </h3>
                </div>

                <div className="dials-export-actions">
                  <button
                    className="dials-export-btn"
                    onClick={() => handleExportCopy("css")}
                  >
                    {copied === "export-css" ? "Copied!" : "Copy as CSS"}
                  </button>
                  <button
                    className="dials-export-btn"
                    onClick={() => handleExportCopy("json")}
                  >
                    {copied === "export-json" ? "Copied!" : "Copy as JSON"}
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
                    {(() => {
                      const groups: string[] = [];
                      const sortedContextKeys = Object.keys(
                        contextualChanges
                      ).sort((a, b) => {
                        if (a === "base") return -1;
                        if (b === "base") return 1;
                        return a.localeCompare(b);
                      });

                      sortedContextKeys.forEach((contextKey) => {
                        const variables = contextualChanges[contextKey];
                        if (variables.length === 0) return;

                        if (contextKey === "base") {
                          groups.push(
                            `:root {\n${variables.map((v) => `  ${v.name}: ${v.value};`).join("\n")}\n}`
                          );
                        } else {
                          const condition = variables[0].condition;
                          if (condition) {
                            groups.push(
                              `@media ${condition} {\n  :root {\n${variables.map((v) => `    ${v.name}: ${v.value};`).join("\n")}\n  }\n}`
                            );
                          }
                        }
                      });

                      return groups.join("\n\n");
                    })()}
                  </pre>
                </div>

                <div className="dials-export-list">
                  {Object.entries(contextualChanges)
                    .sort(([a], [b]) => {
                      if (a === "base") return -1;
                      if (b === "base") return 1;
                      return a.localeCompare(b);
                    })
                    .map(([contextKey, variables]) => (
                      <div
                        key={contextKey}
                        className="dials-export-context-group"
                      >
                        <div className="dials-export-context-header">
                          <h4 className="dials-export-context-title">
                            {variables[0]?.contextDisplayName || contextKey}
                            {contextKey !== "base" && (
                              <span className="dials-export-context-condition">
                                {variables[0]?.condition}
                              </span>
                            )}
                          </h4>
                        </div>

                        {variables.map((variable) => {
                          const original = originalValues[variable.name];
                          return (
                            <div
                              key={`${contextKey}-${variable.name}`}
                              className="dials-export-item"
                            >
                              <div className="dials-export-item-header">
                                <span className="dials-export-var-name">
                                  {variable.name}
                                </span>
                                <div className="dials-export-item-actions">
                                  <button
                                    className="dials-reset-btn"
                                    onClick={() => resetVariable(variable.name)}
                                    aria-label="Reset variable"
                                    title="Reset to original value"
                                  >
                                    ↺
                                  </button>
                                  <div className="dials-copy-container">
                                    <button
                                      className="dials-copy-btn"
                                      onClick={() =>
                                        handleCopyMenuToggle(variable.name)
                                      }
                                      aria-label="Copy variable"
                                    >
                                      {copied?.startsWith(variable.name)
                                        ? "Copied!"
                                        : "⧉"}
                                    </button>

                                    {showCopyMenu === variable.name && (
                                      <div className="dials-copy-menu">
                                        <div className="dials-copy-menu-header">
                                          Copy Value
                                        </div>
                                        {getCopyableContexts(variable.name).map(
                                          (context) => (
                                            <button
                                              key={context.key}
                                              className={`dials-copy-menu-item ${context.isUserChanged ? "changed" : ""}`}
                                              onClick={() =>
                                                handleCopy(
                                                  variable.name,
                                                  context.value,
                                                  context.condition
                                                )
                                              }
                                            >
                                              <div className="dials-copy-menu-item-header">
                                                <span className="dials-copy-menu-context">
                                                  {context.displayName}
                                                </span>
                                                {context.isUserChanged && (
                                                  <span className="dials-copy-menu-changed-indicator">
                                                    *
                                                  </span>
                                                )}
                                              </div>
                                              <div className="dials-copy-menu-value">
                                                {getVariableType(
                                                  context.value
                                                ) === "color" && (
                                                  <div
                                                    className="dials-copy-menu-color-swatch"
                                                    style={{
                                                      backgroundColor:
                                                        context.value,
                                                    }}
                                                  />
                                                )}
                                                <code>{context.value}</code>
                                              </div>
                                            </button>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="dials-export-item-values">
                                <div className="dials-export-new-value">
                                  {variable.value}
                                </div>
                                <div className="dials-export-old-value">
                                  was: {original}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </>
            );
          })()}
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
