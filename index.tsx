
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

const updateSW = registerSW({
  onNeedRefresh() {
    toast('New content available!', {
      description: 'Would you like to reload the app to see the latest updates?',
      action: {
        label: 'Reload',
        onClick: () => updateSW(true),
      },
      duration: Infinity,
      style: { borderRadius: '1rem' }
    });
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
