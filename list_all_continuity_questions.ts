import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
console.log(`Loaded ${db.length} questions from JEE Main database.`);

const filtered = db.filter((q: any) => {
  const text = ((q.Question || "") + " " + (q.Solution || "") + " " + JSON.stringify(q.Tags || [])).toLowerCase();
  return text.includes("continuity") || text.includes("differentiability") || text.includes("differentiable") || text.includes("lhd") || text.includes("rhd");
});

console.log(`Found ${filtered.length} questions matching keywords.`);

const out: any[] = [];
filtered.forEach((q: any, idx: number) => {
  out.push({
    idx: idx + 1,
    id: q.QuestionId,
    question: q.Question?.replace(/\s+/g, " ").trim().substring(0, 200),
    solution: q.Solution?.replace(/\s+/g, " ").trim().substring(0, 150),
    tags: q.Tags
  });
});

fs.writeFileSync("continuity_questions_all.json", JSON.stringify(out, null, 2));
console.log("Written results to continuity_questions_all.json");
