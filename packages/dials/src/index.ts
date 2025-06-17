import { mountPanel } from "./Panel";
import { useDialsStore, type CSSVariable } from "./store";
import { detectContextualVariables } from "./utils";

let isInitialized = false;

export function startDials() {
  if (process.env.NODE_ENV !== "development") {
    console.warn("@reallygoodwork/dials is only available in development mode");
    return;
  }

    if (isInitialized) {
    return {
      store: useDialsStore,
      updateVariable: (name: string, value: string) => {
        document.documentElement.style.setProperty(name, value);
        useDialsStore.getState().updateVariable(name, value);
      },
    };
  }

  // Initialize the panel
  const panel = document.createElement("div");
  panel.id = "dials-panel";
  document.body.appendChild(panel);

  // Mount the React panel
  mountPanel();

    // Function to detect CSS variables from the host page
  const detectCSSVariables = () => {
    // Use the new contextual detection
    const contextualVariables = detectContextualVariables();

    // Convert to the legacy format for backward compatibility
    const variables: CSSVariable[] = contextualVariables.map(cv => ({
      name: cv.name,
      value: cv.value,
      mediaQuery: cv.contexts.find(c => c.conditionType === 'media')?.condition
    }));

    // Also detect just :root variables for legacy support
    const legacyVariables: CSSVariable[] = [];
    const stylesheets = document.styleSheets;

    for (const sheet of Array.from(stylesheets)) {
      let rules: CSSRuleList;

      try {
        rules = sheet.cssRules;
      } catch (e) {
        continue;
      }

      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
          for (const prop of rule.style) {
            if (prop.startsWith("--")) {
              legacyVariables.push({
                name: prop,
                value: rule.style.getPropertyValue(prop).trim(),
              });
            }
          }
        }
      }
    }

    const store = useDialsStore.getState();

    // Set both contextual and legacy variables
    store.setContextualVariables(contextualVariables);
    store.setVariables(variables.length > 0 ? variables : legacyVariables);

    // Set up original values from the base :root context
    const originalValues: { [name: string]: string } = {};
    contextualVariables.forEach(variable => {
      // Use the value from the :root context as the original value
      const rootContext = variable.contexts.find(c => c.selector === ':root' && !c.condition);
      if (rootContext) {
        originalValues[variable.name] = variable.value;
      } else {
        // Fallback to current value if no root context found
        originalValues[variable.name] = variable.value;
      }
    });
    store.setOriginalValues(originalValues);

    // Log contextual information for debugging
    const rewrittenVariables = contextualVariables.filter(v => v.isRewritten);
    if (rewrittenVariables.length > 0) {
      console.log(`[Dials] Found ${rewrittenVariables.length} contextual variables:`, rewrittenVariables);
    }
  };

  // Initial detection
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", detectCSSVariables);
  } else {
    detectCSSVariables();
  }

    // Monitor for stylesheet changes (MutationObserver for dynamic stylesheets)
  const observer = new MutationObserver((mutations) => {
    const hasStyleChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node =>
        node.nodeName === 'STYLE' || node.nodeName === 'LINK'
      )
    );
    if (hasStyleChanges) {
      setTimeout(detectCSSVariables, 100); // Debounce
    }
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true
  });

  isInitialized = true;

  // Export the store for the UI to use
  return {
    store: useDialsStore,
    updateVariable: (name: string, value: string) => {
      document.documentElement.style.setProperty(name, value);
      useDialsStore.getState().updateVariable(name, value);
    },
  };
}
