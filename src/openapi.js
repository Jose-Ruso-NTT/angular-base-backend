export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Angular Base API', version: '1.0.0', description: 'API de ejemplo para integrar el frontend Angular. Los datos se mantienen en memoria y se reinician al parar el servidor.' },
  servers: [{ url: 'http://localhost:3000', description: 'Desarrollo local' }],
  tags: [{ name: 'Products', description: 'Catálogo de productos.' }],
  paths: {
    '/api/v1/products': {
      get: { tags: ['Products'], summary: 'Lista productos con filtros, ordenación y paginación', operationId: 'listProducts', parameters: [
        parameter('page', 'integer', 'int32', 'Página a partir de 1.', false, { minimum: 1, default: 1 }),
        parameter('pageSize', 'integer', 'int32', 'Elementos por página.', false, { minimum: 1, maximum: 100, default: 10 }),
        parameter('sortBy', 'string', undefined, 'Campo de ordenación.', false, { enum: ['name', 'price', 'stock', 'status', 'createdAt'], default: 'createdAt' }),
        parameter('sortDirection', 'string', undefined, 'Sentido de ordenación.', false, { enum: ['asc', 'desc'], default: 'desc' }),
        parameter('search', 'string', undefined, 'Busca por nombre, SKU o descripción.', false, { minLength: 1, maxLength: 120 }),
        parameter('status', 'string', undefined, 'Filtra por estado.', false, { enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] }),
        parameter('minPrice', 'number', 'double', 'Precio mínimo inclusivo.', false, { minimum: 0 }),
        parameter('maxPrice', 'number', 'double', 'Precio máximo inclusivo.', false, { minimum: 0 }),
        parameter('inStock', 'boolean', undefined, 'true incluye existencias; false solo productos agotados.', false),
      ], responses: { '200': response('Página de productos.', 'ProductPage'), '400': response('Consulta no válida.', 'Error') } },
      post: { tags: ['Products'], summary: 'Crea un producto', operationId: 'createProduct', requestBody: requestBody('ProductInput'), responses: { '201': response('Producto creado.', 'Product'), '400': response('Cuerpo no válido.', 'Error') } },
    },
    '/api/v1/products/{productId}': {
      parameters: [{ name: 'productId', in: 'path', description: 'Identificador del producto.', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: { tags: ['Products'], summary: 'Obtiene un producto', operationId: 'getProduct', responses: { '200': response('Producto encontrado.', 'Product'), '404': response('No existe.', 'Error') } },
      put: { tags: ['Products'], summary: 'Sustituye un producto', operationId: 'replaceProduct', requestBody: requestBody('ProductInput'), responses: { '200': response('Producto actualizado.', 'Product'), '400': response('Cuerpo no válido.', 'Error'), '404': response('No existe.', 'Error') } },
      delete: { tags: ['Products'], summary: 'Elimina un producto', operationId: 'deleteProduct', responses: { '204': { description: 'Producto eliminado.' }, '404': response('No existe.', 'Error') } },
    },
  },
  components: { schemas: {
    ProductInput: { type: 'object', additionalProperties: false, required: ['name', 'description', 'sku', 'price', 'stock', 'status'], properties: {
      name: { type: 'string', minLength: 2, maxLength: 120, example: 'Teclado mecánico' },
      description: { type: 'string', nullable: true, maxLength: 1000, example: 'Interruptores táctiles y distribución ISO.' },
      sku: { type: 'string', pattern: '^[A-Z0-9-]{3,32}$', example: 'KEY-001' },
      price: { type: 'number', format: 'double', minimum: 0, example: 89.95 },
      stock: { type: 'integer', format: 'int32', minimum: 0, maximum: 2147483647, example: 24 },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'], example: 'ACTIVE' },
    } },
    Product: { type: 'object', additionalProperties: false, required: ['id', 'name', 'description', 'sku', 'price', 'stock', 'status', 'createdAt', 'updatedAt'], properties: {
      id: { type: 'string', format: 'uuid', readOnly: true },
      name: { type: 'string', minLength: 2, maxLength: 120 }, description: { type: 'string', nullable: true, maxLength: 1000 }, sku: { type: 'string', pattern: '^[A-Z0-9-]{3,32}$' },
      price: { type: 'number', format: 'double', minimum: 0 }, stock: { type: 'integer', format: 'int32', minimum: 0, maximum: 2147483647 }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] },
      createdAt: { type: 'string', format: 'date-time', readOnly: true }, updatedAt: { type: 'string', format: 'date-time', readOnly: true },
    } },
    Pagination: { type: 'object', required: ['page', 'pageSize', 'totalItems', 'totalPages', 'hasNextPage', 'hasPreviousPage'], properties: {
      page: { type: 'integer', format: 'int32', minimum: 1 }, pageSize: { type: 'integer', format: 'int32', minimum: 1, maximum: 100 }, totalItems: { type: 'integer', format: 'int32', minimum: 0 }, totalPages: { type: 'integer', format: 'int32', minimum: 0 }, hasNextPage: { type: 'boolean' }, hasPreviousPage: { type: 'boolean' },
    } },
    ProductPage: { type: 'object', required: ['data', 'pagination'], properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, pagination: { $ref: '#/components/schemas/Pagination' } } },
    Error: { type: 'object', required: ['status', 'code', 'message'], properties: { status: { type: 'integer', format: 'int32', minimum: 400, maximum: 599 }, code: { type: 'string', example: 'VALIDATION_ERROR' }, message: { type: 'string' }, details: { type: 'object', nullable: true, additionalProperties: true } } },
  } },
};

function parameter(name, type, format, description, required, extra = {}) { return { name, in: 'query', description, required, schema: { type, ...(format ? { format } : {}), ...extra } }; }
function response(description, schema) { return { description, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } }; }
function requestBody(schema) { return { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } }; }
