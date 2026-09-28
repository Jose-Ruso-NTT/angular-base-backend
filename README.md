# Backend mínimo para Angular Base

API REST sin dependencias de producción: usa únicamente `node:http` de Node 22 y una colección en memoria. Está pensada para que el frontend pueda consumir una API real desde el primer momento, sin base de datos ni infraestructura adicional.

## Repositorio relacionado

El cliente que consume esta API está en el repositorio independiente [angular-base](https://github.com/Jose-Ruso-NTT/angular-base).

## Puesta en marcha

```bash
npm install
npm start
```

- Swagger UI: `http://localhost:3000/docs`
- Especificación OpenAPI 3.0.3: `http://localhost:3000/openapi.json`
- Comprobación de salud: `http://localhost:3000/health`

La entidad es `Product`. Sus datos se reinician al detener el proceso.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/v1/products` | Listado paginado |
| POST | `/api/v1/products` | Crear |
| GET | `/api/v1/products/{productId}` | Consultar uno |
| PUT | `/api/v1/products/{productId}` | Sustituir uno |
| DELETE | `/api/v1/products/{productId}` | Eliminar |

Parámetros de listado: `page` (1+), `pageSize` (1–100), `sortBy` (`name`, `price`, `stock`, `status`, `createdAt`), `sortDirection` (`asc`, `desc`), `search`, `status`, `minPrice`, `maxPrice` e `inStock`.

Ejemplo:

```text
GET /api/v1/products?status=ACTIVE&sortBy=price&sortDirection=asc&page=1&pageSize=10
```

El documento OpenAPI declara explícitamente todos los cuerpos de petición y respuesta, propiedades requeridas, `nullable`, formatos (`uuid`, `date-time`, `double`, `int32`), límites y enumeraciones. Ejecuta `npm test` para verificar el CRUD, el listado y el contrato OpenAPI.
