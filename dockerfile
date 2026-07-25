# Prisma 7 exige node ^20.19 || ^22.12 || >=24.0 (usa require() sobre módulos ESM,
# que Node 21 no soporta). Con node:21 el `prisma generate` falla con ERR_REQUIRE_ESM.
#
# Debian (slim) en lugar de Alpine: better-sqlite3 se instala con
# `prebuild-install || node-gyp rebuild`, y no hay prebuilds publicados para musl.
# En Alpine habría que compilarlo con build-base + python3; acá baja el binario listo.
FROM node:22-slim

# La imagen base no incluye pnpm. Corepack viene con Node y lo instala sin bajar nada global.
# La versión se fija a la major que generó el pnpm-lock.yaml (lockfileVersion 9.0).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Prisma lo pide explícitamente en su postinstall; sin esto avisa que no puede
# detectar la versión de libssl y cae a un default.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
COPY pnpm-lock.yaml ./
# Sin este archivo pnpm no sabe qué postinstall tiene permitido correr y deja
# better-sqlite3 sin su binding nativo (falla recién en runtime, al abrir la conexión).
COPY pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]
