export type LoginBackgroundSeason = 'spring' | 'autumn';

export const getLoginBackgroundSeason = (
  date: Date = new Date(),
): LoginBackgroundSeason => {
  const month = date.getMonth() + 1;

  return month >= 2 && month <= 7 ? 'spring' : 'autumn';
};
