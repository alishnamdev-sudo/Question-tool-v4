import * as fs from "fs";
import * as path from "path";
import stringSimilarity from "string-similarity";

const targets = [
  { num: 1, text: "x^e + e^x", keywords: ["x^e", "e^x", "e^{x-1}", "x^{e-1}"] },
  { num: 2, text: "e^x (1+x \\ln x)/x", keywords: ["e^x", "ln x", "1+x"] },
  { num: 3, text: "1/\\sqrt{9x - 4x^2}", keywords: ["9x - 4x^2", "9x - 4x"] },
  { num: 4, text: "(\\sin^6 x + \\cos^6 x)", keywords: ["sin^6", "cos^6"] },
  { num: 5, text: "1/(x^2 (x^4 + 1)^{3/4})", keywords: ["x^4 + 1", "3/4", "x^2"] },
  { num: 6, text: "e^x (x^3 - x^2 + x + 1)/(x^2+1)^2", keywords: ["x^3 - x^2 + x + 1", "x^2+1", "e^x"] },
  { num: 7, text: "(x^2 - 1)/(x^4 + 3x^2 + 1)", keywords: ["x^4 + 3x^2 + 1", "x^2 - 1"] },
  { num: 8, text: "(\\cos x - \\sin x)/\\sqrt{8 - \\sin 2x}", keywords: ["8 - \\sin 2x", "cos x - \\sin x"] },
  { num: 9, text: "(x^2-1) / ((x^4+3x^2+1) \\sqrt{x^4+x^2+1})", keywords: ["x^4+x^2+1", "x^4+3x^2+1", "x^2-1"] },
  { num: 10, text: "x^2 / (x \\sin x + \\cos x)^2", keywords: ["x \\sin x", "x \\sin x + \\cos x", "x^2"] },
  { num: 11, text: "(x^2 - 1) / ((x^4 + 3x^2 + 1) \\tan^{-1}((x^2+1)/x))", keywords: ["tan^{-1}", "x^4 + 3x^2 + 1", "x^2 - 1"] },
  { num: 12, text: "x^2 / (x \\sin x + \\cos x)^2 f(0) = 0", keywords: ["x \\sin x + \\cos x", "f(0)"] },
  { num: 13, text: "e^x(1+x)/\\cos^2(xe^x)", keywords: ["xe^x", "cos^2"] },
  { num: 14, text: "x^2 e^{3x}", keywords: ["x^2 e^{3x}", "x^2 e^{3x}"] },
  { num: 15, text: "1/\\sqrt{9 - 25x^2}", keywords: ["9 - 25x^2", "25x^2"] },
  { num: 16, text: "5x^4 + 4x^3 / (x^5 + x^4 + 2)", keywords: ["5x^4 + 4x^3", "x^5 + x^4 + 2"] },
  { num: 17, text: "45 x^5 / \\sqrt{1+x^3}", keywords: ["45 x^5", "1+x^3", "x^3 - 2"] },
  { num: 18, text: "x^7 e^{x^2}", keywords: ["x^7 e^{x^2}", "e^{x^2}", "x^6", "x^4"] },
  { num: 19, text: "4\\sqrt{2}/(x^4+1)", keywords: ["4\\sqrt{2}", "x^4+1", "x^4 + 1"] },
  { num: 20, text: "20 / ((x+1)^2 (x^2+1))", keywords: ["20", "(x+1)^2", "x^2+1"] },
  { num: 21, text: "12x^{23} + 5x^{30} / (x^{12} + x^7 + 1)^3", keywords: ["12x^{23}", "5x^{30}", "x^{12} + x^7 + 1"] },
  { num: 22, text: "e^{3x} (3x^4 + 3x^3 + 5x^2 + 3x + 4)", keywords: ["3x^4", "5x^2", "e^{3x}", "x^2+1"] },
  { num: 23, text: "15 (x^3+x) / ((x^4-x^2+1)\\sqrt{x^4+1})", keywords: ["15", "x^3+x", "x^4-x^2+1", "x^4+1"] },
  { num: 24, text: "14(x^2+1) / ((x^2-1)\\sqrt{x^4+1})", keywords: ["14", "x^2+1", "x^2-1", "x^4+1"] }
];

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
console.log(`Loaded ${db.length} questions from JEE Main database.`);

targets.forEach(target => {
  let matches: { q: any; score: number }[] = [];
  
  for (const q of db) {
    const qText = (q.Question || "") + " " + (q.Solution || "");
    const qTextLower = qText.toLowerCase();
    
    let score = 0;
    target.keywords.forEach(kw => {
      if (qTextLower.includes(kw.toLowerCase())) {
        score += 1;
      }
    });
    
    if (score > 0) {
      matches.push({ q, score });
    }
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  
  console.log(`\n========================================`);
  console.log(`Target Question ${target.num}: ${target.text}`);
  if (matches.length > 0) {
    const topMatches = matches.slice(0, 3);
    topMatches.forEach((m, idx) => {
      console.log(`Match ${idx+1} (Score: ${m.score}): ID: ${m.q.QuestionId || "N/A"}`);
      console.log(`Question: ${m.q.Question?.replace(/\s+/g, " ").trim().substring(0, 300)}`);
      console.log(`Solution: ${m.q.Solution?.replace(/\s+/g, " ").trim().substring(0, 300)}`);
    });
  } else {
    console.log("No match found!");
  }
});
