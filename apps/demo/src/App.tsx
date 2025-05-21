import { useEffect } from 'react';
import { startDials } from '@reallygoodwork/dials';
import './App.css';

function App() {
  useEffect(() => {
    const dials = startDials();
    if (dials) {
      const { store } = dials;
      // Use store if needed
    }
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dials Demo</h1>
        <p>Edit CSS variables in real-time using the Dials panel</p>
      </header>

      <main className="app-main">
        <section className="demo-section">
          <h2>Colors</h2>
          <div className="color-demo">
            <div className="color-box primary">Primary</div>
            <div className="color-box secondary">Secondary</div>
            <div className="color-box accent">Accent</div>
          </div>
        </section>

        <section className="demo-section">
          <h2>Typography</h2>
          <div className="typography-demo">
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <p>Body text with some content to demonstrate the font size and line height.</p>
          </div>
        </section>

        <section className="demo-section">
          <h2>Spacing</h2>
          <div className="spacing-demo">
            <div className="spacing-box small">Small</div>
            <div className="spacing-box medium">Medium</div>
            <div className="spacing-box large">Large</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;