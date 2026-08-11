import {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import {MOTION} from '@/shared/design-system/tokens';

export const layoutTransitions = {
  gentleExpand: () =>
    LinearTransition.springify()
      .damping(MOTION.spring.layoutGentle.damping)
      .mass(MOTION.spring.layoutGentle.mass)
      .stiffness(MOTION.spring.layoutGentle.stiffness),
  cardExpand: () =>
    LinearTransition.springify()
      .damping(MOTION.spring.layoutCard.damping)
      .mass(MOTION.spring.layoutCard.mass)
      .stiffness(MOTION.spring.layoutCard.stiffness),
} as const;

export const enteringTransitions = {
  fadeInDown: () => FadeInDown.duration(MOTION.duration.fast),
} as const;

export const exitingTransitions = {
  fadeOutUp: () => FadeOutUp.duration(MOTION.duration.exitFast),
} as const;
