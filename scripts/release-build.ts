import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJsonPath = join(projectRoot, "package.json");
const outputDir = join(projectRoot, "dist", "release");
const minBunVersion: [number, number, number] = [1, 3, 13];

const targets = [
  { fileName: "cinex-linux-x64", target: "bun-linux-x64", binding: "core-linux-x64" },
  { fileName: "cinex-macos-arm64", target: "bun-darwin-arm64", binding: "core-darwin-arm64" },
  { fileName: "cinex-macos-x64", target: "bun-darwin-x64", binding: "core-darwin-x64" },
  { fileName: "cinex-windows-x64.exe", target: "bun-windows-x64", binding: "core-win32-x64" }
];

function isSupportedBunVersion(version: string): boolean {
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
  return major > minBunVersion[0]
    || (major === minBunVersion[0] && minor > minBunVersion[1])
    || (major === minBunVersion[0] && minor === minBunVersion[1] && patch >= minBunVersion[2]);
}

async function run(command: string[], cwd = projectRoot): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdio: ["inherit", "inherit", "inherit"] });
  await process.exited;
  if (process.exitCode !== 0) {
    throw new Error(`El comando fallo: ${command.join(" ")}`);
  }
}

async function ensureOpenTuiBinding(binding: string): Promise<void> {
  const packageName = `@opentui/${binding}`;
  const packagePath = join(projectRoot, "node_modules", "@opentui", binding);
  if (existsSync(packagePath)) return;

  const corePackage = await Bun.file(join(projectRoot, "node_modules", "@opentui", "core", "package.json")).json() as {
    optionalDependencies?: Record<string, string>;
  };
  const version = corePackage.optionalDependencies?.[packageName];
  if (!version) {
    throw new Error(`No se encontro la version de ${packageName} en @opentui/core.`);
  }

  const tarballPath = join(tmpdir(), `${binding}-${version}.tgz`);
  const response = await fetch(`https://registry.npmjs.org/@opentui/${binding}/-/${binding}-${version}.tgz`);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${packageName}@${version}.`);
  }

  await writeFile(tarballPath, Buffer.from(await response.arrayBuffer()));
  await mkdir(packagePath, { recursive: true });
  try {
    await run(["tar", "-xzf", tarballPath, "-C", packagePath, "--strip-components=1"]);
  } finally {
    await rm(tarballPath, { force: true });
  }
}

async function main() {
  if (!isSupportedBunVersion(Bun.version)) {
    throw new Error(`Bun ${minBunVersion.join(".")} o superior es requerido. Version actual: ${Bun.version}. Ejecuta \`bun upgrade\` antes de generar el release.`);
  }

  const projectPackage = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version: string };
  const releaseDir = join(outputDir, `v${projectPackage.version}`);

  await Promise.all(targets.map(({ binding }) => ensureOpenTuiBinding(binding)));
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });

  for (const { fileName, target } of targets) {
    const outputPath = join(releaseDir, fileName);
    console.log(`\nCompilando ${fileName}...`);
    await run([
      process.execPath,
      "build",
      "--compile",
      "--minify",
      "./src/index.tsx",
      `--outfile=${outputPath}`,
      `--target=${target}`
    ]);
  }

  const checksums = await Promise.all(targets.map(async ({ fileName }) => {
    const file = await readFile(join(releaseDir, fileName));
    const hash = createHash("sha256").update(file).digest("hex");
    return `${hash}  ${fileName}`;
  }));
  await writeFile(join(releaseDir, "SHA256SUMS"), `${checksums.join("\n")}\n`);

  console.log(`\nRelease v${projectPackage.version} listo en ${releaseDir}`);
}

await main();
