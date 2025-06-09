// Function to inject font styles into the shadow DOM
export function injectFontStyles(shadowRoot: ShadowRoot) {
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap');

    :host {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, "SF Pro", "Helvetica Neue", Helvetica,
        Arial, sans-serif;
    }
  `;
  shadowRoot.prepend(style);
}