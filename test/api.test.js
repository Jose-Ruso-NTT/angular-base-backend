import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer } from '../src/server.js';
import { ProductRepository } from '../src/products.js';

async function withServer(run) {
  const server = createApiServer(new ProductRepository());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('lists products with filtering, sorting and pagination', async () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/products?status=ACTIVE&sortBy=price&sortDirection=asc&page=1&pageSize=1`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].sku, 'KEY-001');
  assert.deepEqual(body.pagination, { page: 1, pageSize: 1, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
}));

test('creates, gets, replaces and deletes a product', async () => withServer(async (baseUrl) => {
  const input = { name: 'Base para portátil', description: null, sku: 'STAND-003', price: 34.9, stock: 10, status: 'ACTIVE' };
  const created = await fetch(`${baseUrl}/api/v1/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  assert.equal(created.status, 201);
  const product = await created.json();
  assert.equal(product.description, null);
  const updated = await fetch(`${baseUrl}/api/v1/products/${product.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, stock: 3 }) });
  assert.equal((await updated.json()).stock, 3);
  assert.equal((await fetch(`${baseUrl}/api/v1/products/${product.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${baseUrl}/api/v1/products/${product.id}`)).status, 404);
}));

test('publishes an OpenAPI 3 document with nullable and required input fields', async () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/openapi.json`);
  const document = await response.json();
  assert.equal(document.openapi, '3.0.3');
  assert.equal(document.components.schemas.ProductInput.properties.description.nullable, true);
  assert.deepEqual(document.components.schemas.ProductInput.required, ['name', 'description', 'sku', 'price', 'stock', 'status']);
}));

test('requires nullable description to be explicitly present', async () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/v1/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Producto sin descripción', sku: 'NO-DESC', price: 1, stock: 0, status: 'ACTIVE' }) });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'VALIDATION_ERROR');
}));
