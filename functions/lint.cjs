const {spawnSync} = require("node:child_process");
const path = require("node:path");

const eslintPath = path.join(
  __dirname,
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);

const result = spawnSync(
  process.execPath,
  [eslintPath, "--ext", ".js,.ts", "."],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      ESLINT_USE_FLAT_CONFIG: "false",
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;