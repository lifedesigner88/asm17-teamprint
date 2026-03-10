import { spawnSync } from "node:child_process";

const result = spawnSync("uv", ["run", "pytest", "tests"], {
  cwd: "apps/backend",
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
