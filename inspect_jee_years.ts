import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
const questions = JSON.parse(fs.readFileSync(jeePath, "utf-8"));

console.log("Analyzing JEE PYQ schema:");
for (let i = 0; i < Math.min(20, questions.length); i++) {
  const q = questions[i];
  console.log(`\n--- Question ${i + 1} (ID: ${q.QuestionId}) ---`);
  console.log("Tags:", JSON.stringify(q.Tags));
  console.log("Other Keys:", Object.keys(q));
  if (q.Question) {
    console.log("Snippet:", q.Question.substring(0, 100));
  }
}
