import { mountPanel } from './Panel';
import { useDialsStore, type CSSVariable } from './store';

let isInitialized = false;

export function startDials() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('@reallygoodwork/dials is only available in development mode');
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
  const panel = document.createElement('div');
  panel.id = 'dials-panel';
  document.body.appendChild(panel);

  // Mount the React panel
  mountPanel();

  // Function to detect CSS variables
  const detectCSSVariables = () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const variables: CSSVariable[] = [];

    // Get all CSS variables
    for (const prop of computedStyle) {
      if (prop.startsWith('--')) {
        variables.push({
          name: prop,
          value: computedStyle.getPropertyValue(prop).trim(),
        });
      }
    }

    useDialsStore.getState().setVariables(variables);
  };

  // Initial detection
  detectCSSVariables();

  // Monitor media queries
  const mediaQueries = window.matchMedia('(max-width: 768px)');
  mediaQueries.addEventListener('change', (e) => {
    useDialsStore.getState().setActiveMediaQuery(
      e.matches ? '(max-width: 768px)' : null
    );
    detectCSSVariables();
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