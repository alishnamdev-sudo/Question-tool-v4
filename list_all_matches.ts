import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
console.log(`Loaded ${db.length} questions from JEE Main database.`);

const targets = [
  { num: 1, text: "The value of the integral \\int \\frac{x^{e-1} + e^{x-1}}{x^e + e^x} dx is:", keywords: ["x^e + e^x", "x^{e-1}", "e^{x-1}"] },
  { num: 2, text: "The integral \\int e^x \\left( \\frac{1+x \\ln x}{x} \\right) dx is equal to:", keywords: ["1+x \\ln x", "1+x\\ln x", "e^x", "ln x", "\\ln x"] },
  { num: 3, text: "The value of \\int \\frac{dx}{\\sqrt{9x - 4x^2}} is:", keywords: ["9x - 4x^2", "9x-4x^2", "\\sqrt{9x"] },
  { num: 4, text: "The integral \\int \\frac{\\sin^6 x + \\cos^6 x}{\\sin^2 x \\cos^2 x} dx evaluates to:", keywords: ["\\sin^6 x + \\cos^6 x", "sin^6", "cos^6", "sin^2 x \\cos^2 x"] },
  { num: 5, text: "The value of \\int \\frac{dx}{x^2 (x^4 + 1)^{3/4}} is:", keywords: ["x^2 (x^4 + 1)^{3/4}", "x^4 + 1", "3/4"] },
  { num: 6, text: "The integral \\int e^x \\frac{x^3 - x^2 + x + 1}{(x^2+1)^2} dx is equal to:", keywords: ["x^3 - x^2 + x + 1", "x^2+1", "(x^2+1)^2", "e^x"] },
  { num: 7, text: "The value of \\int \\frac{x^2 - 1}{x^4 + 3x^2 + 1} dx is:", keywords: ["x^4 + 3x^2 + 1", "x^2 - 1"] },
  { num: 8, text: "The integral \\int \\frac{\\cos x - \\sin x}{\\sqrt{8 - \\sin 2x}} dx evaluates to:", keywords: ["8 - \\sin 2x", "cos x - \\sin x", "\\sin 2x"] },
  { num: 9, text: "The value of \\int \\frac{(x^2-1) dx}{(x^4+3x^2+1) \\sqrt{x^4+x^2+1}} is:", keywords: ["x^4+x^2+1", "x^4+3x^2+1", "x^2-1"] },
  { num: 10, text: "The integral \\int \\frac{x^2}{(x \\sin x + \\cos x)^2} dx is equal to:", keywords: ["x \\sin x + \\cos x", "x\\sin x + \\cos x", "x^2"] },
  { num: 11, text: "If \\int \\frac{x^2 - 1}{(x^4 + 3x^2 + 1) \\tan^{-1}\\left(\\frac{x^2 + 1}{x}\\right)} dx = \\ln |f(x)| + C", keywords: ["tan^{-1}", "x^2+1", "x^2-1", "x^4+3x^2+1"] },
  { num: 12, text: "If \\int \\frac{x^2}{(x\\sin x + \\cos x)^2} dx = f(x) + C, and f(0) = 0, then the value of f(\\pi/4)", keywords: ["x\\sin x + \\cos x", "f(0) = 0", "pi/4", "x \\sin x + \\cos x"] },
  { num: 13, text: "The value of the integral \\int \\frac{e^x(1+x)}{\\cos^2(xe^x)} dx is:", keywords: ["xe^x", "cos^2", "1+x", "e^x"] },
  { num: 14, text: "The integral \\int x^2 e^{3x} dx evaluates to:", keywords: ["x^2 e^{3x}", "x^2e^{3x}"] },
  { num: 15, text: "The value of \\int \\frac{dx}{\\sqrt{9 - 25x^2}} is:", keywords: ["9 - 25x^2", "25x^2"] },
  { num: 16, text: "Let f(x) = \\int \\frac{5x^4 + 4x^3}{x^5 + x^4 + 2} dx. If f(0) = \\ln 2, find the value of e^{f(2)}.", keywords: ["5x^4 + 4x^3", "x^5 + x^4 + 2", "f(0)"] },
  { num: 17, text: "If \\int \\frac{45 x^5}{\\sqrt{1+x^3}} dx = A \\sqrt{1+x^3} (x^3 - 2) + C", keywords: ["45 x^5", "1+x^3", "x^3 - 2", "A \\sqrt"] },
  { num: 18, text: "If \\int x^7 e^{x^2} dx = \\frac{e^{x^2}}{2} (x^6 - A x^4 + B x^2 - C) + K", keywords: ["x^7 e^{x^2}", "e^{x^2}", "x^6", "A x^4"] },
  { num: 19, text: "If \\int \\frac{4\\sqrt{2}}{x^4+1} dx = A \\tan^{-1}\\left(\\frac{x^2-1}{\\sqrt{2}x}\\right) + B \\ln", keywords: ["4\\sqrt{2}", "x^4+1", "x^2-1", "\\sqrt{2}x"] },
  { num: 20, text: "If \\int \\frac{20}{(x+1)^2 (x^2+1)} dx = 5\\ln", keywords: ["20", "(x+1)^2", "x^2+1"] },
  { num: 21, text: "If \\int \\frac{12x^{23} + 5x^{30}}{(x^{12} + x^7 + 1)^3} dx = \\frac{x^a}{b(x^{12}+x^7+1)^c} + K", keywords: ["12x^{23}", "5x^{30}", "x^{12} + x^7 + 1", "a+b+c"] },
  { num: 22, text: "If \\int e^{3x} \\left( \\frac{3x^4 + 3x^3 + 5x^2 + 3x + 4}{(x^2+1)^2} \\right) dx = e^{3x} \\frac{P(x)}{x^2+1} + C", keywords: ["3x^4 + 3x^3", "x^2+1", "e^{3x}", "P(5)"] },
  { num: 23, text: "If \\int \\frac{15 (x^3+x)}{(x^4-x^2+1)\\sqrt{x^4+1}} dx = \\alpha \\tan^{-1}", keywords: ["15", "x^3+x", "x^4-x^2+1", "x^4+1"] },
  { num: 24, text: "If \\int \\frac{14(x^2+1)}{(x^2-1)\\sqrt{x^4+1}} dx = \\sqrt{\\alpha} \\ln", keywords: ["14(x^2+1)", "x^2-1", "x^4+1"] }
];

