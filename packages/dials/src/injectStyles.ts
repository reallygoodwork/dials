export function injectStyles(css: string) {
  if (typeof window === 'undefined') return;
  if (document.getElementById('dials-styles')) return; // Prevent double-injection

  const style = document.createElement('style');
  style.id = 'dials-styles';
  style.textContent = css;
  document.head.appendChild(style);
}