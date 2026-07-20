import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));

// Filter questions belonging to Indefinite Integration chapter
const integrationQuestions = db.filter((q: any) => {
  if (q.Tags) {
    return q.Tags.some((t: any) => t.Chapter && t.Chapter.toLowerCase().includes("indefinite"));
  }
  return false;
});

console.log(`Found ${integrationQuestions.length} Indefinite Integration questions in JEE Main PYQs database.`);

// Target question details
const targets = [
  { num: 1, desc: "Integral of (x^{e-1} + e^{x-1}) / (x^e + e^x)", keywords: ["x^e", "e^x", "e-1", "x-1"] },
  { num: 2, desc: "Integral of e^x * (1 + x ln x) / x", keywords: ["ln x", "1/x", "1 + x", "e^x", "ln(x)"] },
  { num: 3, desc: "Integral of 1/sqrt(9x - 4x^2)", keywords: ["9x", "4x^2", "sin^{-1}"] },
  { num: 4, desc: "Integral of (sin^6 x + cos^6 x) / (sin^2 x cos^2 x)", keywords: ["sin^6", "cos^6", "sin^2", "cos^2"] },
  { num: 5, desc: "Integral of 1 / (x^2 * (x^4 + 1)^{3/4})", keywords: ["3/4", "x^4", "x^2", "x^{-4}", "x^5"] },
  { num: 6, desc: "Integral of e^x * (x^3 - x^2 + x + 1) / (x^2 + 1)^2", keywords: ["x^3 - x^2", "x^2+1", "x^2 + 1"] },
  { num: 7, desc: "Integral of (x^2 - 1) / (x^4 + 3x^2 + 1)", keywords: ["x^4 + 3x^2 + 1", "x^2 - 1", "tan^{-1}"] },
  { num: 8, desc: "Integral of (cos x - sin x) / sqrt(8 - sin 2x)", keywords: ["cos x - sin x", "8 -", "sin 2x", "sin2x"] },
  { num: 9, desc: "Integral of (x^2 - 1) / ((x^4 + 3x^2 + 1) * sqrt(x^4 + x^2 + 1))", keywords: ["x^4+x^2+1", "x^4+3x^2+1", "x^2-1", "sec\\theta", "u^2"] },
  { num: 10, desc: "Integral of x^2 / (x sin x + cos x)^2", keywords: ["x \\sin x", "cos x", "x\\sin x", "x \\cos x"] },
  { num: 11, desc: "Integral of (x^2-1) / ((x^4 + 3x^2 + 1) * arctan((x^2+1)/x))", keywords: ["tan^{-1}", "x^2+1", "x^2-1", "x^4+3x^2+1"] },
  { num: 12, desc: "Integral of x^2 / (x sin x + cos x)^2 with boundary conditions f(0)=0 find f(pi/4)", keywords: ["x \\sin x", "f(0)", "pi/4", "\\frac{\\pi}{4}"] },
  { num: 13, desc: "Integral of e^x(1+x)/cos^2(xe^x)", keywords: ["xe^x", "cos^2", "cos^2(xe^x)", "cos^2(x e^x)"] },
  { num: 14, desc: "Integral of x^2 e^{3x}", keywords: ["x^2 e^{3x}", "x^2e^{3x}"] },
  { num: 15, desc: "Integral of 1/sqrt(9 - 25x^2)", keywords: ["9 - 25x^2", "25x^2"] },
  { num: 16, desc: "f(x) = Integral of (5x^4 + 4x^3)/(x^5+x^4+2), f(0)=ln 2, find e^{f(2)}", keywords: ["5x^4", "4x^3", "x^5+x^4+2", "f(0)", "e^{f(2)}"] },
  { num: 17, desc: "Integral of 45 x^5 / sqrt(1+x^3) = A sqrt(1+x^3)(x^3-2)", keywords: ["45", "x^5", "1+x^3", "x^3-2"] },
  { num: 18, desc: "Integral of x^7 e^{x^2} = e^{x^2}/2 (x^6 - A x^4 + B x^2 - C)", keywords: ["x^7", "e^{x^2}", "x^6 -"] },
  { num: 19, desc: "Integral of 4sqrt(2)/(x^4+1)", keywords: ["4\\sqrt{2}", "x^4+1", "x^4 + 1"] },
  { num: 20, desc: "Integral of 20/((x+1)^2 * (x^2+1))", keywords: ["20", "(x+1)^2", "x^2+1"] },
  { num: 21, desc: "Integral of (12x^{23} + 5x^{30})/(x^{12}+x^7+1)^3", keywords: ["12x^{23}", "5x^{30}", "x^{12}", "x^7"] },
  { num: 22, desc: "Integral of e^{3x} * (3x^4 + 3x^3 + 5x^2 + 3x + 4) / (x^2+1)^2", keywords: ["e^{3x}", "3x^4", "5x^2", "x^2+1"] },
  { num: 23, desc: "Integral of 15(x^3+x) / ((x^4-x^2+1)*sqrt(x^4+1))", keywords: ["15", "x^3+x", "x^4-x^2+1", "x^4+1"] },
  { num: 24, desc: "Integral of 14(x^2+1) / ((x^2-1)*sqrt(x^4+1))", keywords: ["14", "x^2+1", "x^2-1", "x^4+1"] }
];

targets.forEach(target => {
  console.log(`\n========================================`);
  console.log(`Target ${target.num}: ${target.desc}`);
  
  let bestMatches: { q: any; score: number }[] = [];
  
  for (const q of integrationQuestions) {
    const qText = (q.Question || "") + " " + (q.Solution || "") + " " + JSON.stringify(q.Options || []) + " " + JSON.stringify(q.Answer || []);
    const qTextLower = qText.toLowerCase();
    
    let matchCount = 0;
    target.keywords.forEach(kw => {
      const kwLower = kw.toLowerCase();
      if (qTextLower.includes(kwLower)) {
        matchCount++;
      }
    });
    
    // Simple substring score
    let score = matchCount;
    
    // Boost score if specific numeric values match
    if (target.num === 17 && qText.includes("45") && qText.includes("x^5")) score += 5;
    if (target.num === 16 && qText.includes("5x^4") && qText.includes("x^5")) score += 5;
    if (target.num === 18 && qText.includes("x^7") && qText.includes("x^2")) score += 5;
    if (target.num === 19 && qText.includes("x^4+1") && qText.includes("4")) score += 5;
    if (target.num === 20 && qText.includes("20") && qText.includes("x^2+1")) score += 5;
    if (target.num === 21 && qText.includes("12x") && qText.includes("x^{12}")) score += 5;
    if (target.num === 22 && qText.includes("3x^4") && qText.includes("3x^3")) score += 5;
    if (target.num === 23 && qText.includes("15") && qText.includes("x^3+x")) score += 5;
    if (target.num === 24 && qText.includes("14") && qText.includes("x^2+1")) score += 5;
    
    if (score > 0) {
      bestMatches.push({ q, score });
    }
  }
  
  bestMatches.sort((a, b) => b.score - a.score);
  
  if (bestMatches.length > 0) {
    const top = bestMatches[0];
    console.log(`BEST MATCH (Score: ${top.score}, ID: ${top.q.QuestionId})`);
    console.log(`Question: ${top.q.Question?.replace(/\s+/g, " ").trim()}`);
    console.log(`Solution snippet: ${top.q.Solution?.replace(/\s+/g, " ").trim().substring(0, 300)}`);
  } else {
    console.log("No match found in the Indefinite Integration chapter!");
  }
});
