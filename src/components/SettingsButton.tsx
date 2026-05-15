import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';

export function SettingsButton() {
  return (
    <Button
      isIconOnly
      variant="ghost"
      aria-label="Settings"
      className="absolute top-4 left-4 z-10 w-12 h-12 min-w-12 min-h-12"
      onPress={() => window.AndroidNative?.postMessage('OPEN_SETTINGS')}
    >
      <Icon icon="mdi:cog" width={24} height={24} />
    </Button>
  );
}
