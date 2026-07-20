import * as fs from "fs";
import * as path from "path";

const targets = [
  "diphenylhexa",
  "methylenehexa",
  "3-methyl-4-methylenehexa",
  "dieneShown",
  "Question 4",
  "Question 11",
  "Question 12"
];

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === "node_modules" || file === ".git" || file === "dist") continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile()) {
      callback(filePath);
    }
  }
}

console.log("Searching everywhere...");

walkDir(process.cwd(), (filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    targets.forEach(target => {
      if (content.toLowerCase().includes(target.toLowerCase())) {
        console.log(`FOUND "${target}" in file: ${filePath}`);
      }
    });
  } catch (err) {
    // skip binary files, etc.
  }
});
