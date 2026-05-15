import { Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { SettingsButton } from '../components/SettingsButton';
import { FooterNote } from '../components/FooterNote';
import { postToNative } from '../bridge';
import type { Screen } from '../types';

interface Props {
  onTransition: (screen: Screen) => void;
}

export function InitialPrompt({ onTransition }: Props) {
  function handleOk() {
    postToNative('REQUEST_STATUS_OK');
    onTransition('confirmed_safe');
  }

  function handleNotOk() {
    postToNative('REQUEST_STATUS_NOT_OK');
    onTransition('dispatch_status');
  }

  return (
    <motion.div
      key="initial"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f]"
    >
      <SettingsButton />

      <div className="flex flex-col items-center gap-3 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-2xl font-bold text-center text-white leading-tight"
        >
          Building rumble in your area!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-lg text-center text-neutral-400"
        >
          Are you safe?
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-row gap-4 mt-6"
        >
          <Button
            variant="primary"
            size="lg"
            className="w-[40vw] h-[40vw] max-w-48 max-h-48 min-w-[120px] min-h-[120px] flex flex-col gap-2 text-base font-semibold rounded-2xl"
            onPress={handleOk}
            aria-label="I am safe"
          >
            <Icon icon="fluent:hand-wave-24-filled" width={40} height={40} />
            <span>I'm OK</span>
          </Button>

          <Button
            variant="danger"
            size="lg"
            className="w-[40vw] h-[40vw] max-w-48 max-h-48 min-w-[120px] min-h-[120px] flex flex-col gap-2 text-base font-semibold rounded-2xl"
            onPress={handleNotOk}
            aria-label="I am not safe"
          >
            <Icon icon="mdi:close-thick" width={40} height={40} />
            <span>Not OK</span>
          </Button>
        </motion.div>
      </div>

      <FooterNote />
    </motion.div>
  );
}
