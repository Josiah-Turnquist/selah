import { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Button, type IconType } from '@/components/ui/primitives';

/** A destructive button that requires a second tap within 3s to confirm. */
export function ConfirmButton({
  title,
  confirmTitle = 'Tap again to confirm',
  onConfirm,
  icon,
  variant = 'ghost',
  size,
  full,
  style,
}: {
  title: string;
  confirmTitle?: string;
  onConfirm: () => void;
  icon?: IconType;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <Button
      icon={icon}
      size={size}
      full={full}
      style={style}
      variant={armed ? 'danger' : variant}
      title={armed ? confirmTitle : title}
      onPress={() => (armed ? onConfirm() : setArmed(true))}
    />
  );
}
