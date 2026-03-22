import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const rootDir = process.cwd();

function commandName(command) {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function run(command, args) {
  const result = spawnSync(commandName(command), args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Ensure pnpm is available before proceeding
const pnpmCheck = spawnSync(commandName("pnpm"), ["--version"], { shell: false });
if (pnpmCheck.error || pnpmCheck.status !== 0) {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const pnpmVersion = pkg.packageManager?.replace("pnpm@", "") ?? "latest";
  console.log(`pnpm not found. Installing pnpm@${pnpmVersion} via npm...`);
  run("npm", ["install", "-g", `pnpm@${pnpmVersion}`]);
}

console.log("Ensuring local app env files...");
run("node", ["scripts/ensure-dev-env.mjs"]);

console.log("Installing Node workspace dependencies...");
run("pnpm", ["install"]);

console.log("Syncing backend Python environment...");
run("uv", ["sync", "--project", "apps/backend"]);

console.log("Syncing ai-worker Python environment...");
run("uv", ["sync", "--project", "apps/ai-worker"]);

console.log("Setup complete. Run `pnpm dev` to start the local stack.");
