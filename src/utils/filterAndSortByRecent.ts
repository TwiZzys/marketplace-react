// 1. Тільки фільтрація за останні N днів
export const filterByLastDays = <T extends { createdAt: string }>(items: T[], days: number = 14): T[] => {
  const nowTime = new Date().getTime();
  const timeLimit = nowTime - (days * 24 * 60 * 60 * 1000);

  return items.filter(item => {
    const itemTime = new Date(item.createdAt).getTime();
    return itemTime >= timeLimit && itemTime <= nowTime;
  });
};

// 2. Тільки сортування від нових до старих
// Використовуємо [...items], щоб не змінювати оригінальний масив (мутацію)
export const sortByNewest = <T extends { createdAt: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};
