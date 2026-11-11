import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../public/catalog.html', import.meta.url), 'utf8');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('dedicated catalog keeps accessible search, filters and cart hooks', () => {
  for (const id of ['search', 'categories', 'sort', 'products', 'empty', 'reset', 'cart-open', 'cart-dialog', 'cart-lines', 'cart-count', 'checkout', 'order-result']) {
    assert.match(catalog, new RegExp('id="' + id + '"'), 'Missing catalog hook: ' + id);
  }
  assert.match(catalog, /<label[^>]*for="search"/);
  assert.match(catalog, /type="search"/);
  assert.match(catalog, /<script src="\/app\.js" defer><\/script>/);
  assert.match(html, /href="\/catalog"/);
});

test('both storefront entry points require a CircuitByte account for checkout', () => {
 for(const page of [html,catalog]){
  assert.match(page, /<form id="checkout" hidden>/);
  assert.match(page, /href="\/dashboard\?checkout=1"/);
  assert.match(page, /name="paymentMethod"/);
  assert.match(page, /href="\/catalog"[^>]*>Shop<\/a>/);
  assert.match(page, /id="detail-wire-length"/);
  assert.match(page, /name="fulfillmentMethod"/);
  assert.match(page, /name="deliveryFeeAccepted"/);
  assert.match(page, /href="\/privacy"/);
  assert.doesNotMatch(page, /id="otp-request"|messenger\.com/i);
  assert.match(page, /href="\/faq"/);
  assert.match(page, /id="qr-checkout-note"[^>]+hidden/);
 }
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
