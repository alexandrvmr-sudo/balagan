/* Подхватывает .env рядом с сервером, если он есть. Импортируется первым. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(file)) {
  try { process.loadEnvFile(file); } catch (e) { console.warn('[env] не прочитал .env:', e?.message); }
}
