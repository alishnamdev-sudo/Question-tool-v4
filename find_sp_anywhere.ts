import * as fs from "fs";
import * as path from "path";

const dbDirs = [
  path.join(process.cwd(), "src", "data", "JEE Main"),
  path.join(process.cwd(), "src", "data", "NEET")
];

let allQuestions: any[] = [];

function loadAndFixJson(filePath: string) {
  try {
    let content = fs.readFileSync(filePath, "utf-8").trim();
    if (content.endsWith("]")) {
      return JSON.parse(content);
    }
    const lastBraceIndex = content.lastIndexOf("}");
    if (lastBraceIndex !== -1) {
      let fixedContent = content.substring(0, lastBraceIndex + 1);
      if (fixedContent.startsWith("[")) {
        fixedContent += "]";
      }
      return JSON.parse(fixedContent);
    }
  } catch (err) {}
  return null;
}

dbDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith(".json")) {
      const parsed = loadAndFixJson(path.join(dir, file));
      if (parsed && Array.isArray(parsed)) {
        allQuestions = allQuestions.concat(parsed.map(q => ({ ...q, sourceFile: file })));
      }
    }
  });
});

console.log(`Searching across ${allQuestions.length} questions...`);

let count = 0;
allQuestions.forEach(q => {
  const qText = (q.Question || "").toLowerCase();
  const qSol = (q.Solution || "").toLowerCase();
  const comb = qText + " " + qSol;
  
  if (
    comb.includes("sp2") || 
    comb.includes("sp3") || 
    comb.includes("sp^2") || 
    comb.includes("sp^3")
  ) {
    count++;
    if (count <= 25) {
      console.log(`\nMatch ${count}: [ID: ${q.QuestionId}] [File: ${q.sourceFile}]`);
      console.log(`Question: ${q.Question?.substring(0, 200)}`);
    }
  }
});
console.log(`Total Matches: ${count}`);
