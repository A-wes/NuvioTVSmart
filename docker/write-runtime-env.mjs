// Regenerates dist/nuvio.env.js at container start.
//
// Sources, lowest precedence first:
//   1. upstream defaults          (normalizeEnvProperties in scripts/envProperties.mjs)
//   2. NUVIO_LOCAL_PROPERTIES     (optional: a mounted local.properties-format file)
//   3. process.env                (one variable per ENV_PROPERTY_KEYS entry)
//
// ENV_PROPERTY_KEYS and buildRuntimeEnvScript are imported rather than reimplemented, so a key
// added upstream is picked up with no change here.

import { readFile, writeFile } from "node:fs/promises";
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

const source = propertiesPath ? `${propertiesPath} + environment` : "environment";
console.log(
  `nuvio: wrote ${target} from ${source} (${fromEnvironment.length} of ${ENV_PROPERTY_KEYS.length} keys set via env)`
);
if (!properties.NUVIO_SUPABASE_URL) {
  console.warn("nuvio: NUVIO_SUPABASE_URL is empty - the app will have no backend to talk to");
}
