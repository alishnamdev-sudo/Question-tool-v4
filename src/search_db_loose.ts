import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");

let dbQuestions: any[] = [];

if (fs.existsSync(jeePath)) {
  const data = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
  dbQuestions = dbQuestions.concat(data.map((q: any) => ({ ...q, source: "JEE" })));
}
if (fs.existsSync(neetPath)) {
  const data = JSON.parse(fs.readFileSync(neetPath, "utf-8"));
  dbQuestions = dbQuestions.concat(data.map((q: any) => ({ ...q, source: "NEET" })));
}

// Helper to search questions with any of the words and display
function search(words: string[], limit = 5) {
  const matches = dbQuestions.filter(q => {
    const text = ((q.Question || "") + " " + (q.Solution || "")).toLowerCase();
    return words.every(w => text.includes(w.toLowerCase()));
  });
  console.log(`\nSEARCH FOR: ${JSON.stringify(words)} -> Found ${matches.length} matches`);
  matches.slice(0, limit).forEach(m => {
    console.log(`- [${m.source}] ID: ${m.QuestionId}`);
    console.log(`  Q: ${m.Question?.replace(/\s+/g, " ").trim().substring(0, 200)}`);
  });
}

search(["plane", "mirror", "15"]);
search(["plane", "mirror", "height"]);
search(["plane", "mirror", "speed"]);
search(["plane", "mirror", "inclined"]);
search(["plane", "mirror", "velocity"]);
search(["concave", "mirror", "focal length", "20"]);
search(["concave", "mirror", "focal length", "15"]);
search(["concave", "mirror", "focal length", "30"]);
search(["plane", "mirror", "coordinate"]);
search(["cut", "mirror"]);
search(["pole", "mirror"]);
