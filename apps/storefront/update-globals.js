const fs = require('fs');
const file = 'src/app/globals.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/@theme inline \{\n([\s\S]*?)\n\}/, (match, p1) => {
  return `@theme inline {\n${p1.replace(/var\(--color-/g, 'var(--theme-')}\n}`;
});

content = content.replace(/\/\* Design system tokens \*\/\n([\s\S]*?)\n  --color-success: #22c55e;/, (match, p1) => {
  return `/* Design system tokens */\n${p1.replace(/--color-/g, '--theme-')}\n  --color-success: #22c55e;`;
});

content = content.replace(/var\(--color-brand\)/g, 'var(--theme-brand)');

content = content.replace(/\.dark \{\n([\s\S]*?)\n\}/, (match, p1) => {
  return `.dark {\n${p1.replace(/--color-/g, '--theme-')}\n}`;
});

content = content.replace(/@media \(prefers-color-scheme: dark\) \{\n  \[data-theme="auto"\] \{\n([\s\S]*?)\n  \}\n\}/, (match, p1) => {
  return `@media (prefers-color-scheme: dark) {\n  [data-theme="auto"] {\n${p1.replace(/--color-/g, '--theme-')}\n  }\n}`;
});

fs.writeFileSync(file, content);
console.log('updated');
