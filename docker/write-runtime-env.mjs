// Regenerates dist/nuvio.env.js at container start.
//
// Sources, lowest precedence first:
//   1. upstream defaults          (normalizeEnvProperties in scripts/envProperties.mjs)
//   2. NUVIO_LOCAL_PROPERTIES     (optional: a mounted local.properties-format file)
//   3. process.env                (one variable per ENV_PROPERTY_KEYS entry)
//
// ENV_PROPERTY_KEYS and buildRuntimeEnvScript are imported rather than reimplemented, so a key
// added upstream is picked up with no change here.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV_PROPERTY_KEYS, parseProperties, buildRuntimeEnvScript } from "./envProperties.mjs";

const target =
  process.argv[2] || process.env.NUVIO_RUNTIME_ENV_TARGET || "/usr/share/nginx/html/nuvio.env.js";

const properties = {};

const propertiesPath = process.env.NUVIO_LOCAL_PROPERTIES || "";
if (propertiesPath) {
  Object.assign(properties, parseProperties(await readFile(propertiesPath, "utf8")));
}

const fromEnvironment = [];
for (const key of ENV_PROPERTY_KEYS) {
  const value = process.env[key];
  if (typeof value === "string" && value !== "") {
    properties[key] = value;
    fromEnvironment.push(key);
  }
}

await writeFile(target, buildRuntimeEnvScript(properties), "utf8");

// Small machine-readable twin of the above, for uptime checks. index.html is baked into the
// image and returns 200 even if this script never ran, so "is it serving" says nothing about
// "is it configured"; this doc answers the second question in one field.
const discoveryPath = path.join(path.dirname(target), ".well-known", "nuvio-web");
await mkdir(path.dirname(discoveryPath), { recursive: true });
await writeFile(
  discoveryPath,
  `${JSON.stringify(
    {
      service: "nuvio-web",
      backend_url: properties.NUVIO_SUPABASE_URL || "",
      tv_login_web_base_url: properties.TV_LOGIN_WEB_BASE_URL || "",
      configured: Boolean(properties.NUVIO_SUPABASE_URL && properties.NUVIO_SUPABASE_ANON_KEY)
    },
    null,
    2
  )}\n`,
  "utf8"
);

const source = propertiesPath ? `${propertiesPath} + environment` : "environment";
console.log(
  `nuvio: wrote ${target} from ${source} (${fromEnvironment.length} of ${ENV_PROPERTY_KEYS.length} keys set via env)`
);
if (!properties.NUVIO_SUPABASE_URL) {
  console.warn("nuvio: NUVIO_SUPABASE_URL is empty - the app will have no backend to talk to");
}
