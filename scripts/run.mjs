import {spawn} from "node:child_process";
import {readFileSync, readdirSync, mkdirSync} from "node:fs";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
const tool = (name, binName = name) => {
  const directory = resolve(root, "node_modules", name);
  const pkg = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
  return resolve(directory, typeof pkg.bin === "string" ? pkg.bin : pkg.bin[binName]);
};
const env = {...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_LOG_PATH: resolve(root, ".wrangler/logs"), MINIFLARE_REGISTRY_PATH: resolve(root, ".wrangler/registry")};
mkdirSync(resolve(root, ".wrangler/logs"), {recursive: true});

async function run(args, timeout = 180_000) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, {cwd: root, env, stdio: "inherit", windowsHide: true});
    const timer = timeout ? setTimeout(() => { child.kill(); reject(new Error("Command timed out")); }, timeout) : null;
    child.once("error", reject);
    child.once("exit", code => { if (timer) clearTimeout(timer); if (code === 0) accept(); else reject(new Error(`Command failed (${code})`)); });
  });
}

try {
  if (command === "install:ci") {
    if (!process.env.npm_execpath) throw new Error("Run through npm run install:ci");
    await run([process.env.npm_execpath, "ci"], 600_000);
  } else if (command === "dev") await run([tool("vite"), "--host", "127.0.0.1"], 0);
  else if (command === "start") await run([tool("vinext"), "start"], 0);
  else if (command === "build") await run([tool("vinext"), "build"]);
  else if (command === "lint") await run([tool("eslint"), ".", "--ignore-pattern", "dist", "--ignore-pattern", ".next", "--ignore-pattern", ".wrangler", "--ignore-pattern", ".sites-runtime"]);
  else if (command === "typecheck") await run([tool("typescript", "tsc"), "--noEmit", "--incremental", "false"]);
  else if (command === "db:generate") await run([tool("drizzle-kit"), "generate"]);
  else if (command === "test") {
    await run([tool("vinext"), "build"]);
    await run(["--test", ...readdirSync(resolve(root, "tests")).filter(name => name.endsWith(".test.mjs")).map(name => `tests/${name}`)]);
  } else throw new Error(`Unknown command: ${command}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
