const ukrainianScoreTable: Record<number, number> = {
  8: 100, 9: 105, 10: 110, 11: 120, 12: 125, 13: 130,
  14: 134, 15: 136, 16: 138, 17: 140, 18: 142, 19: 143,
  20: 144, 21: 145, 22: 146, 23: 148, 24: 149, 25: 150,
  26: 152, 27: 154, 28: 156, 29: 157, 30: 159, 31: 160,
  32: 162, 33: 163, 34: 165, 35: 167, 36: 170, 37: 172,
  38: 175, 39: 177, 40: 180, 41: 183, 42: 186, 43: 191,
  44: 195, 45: 200,
};

export function convertUkrainianScore(testScore: number): number {
  if (testScore <= 0) return 0;
  if (testScore < 8) return 100;
  if (testScore > 45) return 200;
  return ukrainianScoreTable[testScore] ?? 100;
}

export const UKRAINIAN_MAX_SCORE = 45;
export const UKRAINIAN_SINGLE_COUNT = 25;
export const UKRAINIAN_MATCHING_COUNT = 5;