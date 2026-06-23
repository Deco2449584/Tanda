import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/components/attendance',
  'src/components/employees',
  'src/components/schedule',
  'src/components/leave-requests',
  'src/components/settings',
  'src/components/inspections',
  'src/components/employee-dashboard',
  'src/components/my-schedule',
  'src/components/layout',
];

const replacements = [
  ['border-zinc-800', 'border-border'],
  ['border-zinc-700', 'border-border-strong'],
  ['bg-zinc-900/60', 'bg-surface-raised'],
  ['bg-zinc-900/80', 'bg-surface-raised'],
  ['bg-zinc-900/70', 'bg-surface-raised'],
  ['bg-zinc-900', 'bg-surface-raised'],
  ['bg-zinc-950/60', 'bg-surface-base/60'],
  ['bg-zinc-950/80', 'bg-surface-base/80'],
  ['bg-zinc-950', 'bg-surface-base'],
  ['bg-zinc-800/90', 'bg-surface-overlay/90'],
  ['bg-zinc-800/60', 'bg-surface-hover/60'],
  ['bg-zinc-800/50', 'bg-surface-hover/50'],
  ['bg-zinc-800', 'bg-surface-hover'],
  ['text-zinc-600', 'text-subtle'],
  ['text-zinc-500', 'text-subtle'],
  ['text-zinc-400', 'text-muted'],
  ['text-zinc-300', 'text-muted'],
  ['text-zinc-200', 'text-foreground'],
  ['text-zinc-100', 'text-foreground'],
  ['hover:text-white', 'hover:text-foreground'],
  ['hover:bg-zinc-800', 'hover:bg-surface-hover'],
];

for (const root of roots) {
  const absRoot = path.join(process.cwd(), root);
  if (!fs.existsSync(absRoot)) continue;

  for (const file of walk(absRoot)) {
    if (!file.endsWith('.tsx')) continue;
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const [from, to] of replacements) {
      content = content.split(from).join(to);
    }
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('updated', path.relative(process.cwd(), file));
    }
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
