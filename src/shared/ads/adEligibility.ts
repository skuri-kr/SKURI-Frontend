export const DETAIL_AD_MIN_BODY_HEIGHT = 600;

export const isDetailAdEligible = (bodyHeight: number) => {
  return bodyHeight >= DETAIL_AD_MIN_BODY_HEIGHT;
};
