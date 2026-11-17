// src/utils/formatters/numberFormatter.ts

interface NumberFormatterOptions {
  fallback?: string;        // Що повертати, якщо дані невалідні (за замовчуванням — "Не вказано")
  prefix?: string;          // Префікс на початку (наприклад, "$ ")
  suffix?: string;          // Суфікс у кінці (наприклад, " грн", " км", " шт.")
  decimals?: number;        // Кількість знаків після коми (наприклад, 2)
}

export const numberFormatter = (value: unknown, options: NumberFormatterOptions = {}): string => {
  const {
    fallback = 'Не вказано',
    prefix = '',
    suffix = '',
    decimals,
  } = options;

  // 1. Строга перевірка: це має бути справжнє число і не NaN
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  // 2. Округлення до потрібної кількості знаків після коми (якщо decimals передано)
  const formattedNumber = decimals !== undefined
    ? value.toFixed(decimals)
    : value.toString();

  // 3. Повертаємо склеєний результат
  return `${prefix}${formattedNumber}${suffix}`;
};
