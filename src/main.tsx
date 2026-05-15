import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerBridge } from './bridge.ts';
import type { Screen } from './types.ts';

let _setScreen: ((screen: Screen) => void) | null = null;

export function connectBridgeToScreen(fn: (screen: Screen) => void) {
  _setScreen = fn;
}

registerBridge({
  onRequestCancel: () => _setScreen?.('initial'),
  onRequestDone: () => {},
  onRequestSafeConfirmation: () => {},
  onRequestStatusOk: () => _setScreen?.('confirmed_safe'),
  onRequestStatusNotOk: () => _setScreen?.('dispatch_status'),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
