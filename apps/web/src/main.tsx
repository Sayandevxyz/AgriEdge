import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Centralized API Base URL support for Vercel/Render decoupled deployments
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${API_BASE}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      input = new URL(`${API_BASE}${input.pathname}${input.search}`);
    }
    return originalFetch(input, init);
  };
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration failed: ', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
