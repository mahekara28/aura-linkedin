/* Build-time only. LinkedIn messaging uses legacy classes inside an open shadow
 * root; this stylesheet is derived from the same design tokens and rules. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function skipString(source, start) {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '\\') index += 2;
    else if (source[index++] === quote) return index;
  }
  throw new Error('Unclosed CSS string');
}

function skipComment(source, start) {
  const end = source.indexOf('*/', start + 2);
  if (end < 0) throw new Error('Unclosed CSS comment');
  return end + 2;
}

function selectorToHost(selector) {
  let output = '';
  let index = 0;
  while (index < selector.length) {
    if (selector.startsWith('/*', index)) {
      const end = skipComment(selector, index);
      output += selector.slice(index, end); index = end; continue;
    }
    if (selector[index] === '"' || selector[index] === "'") {
      const end = skipString(selector, index);
      output += selector.slice(index, end); index = end; continue;
    }
    if (selector.startsWith('html[data-aura-', index) && (index === 0 || !/[\w-]/.test(selector[index - 1]))) {
      const start = index + 4;
      let end = start;
      while (selector.startsWith('[data-aura-', end)) {
        let cursor = end + 1;
        while (cursor < selector.length && selector[cursor] !== ']') {
          if (selector[cursor] === '"' || selector[cursor] === "'") cursor = skipString(selector, cursor);
          else cursor++;
        }
        if (cursor === selector.length) throw new Error('Unclosed Aura attribute selector');
        end = cursor + 1;
      }
      output += `:host(${selector.slice(start, end)})`;
      index = end;
      continue;
    }
    output += selector[index++];
  }
  return output;
}

function transformStylesheet(source) {
  let index = 0;
  function block(rules, nested = false) {
    let output = '';
    let start = index;
    while (index < source.length) {
      const character = source[index];
      if (source.startsWith('/*', index)) { index = skipComment(source, index); continue; }
      if (character === '"' || character === "'") { index = skipString(source, index); continue; }
      if (character === '{') {
        const prelude = source.slice(start, index);
        const clean = prelude.replace(/\/\*[\s\S]*?\*\//g, '').trim();
        const atRule = clean.startsWith('@');
        output += (rules && !atRule ? selectorToHost(prelude) : prelude) + '{';
        index++;
        const childRules = rules && atRule && /^@(?:media|supports|layer|container|document|scope|(?:-\w+-)?keyframes)\b/i.test(clean);
        output += block(childRules, true);
        start = index;
        continue;
      }
      if (character === '}') {
        if (!nested) throw new Error('Unexpected closing CSS brace');
        output += source.slice(start, ++index);
        return output;
      }
      if (character === ';') {
        output += source.slice(start, ++index);
        start = index;
        continue;
      }
      index++;
    }
    if (nested) throw new Error('Unclosed CSS block');
    return output + source.slice(start);
  }
  return block(true);
}

function generatedStyles(source) {
  return '/* GENERATED from content/themes.css by scripts/build-shadow.cjs.\n' +
    ' * Do not edit separately: rebuild after changing the shared theme system.\n' +
    ' * Loaded only into LinkedIn\'s known open interop messaging shadow root. */\n' +
    transformStylesheet(source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
}

function build(check = false) {
  const directory = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(directory, 'content/themes.css'), 'utf8');
  const target = path.join(directory, 'content/shadow.css');
  const generated = generatedStyles(source);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== generated) throw new Error('content/shadow.css is stale; run node scripts/build-shadow.cjs');
  } else fs.writeFileSync(target, generated, 'utf8');
  return generated;
}

if (require.main === module) {
  try { build(process.argv.includes('--check')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { selectorToHost, transformStylesheet, generatedStyles, build };
