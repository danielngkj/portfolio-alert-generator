import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectRoot, "data", "source", "alerts-ds.xlsx");
const publicDirectory = path.join(projectRoot, "public", "downloads");
const publicPath = path.join(publicDirectory, "alert-atlas-catalog.xlsx");

await mkdir(publicDirectory, { recursive: true });
await copyFile(sourcePath, publicPath);

console.log(`Published ${path.relative(projectRoot, sourcePath)} as ${path.relative(projectRoot, publicPath)}.`);
