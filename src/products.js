import { randomUUID } from 'node:crypto';

const statuses = new Set(['ACTIVE', 'INACTIVE', 'DISCONTINUED']);
const sortFields = new Set(['name', 'price', 'stock', 'status', 'createdAt']);

/** Error returned when an HTTP request cannot be processed. */
export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** A small in-memory repository suitable for local API integration work. */
export class ProductRepository {
  #products;

  constructor(seed = createSeed()) {
    this.#products = seed.map((product) => ({ ...product }));
  }

  list(query) {
    const page = parsePositiveInteger(query.page, 'page', 1, 1, 100_000);
    const pageSize = parsePositiveInteger(query.pageSize, 'pageSize', 10, 1, 100);
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';
    if (!sortFields.has(sortBy)) throw invalid('sortBy must be name, price, stock, status or createdAt.');
    if (!['asc', 'desc'].includes(sortDirection)) throw invalid('sortDirection must be asc or desc.');
    const status = query.status;
    if (status !== undefined && !statuses.has(status)) throw invalid('status must be ACTIVE, INACTIVE or DISCONTINUED.');
    const minPrice = parseOptionalNumber(query.minPrice, 'minPrice');
    const maxPrice = parseOptionalNumber(query.maxPrice, 'maxPrice');
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw invalid('minPrice cannot exceed maxPrice.');
    const inStock = parseOptionalBoolean(query.inStock, 'inStock');
    const search = query.search?.trim().toLocaleLowerCase();

    const filtered = this.#products.filter((product) => {
      const searchable = `${product.name} ${product.sku} ${product.description ?? ''}`.toLocaleLowerCase();
      return (!search || searchable.includes(search)) &&
        (!status || product.status === status) &&
        (minPrice === undefined || product.price >= minPrice) &&
        (maxPrice === undefined || product.price <= maxPrice) &&
        (inStock === undefined || (inStock ? product.stock > 0 : product.stock === 0));
    });
    const direction = sortDirection === 'asc' ? 1 : -1;
    filtered.sort((left, right) => compare(left[sortBy], right[sortBy]) * direction || left.id.localeCompare(right.id));
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages > 0 && page > totalPages) throw invalid('page exceeds the available pages.');
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      pagination: { page, pageSize, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  get(id) {
    const product = this.#products.find((item) => item.id === id);
    if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    return product;
  }

  create(input) {
    const attributes = validateProduct(input);
    const now = new Date().toISOString();
    const product = { id: randomUUID(), ...attributes, createdAt: now, updatedAt: now };
    this.#products.push(product);
    return product;
  }

  replace(id, input) {
    const index = this.#products.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    const attributes = validateProduct(input);
    const product = { id, ...attributes, createdAt: this.#products[index].createdAt, updatedAt: new Date().toISOString() };
    this.#products[index] = product;
    return product;
  }

  remove(id) {
    const index = this.#products.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    this.#products.splice(index, 1);
  }
}

function validateProduct(input) {
  if (!isRecord(input)) throw invalid('The request body must be a JSON object.');
  const allowed = new Set(['name', 'description', 'sku', 'price', 'stock', 'status']);
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  if (unknown) throw invalid(`Unknown property: ${unknown}.`);
  if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 120) throw invalid('name must contain 2 to 120 characters.');
  if (!Object.hasOwn(input, 'description') || (input.description !== null && (typeof input.description !== 'string' || input.description.length > 1_000))) throw invalid('description is required and must be null or a string of at most 1000 characters.');
  if (typeof input.sku !== 'string' || !/^[A-Z0-9-]{3,32}$/.test(input.sku)) throw invalid('sku must match ^[A-Z0-9-]{3,32}$.');
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0) throw invalid('price must be a non-negative number.');
  if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 2_147_483_647) throw invalid('stock must be a non-negative integer.');
  if (!statuses.has(input.status)) throw invalid('status must be ACTIVE, INACTIVE or DISCONTINUED.');
  return { name: input.name.trim(), description: input.description, sku: input.sku, price: input.price, stock: input.stock, status: input.status };
}

function createSeed() {
  const now = '2026-01-15T10:00:00.000Z';
  return [
    { id: 'b81a7236-2283-46b6-9476-d42c85e746c0', name: 'Teclado mecánico', description: 'Interruptores táctiles y distribución ISO.', sku: 'KEY-001', price: 89.95, stock: 24, status: 'ACTIVE', createdAt: now, updatedAt: now },
    { id: '6984f05f-3ec2-4f6d-a592-510b5328b317', name: 'Ratón ergonómico', description: null, sku: 'MOUSE-002', price: 42.5, stock: 0, status: 'INACTIVE', createdAt: '2026-02-02T10:00:00.000Z', updatedAt: '2026-02-02T10:00:00.000Z' },
  ];
}

function invalid(message) { return new ApiError(400, 'VALIDATION_ERROR', message); }
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function parsePositiveInteger(value, field, fallback, min, max) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw invalid(`${field} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw invalid(`${field} must be between ${min} and ${max}.`);
  return parsed;
}
function parseOptionalNumber(value, field) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw invalid(`${field} must be a non-negative number.`);
  return parsed;
}
function parseOptionalBoolean(value, field) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw invalid(`${field} must be true or false.`);
}
function compare(left, right) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}
