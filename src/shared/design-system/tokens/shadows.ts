export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 0.5,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  floating: {
    shadowColor: '#22C55E',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.24,
    shadowRadius: 15,
    elevation: 6,
  },
} as const;

export type ShadowToken = typeof SHADOWS;
