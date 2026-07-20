import * as fs from "fs";
import * as path from "path";

const filesToSearch = [
  path.join(process.cwd(), "src", "data", "JEE Main", "JEE Main PYQs (2015-2026).json"),
  path.join(process.cwd(), "src", "data", "JEE Main", "JEE Tatva Ex-1 .json"),
  path.join(process.cwd(), "src", "data", "NEET", "NEET Rankers Assignments .json"),
  path.join(process.cwd(), "src", "data", "NEET", "NEET Tatva Ex-1.json")
];

const keywords = [
  "diphenylhexa",
  "diphenyl-1,3,5-triene",
  "diphenyl",
  "methylenehexa",
  "3-methyl-4-methylenehexa",
  "dieneShown",
  "configuration of diene",
  "stereochemical configuration",
  "gauche",
  "sp2-sp2",
  "sp2-sp3"
];

filesToSearch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  console.log(`Searching raw text of unparsed file: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  
  keywords.forEach(kw => {
    if (content.toLowerCase().includes(kw.toLowerCase())) {
      console.log(`  -> FOUND KEYWORD "${kw}"`);
      
      // Let's find some occurrences
      let idx = 0;
      while (true) {
        idx = content.toLowerCase().indexOf(kw.toLowerCase(), idx);
        if (idx === -1) break;
        
        const start = Math.max(0, idx - 400);
        const end = Math.min(content.length, idx + 1000);
        console.log(`\n--- Match context for "${kw}" in ${path.basename(filePath)} ---`);
        console.log(content.substring(start, end));
        console.log(`-----------------------------------------------------------------\n`);
        
        idx += kw.length;
        if (idx > content.length - 100) break;
        break; // just print first match context
      }
    }
  });
});
