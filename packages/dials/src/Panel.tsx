import { createRoot } from 'react-dom/client';
import { useDialsStore } from './store';
import css from './styles.css?inline';

let root: ReturnType<typeof createRoot> | null = null;
let shadowRoot: ShadowRoot | null = null;

function Panel() {
  const variables = useDialsStore((state) => state.variables);
  const updateVariable = useDialsStore((state) => state.updateVariable);

  return (
    <div className="dials-panel">
      <h2 className="dials-title">CSS Variables</h2>
      <div className="dials-list">
        {variables.map((variable) => (
          <div className="dials-item" key={variable.name}>
            <label className="dials-label">
              {variable.name}
            </label>
            <input
              type="text"
              value={variable.value}
              onChange={(e) => updateVariable(variable.name, e.target.value)}
              className="dials-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function mountPanel() {
  const container = document.getElementById('dials-panel');
  if (container) {
    if (!shadowRoot) {
      shadowRoot = container.attachShadow({ mode: 'open' });
      // Inject styles into shadow root
      const style = document.createElement('style');
      style.textContent = css;
      shadowRoot.appendChild(style);
    }
    if (!root) {
      root = createRoot(shadowRoot);
    }
    root.render(<Panel />);
  }
}