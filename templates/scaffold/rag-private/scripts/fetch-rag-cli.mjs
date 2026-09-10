import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const localEnvPath = resolve(scriptDir, '..', '.env.local');
if (existsSync(localEnvPath)) dotenv.config({ path: localEnvPath, quiet: true });

const url = process.env.RAG_ARTIFACT_URL;
const token = process.env.RAG_ARTIFACT_TOKEN;

if (!url) throw new Error('RAG_ARTIFACT_URL is not set in .env.local — see .env.example.');
if (!token) throw new Error('RAG_ARTIFACT_TOKEN is not set in .env.local — see .env.example.');

const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  throw new Error(`Failed to fetch the RAG CLI bundle: ${res.status} ${res.statusText} from ${url}`);
}

const outPath = resolve(scriptDir, '..', 'dist', 'rag-cli.mjs');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));

console.log(`Fetched dist/rag-cli.mjs from ${url}`);
