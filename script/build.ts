import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile, readdir } from "fs/promises";
import { join } from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google-cloud/storage",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "memorystore",
  "memoizee",
  "nanoid",
  "openai",
  "openid-client",
  "passport",
  "passport-local",
  "pdfkit",
  "pg",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Copy PDFKit font files to dist/data for PDF generation
  console.log("copying PDFKit fonts...");
  const fontSourceDir = join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  const fontDestDir = join(process.cwd(), "dist", "data");
  await mkdir(fontDestDir, { recursive: true });
  
  const fontFiles = await readdir(fontSourceDir);
  for (const file of fontFiles) {
    if (file.endsWith(".afm") || file.endsWith(".icc")) {
      await copyFile(join(fontSourceDir, file), join(fontDestDir, file));
    }
  }
  console.log(`copied ${fontFiles.length} font files to dist/data`);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
