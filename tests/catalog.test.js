import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyToCents, validateProduct, productRow } from '../src/catalog.js';

test('money uses integer minor units and rejects excess precision', () => {
  assert.equal(moneyToCents('2500.50'), 250050);
  assert.equal(moneyToCents('0.05'), 5);
  assert.equal(moneyToCents('10.001'), null);
  assert.equal(moneyToCents('-3'), null);
});

test('required fields, duplicate options, and images are checked before upload', () => {
  const data = { sku: 'EE-001', category: 'Baskets', nameEn: 'Basket', nameSi: 'කූඩය',
    price: '1200', variants: [{ sku: 'EE-001', size: 'Large', colour: '', price: '' }] };
  const image = { file: { name: 'front.jpg', type: 'image/jpeg', size: 2000 }, uploadId: 'f1', altEn: '', altSi: '' };
  assert.equal(validateProduct(data, [image]).errors['variant-0'], 'Option SKUs must be unique.');
  data.variants[0].sku = 'EE-001-L';
  assert.deepEqual(validateProduct(data, [image]).errors, {});
  assert.equal(validateProduct(data, []).errors.images, 'Add at least one product photo.');
});

test('product row preserves image order and maps option override into cents', () => {
  const data = { sku: 'ee-001', category: 'Home', nameEn: 'Basket', nameSi: 'කූඩය',
    descriptionEn: '', descriptionSi: '', price: '1800.00',
    variants: [{ sku: 'ee-001-l', size: 'Large', colour: '', price: '2200.50' }] };
  const images = [{ file: { name: 'front.jpg' }, uploadId: 'f1', altEn: '', altSi: '' }];
  const row = productRow(data, images, { $id: 'u1', email: 'owner@example.com' }, 'submission-1');
  assert.equal(row.base_price_cents, 180000);
  assert.equal(JSON.parse(row.variants_json)[0].price_override_cents, 220050);
  assert.deepEqual(JSON.parse(row.images_json).map(v => [v.file_id, v.sort_order]), [['f1', 0]]);
});
