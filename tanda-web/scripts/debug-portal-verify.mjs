import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv() {
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeAwb(value) {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

const env = loadEnv();
const awbArg = process.argv[2] ?? '12345';
const pinArg = process.argv[3] ?? '';

let json = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? '';
if (
  (json.startsWith("'") && json.endsWith("'")) ||
  (json.startsWith('"') && json.endsWith('"'))
) {
  json = json.slice(1, -1);
}

const serviceAccount = JSON.parse(json);
initializeApp({
  credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

console.log('--- Portal verify diagnostic ---');
console.log('AWB input:', awbArg, '→ normalized:', normalizeAwb(awbArg));
console.log('PIN provided:', pinArg ? `${pinArg.length} digits` : '(none — pass as 2nd arg)');
console.log('PORTAL_SESSION_SECRET:', env.PORTAL_SESSION_SECRET ? 'set' : 'MISSING');
console.log('');

const inspectionsSnap = await db
  .collection('cargo_inspections')
  .where('portalEnabled', '==', true)
  .get();

console.log(`Portal-enabled inspections: ${inspectionsSnap.size}`);

for (const doc of inspectionsSnap.docs) {
  const data = doc.data();
  const awb = data.awbNumber ?? '';
  const normalized = normalizeAwb(String(awb));
  const match = normalized === normalizeAwb(awbArg);
  console.log(`  - ${doc.id}: ULD=${data.uldId} AWB="${awb}" normalized="${normalized}" clientId=${data.portalClientId ?? 'NONE'} ${match ? '← AWB MATCH' : ''}`);
}

const clientsSnap = await db.collection('portal_clients').get();
console.log(`\nPortal clients: ${clientsSnap.size}`);

for (const doc of clientsSnap.docs) {
  const data = doc.data();
  const pinOk =
    pinArg && typeof data.pinHash === 'string'
      ? bcrypt.compareSync(pinArg.trim(), data.pinHash)
      : null;
  console.log(
    `  - ${doc.id}: ${data.companyName} (${data.accessCode}) active=${data.active} pinHash=${data.pinHash ? 'yes' : 'NO'}${pinOk === true ? ' ← PIN MATCH' : pinOk === false ? ' ← PIN wrong' : ''}`,
  );
}

if (!pinArg) {
  console.log('\nTip: node scripts/debug-portal-verify.mjs 12345 YOUR_PIN');
}

const allSnap = await db.collection('cargo_inspections').get();
console.log(`\nAll inspections (${allSnap.size}):`);
for (const doc of allSnap.docs) {
  const data = doc.data();
  console.log(
    `  - ${doc.id}: AWB="${data.awbNumber}" ULD=${data.uldId} portalEnabled=${data.portalEnabled ?? false} portalClientId=${data.portalClientId ?? 'none'}`,
  );
}
