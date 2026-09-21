import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { openApiDocument } from './openapi.js';
import { ApiError, ProductRepository } from './products.js';

const products = new ProductRepository();
const API_DELAY_MIN_MS = 200;
const API_DELAY_MAX_MS = 900;

/** Creates the HTTP server; exported to allow integration tests without a fixed port. */
export function createApiServer(repository = products) {
  return createServer(async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') return sendEmpty(response, 204);
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });
      if (request.method === 'GET' && url.pathname === '/openapi.json') return sendJson(response, 200, openApiDocument);
      if (request.method === 'GET' && url.pathname === '/docs') return sendHtml(response, swaggerUiHtml());
      const match = url.pathname.match(/^\/api\/v1\/products(?:\/([0-9a-f-]+))?$/i);
      if (!match) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
      await wait(randomApiDelay());
      const id = match[1];
      if (!id && request.method === 'GET') return sendJson(response, 200, repository.list(Object.fromEntries(url.searchParams)));
      if (!id && request.method === 'POST') return sendJson(response, 201, repository.create(await readJson(request)));
      if (id && request.method === 'GET') return sendJson(response, 200, repository.get(id));
      if (id && request.method === 'PUT') return sendJson(response, 200, repository.replace(id, await readJson(request)));
      if (id && request.method === 'DELETE') { repository.remove(id); return sendEmpty(response, 204); }
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
      if (apiError.status === 500) console.error(error);
      sendJson(response, apiError.status, { status: apiError.status, code: apiError.code, message: apiError.message, details: apiError.details ?? null });
    }
  });
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1_048_576) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'JSON body cannot exceed 1 MiB.');
    chunks.push(chunk);
  }
  if (length === 0) throw new ApiError(400, 'INVALID_JSON', 'A JSON request body is required.');
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'The request body is not valid JSON.'); }
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendJson(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); }
function sendEmpty(response, status) { response.writeHead(status); response.end(); }
function sendHtml(response, html) { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(html); }
function randomApiDelay() {
  return Math.floor(Math.random() * (API_DELAY_MAX_MS - API_DELAY_MIN_MS + 1)) + API_DELAY_MIN_MS;
}
function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function swaggerUiHtml() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angular Base API</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui',persistAuthorization:true});</script></body></html>`;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.env.PORT ?? 3000);
  createApiServer().listen(port, () => console.log(`API listening at http://localhost:${port} (Swagger: /docs)`));
}
