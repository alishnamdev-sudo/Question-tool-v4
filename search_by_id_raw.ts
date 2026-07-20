import * as fs from "fs";
import * as path from "path";

const targetId = "69022339ae413f2843ac2c17";

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === "node_modules" || file === ".git" || file === "dist") continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file.endsWith(".json")) {
      callback(filePath);
    }
  }
}

const dataDir = path.join(process.cwd(), "src", "data");
console.log(`Searching for raw text of ID: ${targetId} across all JSON files in ${dataDir}`);

walkDir(dataDir, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const idx = content.indexOf(targetId);
  if (idx !== -1) {
    console.log(`\n========================================`);
    console.log(`FOUND RAW ID in file: ${path.basename(filePath)}`);
    console.log(`========================================`);
    const start = Math.max(0, idx - 100);
    const end = Math.min(content.length, idx + 2000);
    console.log(content.substring(start, end));
  }
});
