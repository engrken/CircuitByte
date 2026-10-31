import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('public storefront keeps accessible search, filters and cart hooks', () => {
  for (const id of ['search', 'categories', 'sort', 'products', 'empty', 'reset', 'cart-open', 'cart-dialog', 'cart-lines', 'cart-count', 'checkout', 'order-result']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'Missing storefront hook: ' + id);
  }
  assert.match(html, /<label[^>]*for="search"/);
  assert.match(html, /type="search"/);
  assert.match(html, /<script src="app\.js" defer><\/script>/);
});

test('checkout preserves guest ordering and optional Studio consent', () => {
  assert.match(html, /<form id="checkout">/);
  assert.match(html, /name="name"[^>]*required/);
  assert.match(html, /name="contact"[^>]*required/);
  assert.match(html, /name="location"[^>]*required/);
  assert.match(html, /id="studio-invite"[^>]*type="checkbox"|type="checkbox"[^>]*id="studio-invite"/);
  assert.match(html, /id="studio-email"[^>]*disabled/);
});

test('learning and DIY links remain available in storefront navigation', () => {
  for (const route of ['/learn', '/diy', '/studio', '/dashboard', '/track.html']) {
    assert.ok(html.includes('href="' + route + '"'), 'Missing navigation link: ' + route);
  }
});

test('database connection uses environment variables rather than hardcoded credentials', () => {
  const db = read('lib/database-url.mjs');
  assert.match(db, /process\.env\.DATABASE_URL/);
  assert.match(db, /process\.env\.circuitbyte_DATABASE_URL/);
  assert.doesNotMatch(db, /postgres(?:ql)?:\/\/[^\s"'\x60]+@/i);
});
