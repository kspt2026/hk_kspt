import type { BridgeAction } from './types';

declare global {
  interface Window {
    EmergencyBridge?: {
      onRequestCancel: () => void;
      onRequestDone: () => void;
      onRequestSafeConfirmation: () => void;
      onRequestStatusOk: () => void;
      onRequestStatusNotOk: () => void;
    };
    AndroidNative?: {
      postMessage: (action: string, payload?: string) => void;
    };
  }
}

export function postToNative(action: BridgeAction, payload?: string): void {
  try {
    window.AndroidNative?.postMessage(action, payload);
  } catch {
    // native not available in browser preview
  }
}

export function registerBridge(handlers: {
  onRequestCancel: () => void;
  onRequestDone: () => void;
  onRequestSafeConfirmation: () => void;
  onRequestStatusOk: () => void;
  onRequestStatusNotOk: () => void;
}): void {
  window.EmergencyBridge = handlers;
}
