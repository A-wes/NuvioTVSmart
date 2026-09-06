# Serves the Nuvio browser app (`npm run build` -> dist/) as static files behind nginx.
#
# The backend is NOT baked in. js/config.js reads globalThis.__NUVIO_ENV__, which comes from
# dist/nuvio.env.js, so that one file is regenerated from environment variables on every
# container start (docker/docker-entrypoint.d/40-nuvio-runtime-env.sh). One published image
# therefore works against any self-hosted backend, and no publishable key ends up in a layer.

# The app build is pure JS, so it runs natively on the build host and its output is copied
# into whichever target arch is being assembled - no emulated npm ci per platform.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# No local.properties: the build emits an unconfigured nuvio.env.js (a warning, not an error,
# unless NUVIO_REQUIRE_CONFIGURED_ENV is set) and the entrypoint overwrites it at runtime.
RUN node ./scripts/build.mjs

FROM nginx:1.29-alpine
# node is the runtime env generator - it reuses the repo's own scripts/envProperties.mjs so the
# key list and defaults stay in sync with upstream instead of being duplicated here.
RUN apk add --no-cache nodejs
COPY --from=build /src/dist /usr/share/nginx/html
COPY --from=build /src/scripts/envProperties.mjs /opt/nuvio/envProperties.mjs
COPY docker/write-runtime-env.mjs /opt/nuvio/write-runtime-env.mjs
COPY docker/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.d/40-nuvio-runtime-env.sh /docker-entrypoint.d/40-nuvio-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/40-nuvio-runtime-env.sh
ENV NUVIO_RUNTIME_ENV_TARGET=/usr/share/nginx/html/nuvio.env.js
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/.well-known/nuvio-web || exit 1
