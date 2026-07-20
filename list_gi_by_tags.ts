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

console.log(`Loaded ${allQuestions.length} questions.`);

let count = 0;
allQuestions.forEach(q => {
  const tags = q.Tags || [];
  const tagStr = JSON.stringify(tags).toLowerCase();
  
  if (
    tagStr.includes("geometrical isomerism") ||
    tagStr.includes("isomerism in alkenes") ||
    tagStr.includes("isomerism") && tagStr.includes("hydrocarbon")
  ) {
    count++;
    console.log(`\nTag Match ${count}: [ID: ${q.QuestionId}] [File: ${q.sourceFile}]`);
    console.log(`Chapter: ${tags[0]?.Chapter} | Topic: ${tags[0]?.Topic}`);
    console.log(`Question: ${q.Question}`);
    console.log(`Answer: ${JSON.stringify(q.Answer)}`);
    console.log(`Solution: ${q.Solution?.substring(0, 300)}`);
  }
});
