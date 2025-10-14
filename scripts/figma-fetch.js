#!/usr/bin/env node

import 'dotenv/config';
import fetch from 'node-fetch';
import minimist from 'minimist';
import { writeFile } from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import process from 'process';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. See .env.example`);
  }
  return value;
}

function optionalEnv(name, fallback = undefined) {
  const value = process.env[name];
  return value ?? fallback;
}

function resolveOutputDir() {
  const outDir = path.resolve(process.cwd(), 'figma-export');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  return outDir;
}

async function figmaGet(endpoint, token, params) {
  const url = new URL(`${FIGMA_API_BASE}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    headers: {
      'X-Figma-Token': token,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${endpoint} failed: ${res.status} ${res.statusText} -> ${text}`);
  }
  return res.json();
}

async function fetchFile(token, fileKey) {
  return figmaGet(`/files/${fileKey}`, token);
}

async function fetchFileStyles(token, fileKey) {
  return figmaGet(`/files/${fileKey}/styles`, token);
}

async function fetchFileComponents(token, fileKey) {
  return figmaGet(`/files/${fileKey}/components`, token);
}

async function fetchFileVariables(token, fileKey) {
  // Variables API is under /v1/files/:key/variables per updated API
  return figmaGet(`/files/${fileKey}/variables`, token);
}

async function fetchComments(token, fileKey) {
  return figmaGet(`/files/${fileKey}/comments`, token);
}

async function fetchNodes(token, fileKey, nodeIds) {
  return figmaGet(`/files/${fileKey}/nodes`, token, { ids: nodeIds.join(',') });
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    boolean: ['nodes'],
    string: ['fileKey', 'ids'],
    alias: { f: 'fileKey' },
  });

  const token = requireEnv('FIGMA_PERSONAL_ACCESS_TOKEN');
  const fileKey = args.fileKey || optionalEnv('FIGMA_FILE_KEY');
  if (!fileKey) {
    throw new Error('No --fileKey provided and FIGMA_FILE_KEY not set in env');
  }

  const outDir = resolveOutputDir();

  const [{ document, name, lastModified, version, role }, styles, components, variables, comments] = await Promise.all([
    fetchFile(token, fileKey),
    fetchFileStyles(token, fileKey),
    fetchFileComponents(token, fileKey),
    fetchFileVariables(token, fileKey).catch((e) => ({ error: e.message })),
    fetchComments(token, fileKey),
  ]);

  const baseMeta = { name, lastModified, version, role, fetchedAt: new Date().toISOString() };

  await writeFile(path.join(outDir, `file-${fileKey}.json`), JSON.stringify({ meta: baseMeta, document }, null, 2));
  await writeFile(path.join(outDir, `styles-${fileKey}.json`), JSON.stringify(styles, null, 2));
  await writeFile(path.join(outDir, `components-${fileKey}.json`), JSON.stringify(components, null, 2));
  await writeFile(path.join(outDir, `variables-${fileKey}.json`), JSON.stringify(variables, null, 2));
  await writeFile(path.join(outDir, `comments-${fileKey}.json`), JSON.stringify(comments, null, 2));

  if (args.nodes) {
    const idsArg = args.ids || process.env.FIGMA_NODE_IDS || '';
    const nodeIds = idsArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (nodeIds.length === 0) {
      console.error('No node IDs provided. Pass --ids comma-separated or set FIGMA_NODE_IDS.');
    } else {
      const nodes = await fetchNodes(token, fileKey, nodeIds);
      await writeFile(path.join(outDir, `nodes-${fileKey}.json`), JSON.stringify(nodes, null, 2));
    }
  }

  console.log(`Figma export complete to ${outDir}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
