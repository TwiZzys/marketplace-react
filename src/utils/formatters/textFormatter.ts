// src/utils/formatters/textFormatter.ts

interface TextFormatterOptions {
  fallback?: string;                       // Що повертати, якщо дані невалідні (за замовчуванням — "Не вказано")
  allowNumbers?: boolean;                  // Чи дозволяти цифри в тексті (за замовчуванням true, для брендів можна ставити false)
  suffix?: string;                         // Суфікс у кінці рядка (наприклад, " грн", " шт.")
  letterCase?: 'lower' | 'upper' | 'none'; // Зміна регістру
  locale?: string;                         // Локаль для методів регістру (за замовчуванням 'uk')
}

export const textFormatter = (value: unknown, options: TextFormatterOptions = {}): string => {
  const {
    fallback = 'Не вказано',
    allowNumbers = true,
    suffix = '',
    letterCase = 'none',
    locale = 'uk',
  } = options;

  // 1. Перевіряємо, чи це справді рядок
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  // Якщо рядок порожній після обрізки
  if (trimmed === '') {
    return fallback;
  }

  // 2. Якщо числа заборонені (!allowNumbers), а в тексті є хоча б одна цифра — відсікаємо
  if (!allowNumbers && /\d/.test(trimmed)) {
    return fallback;
  }

  // 3. Зміна регістру з урахуванням локалі
  let formattedText = trimmed;
  if (letterCase === 'lower') {
    formattedText = trimmed.toLocaleLowerCase(locale);
  } else if (letterCase === 'upper') {
    formattedText = trimmed.toLocaleUpperCase(locale);
  }

  // 4. Повертаємо текст разом із суфіксом
  return `${formattedText}${suffix}`;
};
