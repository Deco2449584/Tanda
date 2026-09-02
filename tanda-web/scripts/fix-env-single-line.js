const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const obj = JSON.parse(
  fs.readFileSync(path.join(root, '.service-account.tmp.json'), 'utf8'),
);
const oneLine = JSON.stringify(obj);

const lines = fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n');
const out = [];
let skip = false;

for (const line of lines) {
  if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON')) {
    skip = true;
    out.push(`FIREBASE_SERVICE_ACCOUNT_JSON='${oneLine}'`);
    continue;
  }
  if (skip) {
    if (line.trim() === "'") {
      skip = false;
    }
    continue;
  }
  out.push(line);
}

fs.writeFileSync(path.join(root, '.env.local'), out.join('\n'), 'utf8');
console.log('OK:', oneLine.length, 'chars');