targets.forEach(target => {
  let matches: { q: any; score: number }[] = [];
  
  for (const q of db) {
    const qText = ((q.Question || "") + " " + (q.Solution || "") + " " + JSON.stringify(q.Options || []) + " " + JSON.stringify(q.Answer || [])).toLowerCase();
    
    let score = 0;
    // Check keywords
    target.keywords.forEach(kw => {
      const kwLower = kw.toLowerCase().replace(/\\/g, ""); // strip slashes to tolerate latex variants
      const textToSearch = qText.replace(/\\/g, "");
      if (textToSearch.includes(kwLower)) {
        score += 2;
      }
    });

    // Substring checks for equations
    const plainText = target.text.toLowerCase().replace(/\\/g, "");
    const qTextPlain = qText.replace(/\\/g, "");
    
    // Exact match sub-parts
    if (qTextPlain.includes("x^e") && plainText.includes("x^e")) score += 1;
    if (qTextPlain.includes("e^x") && plainText.includes("e^x")) score += 1;
    if (plainText.includes("9x") && qTextPlain.includes("9x") && qTextPlain.includes("4x")) score += 3;
    if (plainText.includes("sin^6") && qTextPlain.includes("sin^6") && qTextPlain.includes("cos^6")) score += 3;
    if (plainText.includes("x^4+1") && qTextPlain.includes("x^4") && qTextPlain.includes("3/4")) score += 3;
    if (plainText.includes("e^x") && qTextPlain.includes("x^3-x^2") && qTextPlain.includes("x^2+1")) score += 5;
    if (plainText.includes("x^4+3x^2+1") && qTextPlain.includes("x^4+3x^2+1")) score += 5;
    if (plainText.includes("8-sin") && qTextPlain.includes("8-sin") || (qTextPlain.includes("8 - sin") && plainText.includes("8 - sin"))) score += 5;
    if (plainText.includes("x^4+x^2+1") && qTextPlain.includes("x^4+x^2+1")) score += 5;
    if (plainText.includes("x sin x") && (qTextPlain.includes("x sin x") || qTextPlain.includes("xsin x"))) score += 5;
    if (plainText.includes("e^x(1+x)") && (qTextPlain.includes("e^x(1+x)") || qTextPlain.includes("e^x (1 + x)"))) score += 5;
    if (plainText.includes("x^2 e^3x") && (qTextPlain.includes("x^2 e^3x") || qTextPlain.includes("x^2e^{3x}"))) score += 5;
    if (plainText.includes("9-25x^2") && qTextPlain.includes("9-25x^2")) score += 5;
    if (plainText.includes("5x^4+4x^3") && qTextPlain.includes("5x^4+4x^3")) score += 5;
    if (plainText.includes("45x^5") && qTextPlain.includes("45x^5") || (qTextPlain.includes("45 x^5") && plainText.includes("45 x^5"))) score += 5;
    if (plainText.includes("x^7 e^x^2") || (plainText.includes("x^7") && qTextPlain.includes("x^7") && qTextPlain.includes("e^{x^2}"))) score += 5;
    if (plainText.includes("4sqrt2") && (qTextPlain.includes("4sqrt2") || qTextPlain.includes("4\\sqrt{2}"))) score += 5;
    if (plainText.includes("20/(x+1)") && qTextPlain.includes("20")) score += 2;
    if (plainText.includes("12x^23") && qTextPlain.includes("12x^23") || (qTextPlain.includes("12x^{23}") && plainText.includes("12x^{23}"))) score += 5;
    if (plainText.includes("3x^4+3x^3") && qTextPlain.includes("3x^4+3x^3") || (qTextPlain.includes("3x^4 + 3x^3") && plainText.includes("3x^4 + 3x^3"))) score += 5;
    if (plainText.includes("15(x^3+x)") && qTextPlain.includes("15") && qTextPlain.includes("x^3+x")) score += 5;
    if (plainText.includes("14(x^2+1)") && qTextPlain.includes("14") && qTextPlain.includes("x^2+1")) score += 5;

    if (score > 1) {
      matches.push({ q, score });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  
  console.log(`\n========================================`);
  console.log(`Target Question ${target.num}: "${target.text}"`);
  if (matches.length > 0) {
    const top = matches[0];
    console.log(`MATCHED PYQ SOURCE: ID: ${top.q.QuestionId} (Score: ${top.score})`);
    console.log(`Question: "${top.q.Question?.replace(/\s+/g, " ").trim()}"`);
    console.log(`Solution: "${top.q.Solution?.replace(/\s+/g, " ").trim()}"`);
  } else {
    console.log(`NO STRONG MATCH FOUND`);
  }
});
