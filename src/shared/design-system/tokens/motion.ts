export const MOTION = {
  duration: {
    exitFast: 140,
    fast: 180,
    normal: 200,
  },
  spring: {
    layoutGentle: {
      damping: 16,
      mass: 1,
      stiffness: 100,
    },
    layoutCard: {
      damping: 18,
      mass: 1,
      stiffness: 190,
    },
    controlPop: {
      damping: 16,
      mass: 0.9,
      stiffness: 220,
    },
  },
} as const;

export type MotionToken = typeof MOTION;
