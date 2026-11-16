import fs from 'fs';
import path from 'path';

// 1. Валідація аргументів
const targetFileArg = process.argv[2];
if (!targetFileArg) {
  console.error('❌ Помилка: Вкажіть шлях до TSX файлу.');
  process.exit(1);
}

const absolutePath = path.resolve(targetFileArg);
if (!fs.existsSync(absolutePath)) {
  console.error(`❌ Файл не знайдено: ${absolutePath}`);
  process.exit(1);
}

const fileDir = path.dirname(absolutePath);
const fileNameWithoutExt = path.basename(absolutePath, path.extname(absolutePath));

// 2. Читання вмісту TSX
let tsxContent = fs.readFileSync(absolutePath, 'utf8');

// 3. Збір класів з TSX (className, s(), clsx, cn, classNames)
const classRegexes = [
  /className\s*=\s*(?:["']([^"']+)["']|{\s*["']([^"']+)["']\s*}|{`([^`]+)`})/g,
  /\bs\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\b(?:clsx|classNames|cn)\s*\(([^)]+)\)/g
];

const classesMap = new Map();

function extractClasses(rawString) {
  if (!rawString) return;

  const cleaned = rawString
    .replace(/\$\{[^}]+\}/g, ' ') // Вирізаємо JS інтерполяцію ${...}
    .replace(/\b(true|false|null|undefined)\b/g, ' ') // Прибираємо булеві значення
    .replace(/['"`{}:?]/g, ' '); // Прибираємо лапки та знаки умов

  cleaned.split(/[\s,]+/g).forEach(cls => {
    const cleanCls = cls.trim();
    if (!cleanCls || cleanCls.startsWith('$') || cleanCls.length < 2) return;

    // Визначаємо базовий БЕМ-блок (наприклад, з header__inner беремо header)
    const baseBlock = cls.split('__')[0].split('--')[0];

    if (!classesMap.has(baseBlock)) {
      classesMap.set(baseBlock, new Set());
    }
    classesMap.get(baseBlock).add(cleanCls);
  });
}

classRegexes.forEach(regex => {
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(tsxContent)) !== null) {
    for (let i = 1; i < match.length; i++) {
      if (match[i]) extractClasses(match[i]);
    }
  }
});

if (classesMap.size === 0) {
  console.log('⚠️ Класів для БЕМ не знайдено.');
  process.exit(0);
}

// 4. Фільтрація: залишаємо лише валідні БЕМ-блоки або класи з назвою файлу
const filteredClassesMap = new Map();

classesMap.forEach((classes, block) => {
  const isFileName = block.toLowerCase() === fileNameWithoutExt.toLowerCase();
  const hasBemChildren = Array.from(classes).some(cls => cls !== block);

  if (isFileName || hasBemChildren) {
    filteredClassesMap.set(block, classes);
  } else {
    console.log(`🧹 Пропущено загальний/одинарний клас без БЕМ: .${block}`);
  }
});

if (filteredClassesMap.size === 0) {
  console.log('⚠️ Валідних БЕМ-блоків не виявлено.');
  process.exit(0);
}

// 5. Робота зі стилями (SCSS)
const scssDir = path.join(fileDir, 'scss');
if (!fs.existsSync(scssDir)) {
  fs.mkdirSync(scssDir, { recursive: true });
}

const outputPath = path.join(scssDir, `${fileNameWithoutExt}.module.scss`);

// Допоміжна функція: точне знаходження меж БЕМ-блоку за фігурними дужками
function findBlockBounds(content, blockName) {
  const targetPattern = `.${blockName}`;
  let index = 0;

  while (index < content.length) {
    const foundIdx = content.indexOf(targetPattern, index);
    if (foundIdx === -1) return null;

    const charBefore = content[foundIdx - 1];
    const charAfter = content[foundIdx + targetPattern.length];

    if ((!charBefore || /\s/.test(charBefore)) && (charAfter === '{' || /\s/.test(charAfter))) {
      const openBraceIdx = content.indexOf('{', foundIdx);
      if (openBraceIdx === -1) return null;

      let depth = 0;
      let closeBraceIdx = -1;

      for (let i = openBraceIdx; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            closeBraceIdx = i;
            break;
          }
        }
      }

      if (closeBraceIdx !== -1) {
        return { start: foundIdx, end: closeBraceIdx, openBrace: openBraceIdx };
      }
    }
    index = foundIdx + targetPattern.length;
  }
  return null;
}

let scssContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : `@use "@scss/vars" as *;\n\n`;
let globalHasChanges = false;

// Генерація шаблону для нового блоку
function generateBlockContent(block, classes) {
  let blockStr = `.${block} {\n`;
  classes.forEach(cls => {
    if (cls === block) return;
    if (cls.includes('__')) {
      const elem = cls.replace(`${block}__`, '');
      blockStr += `  &__${elem} {\n    \n  }\n`;
    } else if (cls.includes('--')) {
      blockStr += `  &${cls.replace(block, '')} {\n    \n  }\n`;
    } else {
      blockStr += `  .${cls} {\n    \n  }\n`;
    }
  });
  blockStr += `}\n`;
  return blockStr;
}

// 6. Безпечна синхронізація (тільки додавання нових елементів без руйнування кастомного коду)
filteredClassesMap.forEach((classes, block) => {
  const bounds = findBlockBounds(scssContent, block);

  if (!bounds) {
    // Сценарій А: Блок повністю відсутній — створюємо новий у кінці файлу
    scssContent = scssContent.trim() + '\n\n' + generateBlockContent(block, classes);
    globalHasChanges = true;
    console.log(`✨ Створено новий блок: .${block}`);
  } else {
    // Сценарій Б: Блок існує — перевіряємо, чи з'явилися нові елементи, і додаємо їх у кінець блоку
    let blockBody = scssContent.substring(bounds.openBrace + 1, bounds.end);
    let additions = '';

    classes.forEach(cls => {
      if (cls === block) return;

      let selectorToCheck = '';
      if (cls.includes('__')) {
        selectorToCheck = `&__${cls.replace(`${block}__`, '')}`;
      } else if (cls.includes('--')) {
        selectorToCheck = `&${cls.replace(block, '')}`;
      } else {
        selectorToCheck = `.${cls}`;
      }

      // Перевіряємо, чи цей селектор вже є в тілі блоку
      if (!blockBody.includes(selectorToCheck)) {
        additions += `  ${selectorToCheck} {\n    \n  }\n`;
      }
    });

    if (additions) {
      // Додаємо нові елементи безпосередньо перед закриваючою фігурною дужкою блоку
      scssContent =
        scssContent.substring(0, bounds.end) +
        additions +
        scssContent.substring(bounds.end);

      globalHasChanges = true;
      console.log(`➕ Додано нові елементи в блок: .${block}`);
    }
  }
});

// Записуємо SCSS файл лише за наявності реальних змін
if (globalHasChanges || !fs.existsSync(outputPath)) {
  fs.writeFileSync(outputPath, scssContent.trim() + '\n', 'utf8');
  console.log(`✅ SCSS файл успішно оновлено: ${path.relative(process.cwd(), outputPath)}`);
} else {
  console.log(`✨ Усі стилі актуальні, змін немає.`);
}

// 7. Автоматичне додавання імпорту в TSX (без дублювання)
tsxContent = fs.readFileSync(absolutePath, 'utf8');
const importString = `${fileNameWithoutExt}.module.scss`;
if (!tsxContent.includes(importString)) {
  const importStatement = `import styles from './scss/${fileNameWithoutExt}.module.scss';`;
  const lines = tsxContent.split('\n');
  let lastImportIndex = -1;

  lines.forEach((line, index) => {
    if (line.trim().startsWith('import ')) {
      lastImportIndex = index;
    }
  });

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    lines.unshift(importStatement);
  }

  fs.writeFileSync(absolutePath, lines.join('\n'), 'utf8');
  console.log(`🔗 Автоматично додано імпорт стилів у TSX файл.`);
}
