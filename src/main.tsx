import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket errors in the AI Studio preview environment
if (typeof window !== 'undefined') {
  const isViteError = (m: any) => {
    if (!m) return false;
    const str = String(m.message || m.reason?.message || m.reason || m).toLowerCase();
    return (
      str.includes('websocket') || 
      str.includes('vite') || 
      str.includes('hmr') ||
      str.includes('closed without opened')
    );
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.some(isViteError)) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args.some(isViteError)) return;
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteError(event) || isViteError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isViteError(event) || isViteError(event.message) || isViteError(event.error)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
