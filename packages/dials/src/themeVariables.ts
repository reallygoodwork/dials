// Add CSS variables to the shadow root
export const injectThemeVariables = (shadowRoot: ShadowRoot) => {
  // Get computed styles from the container to capture variables from the light DOM
  // const computedStyle = getComputedStyle(container);
  const style = document.createElement("style");

  style.textContent = `
    :host {
      --dials-accent: #adfa1d;
      --dials-background: #09090B;
      --dials-foreground: #FAFAFA;
      --dials-muted: #a1a1aa;
      --dials-surface: #141415;
      --dials-shadow: 0 0 0 1px hsla(0, 0%, 100%, 0.1), 0px 24px 32px -8px hsla(0, 0%, 0%, 0.06), 0px 8px 16px -4px hsla(0, 0%, 0%, 0.04);
      --dials-focus-ring: 0 0 0 0 rgb(255, 255, 255), 0 0 0 1px rgb(212, 212, 216), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --dials-font-family: 'Geist', -apple-system, BlinkMacSystemFont, "SF Pro", "Helvetica Neue", Helvetica, Arial, sans-serif;
      --dials-font-family-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --dials-control-gap: 8px;
      --dials-label-control-gap: 12px;
      --dials-font-size: 12px;
      --dials-offset: 1.25rem;
      --dials-surface-border-radius: 8px;
      --dials-input-border-radius: 8px;
      --dials-input-tracking: 0.05em;
      --dials-input-padding: 4px 12px;
      --dials-input-background: #1B1B1D;
      --dials-input-height: 36px;
      --dials-input-font-size: 12px;
      --dials-input-border-color: #27272A;
      --dials-label-font-size: 11px;
      --dials-panel-padding: 24px;
      --dials-color-controls-padding: 12px;
      --dials-color-swatch-size: var(--dials-input-height);
    }
  `;
  shadowRoot.prepend(style);
};
