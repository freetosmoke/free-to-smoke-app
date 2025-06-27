import { LevelConfig } from '../types';

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    name: 'Bronzo',
    minPoints: 0,
    maxPoints: 499,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20'
  },
  {
    name: 'Argento',
    minPoints: 500,
    maxPoints: 999,
    color: 'text-gray-300',
    bgColor: 'bg-gray-600/20'
  },
  {
    name: 'Oro',
    minPoints: 1000,
    maxPoints: 1999,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20'
  },
  {
    name: 'Platino',
    minPoints: 2000,
    maxPoints: Infinity,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20'
  }
];

export const getUserLevel = (points: number): LevelConfig => {
  return LEVEL_CONFIGS.find(level => 
    points >= level.minPoints && points <= level.maxPoints
  ) || LEVEL_CONFIGS[0];
};

export const getNextLevel = (currentPoints: number): LevelConfig | null => {
  const currentLevel = getUserLevel(currentPoints);
  const currentIndex = LEVEL_CONFIGS.findIndex(level => level.name === currentLevel.name);
  return currentIndex < LEVEL_CONFIGS.length - 1 ? LEVEL_CONFIGS[currentIndex + 1] : null;
};

export const getPointsToNextLevel = (currentPoints: number): number => {
  const nextLevel = getNextLevel(currentPoints);
  return nextLevel ? nextLevel.minPoints - currentPoints : 0;
};