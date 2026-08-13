export const FONT_FAMILIES = {
  brand: {
    wordmark: 'Montserrat-ExtraBold',
  },
} as const;

export type FontFamilyToken = typeof FONT_FAMILIES;
