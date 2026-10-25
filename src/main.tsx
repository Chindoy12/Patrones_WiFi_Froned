import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { applyTheme, storedTheme } from './theme';

// Shown before the first render so the page never flashes in the other theme; nothing is saved until the person chooses.
applyTheme(storedTheme(), false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
