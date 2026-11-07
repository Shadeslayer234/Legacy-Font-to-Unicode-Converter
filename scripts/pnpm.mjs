// Runs pnpm with the given arguments using the same pnpm that is running the current script,
// so the root scripts also work when pnpm is only reachable as `corepack pnpm` and isn't on PATH.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const pnpm = process.env.npm_execpath;

const result = pnpm
  ? spawnSync(process.execPath, [pnpm, ...args], { stdio: "inherit" })
  : spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
