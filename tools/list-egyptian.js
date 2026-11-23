/* Writes docs/egyptian-names.md: every Egyptian wording beside its Fusha
   twin, for the parents to review before they record.

       node tools/list-egyptian.js

   Nothing is typed here: the words are read out of the recording cards in
   public/js/record.js, which is where they live. A correction goes into the
   card there (the `-masri` entry, or COUNT_MASRI and HOURS_MASRI), and this
   list is then written again. */
const fs = require('fs');
const path = require('path');

const here = path.join(__dirname, '..');
const text = fs.readFileSync(path.join(here, 'public', 'js', 'record.js'), 'utf8');

/* The cards are one array literal; everything it needs sits just above it. */
const from = text.indexOf('const COUNT_FUSHA');
const start = text.indexOf('const STATIC_SLOTS = [');
let depth = 0;
let end = -1;
for (let i = text.indexOf('[', start); i < text.length; i++) {
  if (text[i] === '[') depth += 1;
  if (text[i] === ']') {
    depth -= 1;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const slots = new Function(`${text.slice(from, end)}; return STATIC_SLOTS;`)();
const byFile = new Map(slots.map((slot) => [slot.file, slot]));

const groups = [];
for (const slot of slots) {
  if (!slot.file.endsWith('-masri')) continue;
  const twin = byFile.get(slot.file.replace(/-masri$/, ''));
  let group = groups.find((one) => one.name === slot.group);
  if (!group) {
    group = { name: slot.group, rows: [] };
    groups.push(group);
  }
  group.rows.push({ clip: slot.file, fusha: twin ? twin.text : '', masri: slot.text, said: twin ? twin.note.replace(/\s*\(Fusha\)\s*$/, '') : slot.note });
}

const count = groups.reduce((sum, group) => sum + group.rows.length, 0);
const lines = [
  '# The Egyptian wording, for review',
  '',
  `Every prompt the site can say in Egyptian: ${count} of them. On screen the text is always Fusha; the Egyptian line is only read aloud when recording, and played when the ☰ menu's switch is on Egyptian. All of the Egyptian lines are Claude's drafts until a parent corrects them.`,
  '',
  'Where they live: the recording cards in `public/js/record.js` (each `-masri` card, and the lists `COUNT_MASRI` and `HOURS_MASRI` at its top), shown on the Record page (`/admin` → Record audio) beside their Fusha cards. Tell Claude what to change, or change the card; then `node tools/list-egyptian.js` writes this list again.',
  '',
  'A prompt with no Egyptian card is said the same way in both settings (one recording).',
];
for (const group of groups) {
  lines.push('', `## ${group.name}`, '', '| Said when | On screen (Fusha) | Egyptian, to say | Clip |', '|---|---|---|---|');
  for (const row of group.rows) lines.push(`| ${row.said} | ${row.fusha} | ${row.masri} | \`${row.clip}\` |`);
}
fs.writeFileSync(path.join(here, 'docs', 'egyptian-names.md'), `${lines.join('\n')}\n`);
console.log(`${count} Egyptian lines in ${groups.length} groups`);
