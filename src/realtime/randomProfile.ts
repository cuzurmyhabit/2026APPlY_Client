const ANIMALS = [
  '여우',
  '수달',
  '판다',
  '호랑이',
  '코알라',
  '매',
  '토끼',
  '돌고래',
  '펭귄',
  '늑대',
  '물개',
  '고슴도치',
  '참새',
  '레서판다',
  '사슴',
] as const;

const ADJECTIVES = [
  '용감한',
  '호기심많은',
  '다정한',
  '날쌘',
  '반짝이는',
  '고요한',
  '명랑한',
  '행운의',
  '똑똑한',
  '차분한',
  '기운찬',
  '따뜻한',
] as const;

function randomFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 78% 52%)`;
}

export function createRandomProfile() {
  return {
    name: `${randomFrom(ADJECTIVES)} ${randomFrom(ANIMALS)}`,
    color: randomColor(),
  };
}
