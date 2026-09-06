# Container image

`docker build -t nuvio-web .` from the repo root builds the browser app (`npm run build`) and
serves `dist/` with nginx on port 80.

Nothing is baked in. `js/config.js` reads `globalThis.__NUVIO_ENV__`, which is defined by
`dist/nuvio.env.js`; that file is regenerated on every container start by
`docker/write-runtime-env.mjs`, which imports `scripts/envProperties.mjs` so it always knows the
current key list and defaults.

Configure by setting any of `ENV_PROPERTY_KEYS` as environment variables:

```sh
docker run -p 8080:80 \
  -e NUVIO_SUPABASE_URL=https://nuvio.example.com \
  -e NUVIO_SUPABASE_ANON_KEY=<publishable key> \
  -e TV_LOGIN_WEB_BASE_URL=https://nuvio-web.example.com \
  -e AVATAR_PUBLIC_BASE_URL=https://nuvio.example.com/storage/v1/object/public/avatars \
  nuvio-web
```

Alternatively mount a `local.properties`-format file and point `NUVIO_LOCAL_PROPERTIES` at it;
environment variables still win over anything in that file.

`TV_LOGIN_WEB_BASE_URL` is this app's **own** public URL — it is the redirect base the QR sign-in
flow registers with the backend. In a browser it falls back to `window.location.origin`, so it only
has to be set explicitly for the packaged TV builds. (Upstream's `docs/client-configuration.md` in
the `self-host` repo calls this `TV_LOGIN_REDIRECT_BASE_URL` and tells you to append `/tv-login`;
both are stale — `scripts/envProperties.mjs` reads `TV_LOGIN_WEB_BASE_URL`, and
`qrLoginService.js` registers the base URL and its origin, not a `/tv-login` path.)

`.github/workflows/docker-publish.yml` publishes `linux/amd64` + `linux/arm64` to
`ghcr.io/<owner>/nuvio-web` on every push to `main`.

## Checking a running container

`/.well-known/nuvio-web` is written by the same entrypoint and reports what the app was actually
configured with — `index.html` is baked into the image and returns 200 regardless, so it cannot
tell "serving" apart from "serving, but unconfigured". The image healthcheck uses this path.

```console
$ curl -s http://localhost:8080/.well-known/nuvio-web
{
  "service": "nuvio-web",
  "backend_url": "https://nuvio.example.com",
  "tv_login_web_base_url": "https://nuvio-web.example.com",
  "configured": true
}
```
