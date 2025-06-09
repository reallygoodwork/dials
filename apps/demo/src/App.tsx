import { useEffect } from 'react';
import { startDials } from '@reallygoodwork/dials';
import './App.css';

function App() {
  useEffect(() => {
    startDials();
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dials Demo - Contextual CSS Variables</h1>
        <p>Edit CSS variables in real-time using the Dials panel. Notice how some variables change based on screen size, theme preferences, and other contexts!</p>
        <div className="context-info">
          <p><strong>Try:</strong> Resize your window, change your OS theme preference, or check the "Contextual" tab in the Dials panel →</p>
        </div>
      </header>

      <main className="app-main">
        <section className="demo-section">
          <h2>Colors (Theme Aware)</h2>
          <p className="section-description">These colors automatically adapt to your system's dark/light theme preference and high contrast settings.</p>
          <div className="color-demo">
            <div className="color-box primary">Primary<br/><small>var(--color-primary)</small></div>
            <div className="color-box secondary">Secondary<br/><small>var(--color-secondary)</small></div>
            <div className="color-box accent">Accent<br/><small>var(--color-accent)</small></div>
          </div>
        </section>

        <section className="demo-section">
          <h2>Responsive Typography</h2>
          <p className="section-description">Font sizes that scale down on mobile devices and up on large screens.</p>
          <div className="typography-demo">
            <h1>Heading 1 <span className="var-name">(--font-size-h1)</span></h1>
            <h2>Heading 2 <span className="var-name">(--font-size-h2)</span></h2>
            <h3>Heading 3 <span className="var-name">(--font-size-h3)</span></h3>
            <p>Body text with some content to demonstrate the font size and line height. The base font size is controlled by <code>--font-size-base</code>.</p>
          </div>
        </section>

        <section className="demo-section">
          <h2>Responsive Spacing & Layout</h2>
          <p className="section-description">Spacing that adapts to screen size - notice how gaps get smaller on mobile.</p>
          <div className="spacing-demo">
            <div className="spacing-box small">Small<br/><code>--spacing-small</code></div>
            <div className="spacing-box medium">Medium<br/><code>--spacing-medium</code></div>
            <div className="spacing-box large">Large<br/><code>--spacing-large</code></div>
          </div>
        </section>

        <section className="demo-section">
          <h2>Container & Grid</h2>
          <p className="section-description">Container width and grid gaps that respond to different breakpoints.</p>
          <div className="container-demo">
            <div className="container-box">
              <h4>Container</h4>
              <p>Max width: <code>var(--container-max-width)</code></p>
              <p>Grid gap: <code>var(--grid-gap)</code></p>
            </div>
            <div className="sidebar-demo">
              <h4>Sidebar</h4>
              <p>Width: <code>var(--sidebar-width)</code></p>
            </div>
          </div>
        </section>

        <section className="demo-section">
          <h2>Contextual Variables Detected</h2>
          <p className="section-description">
            The Dials panel now detects variables that are redefined in different contexts.
            Click the <strong>"Contextual"</strong> tab in the Dials panel to see:
          </p>
          <ul className="context-list">
            <li>📱 <strong>Mobile</strong> - Variables redefined at <code>max-width: 768px</code></li>
            <li>📊 <strong>Tablet</strong> - Variables redefined at <code>769px - 1024px</code></li>
            <li>🖥️ <strong>Large screens</strong> - Variables redefined at <code>min-width: 1400px</code></li>
            <li>🌙 <strong>Dark theme</strong> - Variables redefined for <code>prefers-color-scheme: dark</code></li>
            <li>🔍 <strong>High contrast</strong> - Variables redefined for <code>prefers-contrast: high</code></li>
            <li>🖨️ <strong>Print</strong> - Variables redefined for <code>@media print</code></li>
            <li>📦 <strong>Container queries</strong> - Variables redefined based on container size</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>🎛️ Use the Dials panel to edit variables and see how contextual tokens work!</p>
      </footer>
    </div>
  );
}

export default App;