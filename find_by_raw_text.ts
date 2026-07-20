import * as fs from "fs";
import * as path from "path";

const targets = [
  "diphenylhexa",
  "methylenehexa",
  "3-methyl-4-methylenehexa",
  "dieneShown"
];

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file.endsWith(".json")) {
      callback(filePath);
    }
  }
}

const dataDir = path.join(process.cwd(), "src", "data");
console.log(`Walking data directory: ${dataDir}`);

walkDir(dataDir, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  targets.forEach(target => {
    if (content.toLowerCase().includes(target.toLowerCase())) {
      console.log(`\n========================================`);
      console.log(`FOUND TARGET "${target}" in file: ${filePath}`);
      console.log(`========================================`);
      
      // Let's find the match index and extract a slice of the text
      const index = content.toLowerCase().indexOf(target.toLowerCase());
      const start = Math.max(0, index - 500);
      const end = Math.min(content.length, index + 1500);
      console.log(content.substring(start, end));
    }
  });
});
