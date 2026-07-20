import * as fs from "fs";
import * as path from "path";

const targetIds = [
  "69022339ae413f2843ac2c17",
  "5ebfc0383bbc4101506d0b8a",
  "5fe9ea79e9fb3d3419dbe188",
  "5c667743e4b0ac3253f9a5c5",
  "65bb433347df7d1176fc9eb7"
];

const dbDirs = [
  path.join(process.cwd(), "src", "data", "JEE Main"),
  path.join(process.cwd(), "src", "data", "NEET")
];

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

let allQuestions: any[] = [];
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

allQuestions.forEach(q => {
  if (targetIds.includes(q.QuestionId)) {
    console.log(`\n========================================`);
    console.log(`DETAILS FOR ID: ${q.QuestionId} [File: ${q.sourceFile}]`);
    console.log(`========================================`);
    console.log(`Question: ${q.Question}`);
    console.log(`Options: ${JSON.stringify(q.Options)}`);
    console.log(`Answer: ${JSON.stringify(q.Answer)}`);
    console.log(`Solution: ${q.Solution}`);
  }
});
