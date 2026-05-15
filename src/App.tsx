import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Screen } from './types';
import { InitialPrompt } from './screens/InitialPrompt';
import { ConfirmedSafe } from './screens/ConfirmedSafe';
import { DispatchStatus } from './screens/DispatchStatus';

export default function App() {
  const [screen, setScreen] = useState<Screen>('initial');

  return (
    <div className="w-full h-full overflow-hidden bg-[#0a0a0f]">
      <AnimatePresence mode="wait">
        {screen === 'initial' && (
          <InitialPrompt key="initial" onTransition={setScreen} />
        )}
        {screen === 'confirmed_safe' && (
          <ConfirmedSafe key="confirmed_safe" onTransition={setScreen} />
        )}
        {screen === 'dispatch_status' && (
          <DispatchStatus key="dispatch_status" />
        )}
      </AnimatePresence>
    </div>
  );
}
