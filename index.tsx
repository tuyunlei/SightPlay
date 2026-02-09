import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

Sentry.init({
  dsn: 'https://8977ed5e05a090970509699e97aab2d2@o4510856750891008.ingest.us.sentry.io/4510856758886400',
  enabled: import.meta.env.PROD,
  integrations: [Sentry.replayIntegration()],
  // Capture 10% of sessions normally, 100% when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
