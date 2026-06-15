const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const obj = JSON.parse(
  fs.readFileSync(path.join(root, '.service-account.tmp.json'), 'utf8'),
);
const oneLine = JSON.stringify(obj);

const header = fs.readFileSync(path.join(root, '.env.local'), 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON'))
  .filter((line) => !line.startsWith('PORTAL_SESSION_SECRET'))
  .join('\n')
  .trimEnd();

const content =
  header +
  `\nFIREBASE_SERVICE_ACCOUNT_JSON='${oneLine}'\nPORTAL_SESSION_SECRET=1030677140Xd.2026\n`;

fs.writeFileSync(path.join(root, '.env.local'), content, 'utf8');
console.log('OK: .env.local actualizado. JSON:', oneLine.length, 'caracteres');
