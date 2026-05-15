import { Button, Card, CardContent, Chip } from '@heroui/react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { SettingsButton } from '../components/SettingsButton';
import { FooterNote } from '../components/FooterNote';
import { postToNative } from '../bridge';
import type { Screen } from '../types';

interface Props {
  onTransition: (screen: Screen) => void;
}

export function ConfirmedSafe({ onTransition }: Props) {
  function handleCancel() {
    postToNative('REQUEST_CANCEL');
    onTransition('initial');
  }

  function handleDone() {
    postToNative('REQUEST_DONE');
  }

  return (
    <motion.div
      key="confirmed_safe"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f]"
    >
      <SettingsButton />

      {/* Dimmed background context */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
        aria-hidden
      >
        <p className="text-2xl font-bold text-center px-6 text-white opacity-20 blur-[1px]">
          Building rumble in your area!
        </p>
        <p className="text-lg text-center text-neutral-400 opacity-20 blur-[1px] mt-2">
          Are you safe?
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm px-4"
      >
        <Card variant="secondary" className="border border-white/10">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <Chip color="success" variant="soft" className="shrink-0">
                <span className="flex items-center gap-1">
                  <Icon icon="mdi:check-circle" width={14} />
                  Safe
                </span>
              </Chip>
              <p className="text-white font-medium text-sm">
                You've reported yourself safe.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <Button
                variant="danger-soft"
                fullWidth
                size="lg"
                className="min-h-12"
                onPress={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                className="min-h-12"
                onPress={handleDone}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <FooterNote />
    </motion.div>
  );
}
