import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envText = fs.readFileSync(path.join(root, '.env.local'), 'utf8');

for (const line of envText.split('\n')) {
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
  process.env[key] = value;
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error('MISSING FIREBASE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
  console.log('JSON parse OK, project:', parsed.project_id);
} catch (error) {
  console.error('JSON parse FAIL:', error.message);
  process.exit(1);
}

const { cert, getApps, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
try {
  await db.collection('employees').limit(1).get();
  console.log('Firestore read OK');
} catch (error) {
  console.error('Firestore read FAIL:', error.code, error.message);
  if (error.details) console.error('details:', error.details);
}

try {
  const { getAuth } = await import('firebase-admin/auth');
  const users = await getAuth().listUsers(1);
  console.log('Auth listUsers OK:', users.users.length);
} catch (error) {
  console.error('Auth listUsers FAIL:', error.code, error.message);
}

try {
  const testUid = 'test-session-check';
  await db.collection('auth_sessions').doc(testUid).set({
    sessionId: 'test',
    updatedAt: new Date(),
  });
  await db.collection('auth_sessions').doc(testUid).delete();
  console.log('auth_sessions write OK');
} catch (error) {
  console.error('auth_sessions write FAIL:', error.message);
  process.exit(1);
}
