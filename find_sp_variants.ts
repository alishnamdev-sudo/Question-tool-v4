import * as fs from "fs";
import * as path from "path";

const keywords = [
  "sp2", "sp3", "sp^2", "sp^3", "sp^{2}", "sp^{3}", "hybrid", "sigma", "pi-bond", "pi bond"
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
    } else if (stat.isFile() && file.endsWith(".json")) {
      callback(filePath);
    }
  }
}

const dataDir = path.join(process.cwd(), "src", "data");
console.log(`Walking data directory: ${dataDir}`);

let count = 0;
walkDir(dataDir, (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  // Let's search for occurrences of both sp2/sp3 and ratio/sigma
  if (
    (content.includes("sp") || content.includes("hybrid")) &&
    (content.includes("ratio") || content.includes("sigma") || content.includes("bond"))
  ) {
    // Let's do a more precise scan
    keywords.forEach(kw => {
      let idx = 0;
      while (true) {
        idx = content.toLowerCase().indexOf(kw.toLowerCase(), idx);
        if (idx === -1) break;
        
        // check if this neighborhood contains "ratio" or other keywords
        const contextStart = Math.max(0, idx - 150);
        const contextEnd = Math.min(content.length, idx + 350);
        const context = content.substring(contextStart, contextEnd).toLowerCase();
        
        if (
          context.includes("ratio") || 
          context.includes("sigma") || 
          context.includes("sp2") || 
          context.includes("sp3") || 
          context.includes("sp^2") || 
          context.includes("sp^3")
        ) {
          count++;
          if (count <= 30) {
            console.log(`\nMatch ${count} [Keyword: ${kw}] [File: ${path.basename(filePath)}]`);
            console.log(`Context: ${content.substring(contextStart, contextEnd).replace(/\s+/g, " ").trim()}`);
          }
        }
        
        idx += kw.length;
        if (idx > content.length - 100) break;
        break; // print just one match per keyword per file to avoid spam
      }
    });
  }
});

console.log(`Total Matches: ${count}`);
