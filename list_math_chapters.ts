import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
console.log(`Loaded ${db.length} questions from JEE Main database.`);

const chapters = new Set<string>();
db.forEach((q: any) => {
  if (q.Tags) {
    q.Tags.forEach((t: any) => {
      if (t.Chapter) chapters.add(t.Chapter);
    });
  }
});

console.log("Chapters in database:");
console.log(Array.from(chapters).sort());

// Search for any questions containing "integral" or "integrate" or "integration"
const integrationQuestions = db.filter((q: any) => {
  const text = (q.Question || "").toLowerCase() + " " + (q.Solution || "").toLowerCase();
  return text.includes("indefinite") || text.includes("integration") || text.includes("\\int ");
});

console.log(`\nFound ${integrationQuestions.length} integration questions.`);
console.log("\nSample 10 integration questions:");
integrationQuestions.slice(0, 15).forEach((q: any, idx: number) => {
  console.log(`\n--- Sample ${idx+1} (ID: ${q.QuestionId}) ---`);
  console.log(`Tags: ${JSON.stringify(q.Tags)}`);
  console.log(`Question: ${q.Question?.replace(/\s+/g, " ").trim().substring(0, 200)}`);
  console.log(`Solution: ${q.Solution?.replace(/\s+/g, " ").trim().substring(0, 200)}`);
});
