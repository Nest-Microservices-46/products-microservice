# 🛒 Products Microservice

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">
  Microservicio de Productos, construido con <a href="http://nestjs.com/" target="blank">NestJS</a> y <a href="https://www.prisma.io/" target="blank">Prisma ORM</a> sobre SQLite.
</p>

---

**No expone HTTP.** Solo escucha mensajes de NATS: no hay controllers REST ni puerto en el que atender. Todo lo que entra viene del `client-gateway` o de `orders-ms`.

## 📬 Message Patterns

Usa **patrones objeto** — distinto de `orders-ms` (strings) y de `auth-ms`/`payments-ms` (strings con puntos). Con NATS cada patrón es un *subject*, así que tienen que coincidir exactamente con lo que manda el emisor.

| Patrón | Hace |
|---|---|
| `{ cmd: 'create_product' }` | Crea un producto |
| `{ cmd: 'find_all_products' }` | Lista paginada. **Solo productos con `available: true`** |
| `{ cmd: 'find_one_product' }` | Busca por id. **No** filtra por `available` |
| `{ cmd: 'update_product' }` | Actualiza |
| `{ cmd: 'remove_product' }` | Borrado **lógico**: pone `available: false` |
| `{ cmd: 'validate_products_exists' }` | Recibe un array de ids y devuelve los productos. Lo usa `orders-ms` |

Este servicio **nunca llama a otro**: solo recibe.

## 🗑️ Borrado lógico

`remove_product` no borra la fila, pone `available: false`. La razón es que las órdenes viejas siguen apuntando a productos que quizás ya no se venden: si se borrara de verdad, `orders-ms` no podría resolver el nombre ni el precio al mostrar una orden histórica.

Por eso `findOne` y `validate_products_exists` **no** filtran por `available`, y `findAll` sí. El modelo tiene un `@@index([available])` para eso.

## 📋 Requisitos Previos

- **Node.js 22** — Prisma 7 exige `^20.19 || ^22.12 || >=24`. Con Node 21 el `prisma generate` falla con `ERR_REQUIRE_ESM`
- **pnpm** (este servicio usa pnpm, no npm)
- **Docker** (para NATS, o para levantar todo el stack)

## 🛠️ Instalación

```bash
cd products-ms
pnpm install
npx prisma generate
```

> `prisma generate` no es opcional: Prisma 7 dejó de generar el cliente en el postinstall. Sin eso, TypeScript no encuentra `generated/prisma/client`.

## ⚙️ Variables de Entorno

```bash
cp .env.template .env
```

```env
PORT=3000
NATS_SERVERS="nats://localhost:4222"
DATABASE_URL=file:./dev.db
```

> `PORT` se valida pero **no se usa**: el servicio no escucha en ningún puerto. Está solo para satisfacer el schema de Joi.

## 🗄️ Base de datos (Prisma + SQLite)

```bash
npx prisma generate
npx prisma migrate dev
```

Tres diferencias con el resto de los servicios que rompen la costumbre:

- **El cliente se genera en `generated/prisma`**, no en `node_modules`. El import es `from 'generated/prisma/client'`, **no** `@prisma/client` (que sí es el correcto en `orders-ms`).
- El generador es `prisma-client` con `moduleFormat = "cjs"`. Sin esa línea, Prisma emite TypeScript ESM con `import.meta.url`, tsc lo transpila a CommonJS y deja el `import.meta` adentro — y Node revienta con `ReferenceError: exports is not defined in ES module scope`.
- **`schema.prisma` no declara `url`**: la connection string llega desde `prisma.config.ts`, que la lee de `DATABASE_URL`. Por eso los comandos del CLI dependen del `.env`.

La conexión usa el driver adapter `@prisma/adapter-better-sqlite3` (ver `src/prisma.service.ts`), no el motor nativo.

## ▶️ Ejecución

Lo normal es levantar todo el stack desde la raíz del proyecto:

```bash
docker compose up -d --build
```

Solo, con NATS ya corriendo:

```bash
pnpm start:dev
```

## 🧪 Testing

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

## ⚠️ Cosas a tener en cuenta

**`dev.db` vive adentro de la imagen de Docker.** `DATABASE_URL=file:./dev.db` resuelve a `/usr/src/app/dev.db`, que entra por el `COPY . .` del build. Consecuencias: lo que escribas en el contenedor **se pierde en cada rebuild**, y el `dev.db` de tu máquina nunca se toca. Para que persista necesita un volumen.

**En Docker usa Debian slim, no Alpine.** `better-sqlite3` se instala con `prebuild-install || node-gyp rebuild` y no publica binarios precompilados para musl, así que en Alpine habría que compilarlo (`build-base` + `python3`).

**El dockerfile copia `pnpm-workspace.yaml` antes del `pnpm install`.** pnpm 10 bloquea los scripts de postinstall salvo que el paquete esté listado en `onlyBuiltDependencies` de ese archivo. Sin eso `better-sqlite3` queda sin binding nativo y el error aparece recién en la primera query: `Could not locate the bindings file`. Ojo que `require('better-sqlite3')` **igual funciona** en ese estado — el binding se resuelve en `new Database()`, así que importar el módulo no prueba nada.

**Los errores usan `statusCode` en vez de `status`.** El filtro de excepciones del gateway solo entiende `status`, así que hoy todos los errores de este servicio llegan al cliente como **400**, incluso un producto inexistente que debería ser 404. En código nuevo va `status`.
