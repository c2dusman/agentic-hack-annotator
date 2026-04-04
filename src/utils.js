const { v4: uuidv4 } = require('uuid');
const { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } = require('fs');
const { join } = require('path');

const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

function generateId() {
  return uuidv4();
}

function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function cleanupOldFiles() {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  const files = readdirSync(OUTPUT_DIR);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filepath = join(OUTPUT_DIR, file);
    const { mtimeMs } = statSync(filepath);
    if (now - mtimeMs > ONE_HOUR) {
      unlinkSync(filepath);
    }
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeFocus(focus) {
  if (!focus || typeof focus !== 'string') return null;
  const trimmed = focus.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

async function withJsonRetry(apiFn, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const rawText = await apiFn();
      const cleaned = stripMarkdownFences(rawText);
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}

module.exports = { generateId, ensureOutputDir, cleanupOldFiles, isValidUrl, sanitizeFocus, stripMarkdownFences, withJsonRetry, withTimeout };
