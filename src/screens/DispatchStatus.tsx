import { Button, Card, CardContent, CardHeader, CardTitle } from '@heroui/react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { SettingsButton } from '../components/SettingsButton';
import { FooterNote } from '../components/FooterNote';
import { postToNative } from '../bridge';
import type { Screen } from '../types';

interface Props {
  onTransition: (screen: Screen) => void;
}

export function DispatchStatus({ onTransition }: Props) {
  function handleSafeConfirmation() {
    postToNative('REQUEST_SAFE_CONFIRMATION');
    onTransition('confirmed_safe');
  }

  return (
    <motion.div
      key="dispatch_status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f]"
    >
      <SettingsButton />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm px-4"
      >
        <Card variant="secondary" className="border border-white/10">
          <CardHeader className="pb-0 pt-6 px-6">
            <CardTitle className="text-xl font-bold text-center text-white w-full">
              The rescue team is on their way!
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6 p-6">
            {/* Emergency vehicle icon with success badge */}
            <div className="relative inline-flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <Icon
                  icon="mdi:ambulance"
                  width={96}
                  height={96}
                  className="text-red-500"
                />
              </motion.div>
              <div className="absolute bottom-0 right-0 bg-[#0a0a0f] rounded-full p-0.5">
                <Icon
                  icon="mdi:check-circle"
                  width={28}
                  height={28}
                  className="text-green-500"
                />
              </div>
            </div>

            <Button
              variant="danger"
              fullWidth
              size="lg"
              className="min-h-12 text-base font-semibold"
              onPress={handleSafeConfirmation}
            >
              I'm safe
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <FooterNote />
    </motion.div>
  );
}
