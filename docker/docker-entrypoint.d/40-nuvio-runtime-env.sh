#!/bin/sh
# Runs before nginx starts, via the stock nginx image entrypoint.
set -e
node /opt/nuvio/write-runtime-env.mjs "${NUVIO_RUNTIME_ENV_TARGET:-/usr/share/nginx/html/nuvio.env.js}"
