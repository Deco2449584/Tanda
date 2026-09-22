import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion } from '@/theme/motion';

type FadeInItemProps = {
  index: number;
  children: ReactNode;
};

export function FadeInItem({ index, children }: FadeInItemProps) {
  const delay = Math.min(Math.max(index, 0), motion.staggerCap) * motion.staggerMs;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(motion.enterDuration)}>
      {children}
    </Animated.View>
  );
}
