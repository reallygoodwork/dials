import { mountPanel } from "./Panel";
import { useDialsStore, type CSSVariable } from "./store";

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
    const variables: CSSVariable[] = [];

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
              variables.push({
                name: prop,
                value: rule.style.getPropertyValue(prop).trim(),
              });
            }
          }
        }
      }
    }

    const store = useDialsStore.getState();
    store.setVariables(variables);

    // Set up original values
    const originalValues: { [name: string]: string } = {};
    variables.forEach(variable => {
      originalValues[variable.name] = variable.value;
    });
    store.setOriginalValues(originalValues);
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
