import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/Toasts';
import { consumeAutomaticUnlockKeys } from './lib/autoUnlock';
import './styles.css';

const automaticUnlockKeys = consumeAutomaticUnlockKeys();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App automaticUnlockKeys={automaticUnlockKeys} />
    </ToastProvider>
  </StrictMode>,
);
