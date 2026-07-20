import * as fs from "fs";
import * as path from "path";

const targets = [
  { num: 1, text: "sin(3x)/x + a, 5, (e^{bx}-1)/x", keywords: ["sin(3x)", "sin 3x", "e^{bx}", "e^{bx}-1", "a+b", "a + b"] },
  { num: 2, text: "|x-2| + |x-3| LHD at x = 2", keywords: ["|x-2| + |x-3|", "x-2| + |x-3|", "|x - 2| + |x - 3|", "LHD", "left-hand derivative"] },
  { num: 3, text: "x^2 + 3x + a, bx + 2 differentiable at x=1", keywords: ["x^2 + 3x + a", "bx + 2", "differentiable at x", "differentiable"] },
  { num: 4, text: "|x^2 - 4| + |x|", keywords: ["|x^2 - 4| + |x|", "x^2 - 4| + |x|", "|x^2-4| + |x|"] },
  { num: 5, text: "(1 - cos(ax))/x^2, b, sqrt(x)/(sqrt(16+sqrt(x)) - 4)", keywords: ["1 - \\cos(ax)", "1-cos(ax)", "1-\\cos(ax)", "1 - cos(ax)", "16+\\sqrt{x}"] },
  { num: 6, text: "|x-1|([x] - x)", keywords: ["|x-1|([x] - x)", "|x - 1|([x] - x)", "([x] - x)"] },
  { num: 7, text: "ax^2 + bx + c, ln(x) + 2 differentiable at x=1, f'(0)=2", keywords: ["ax^2 + bx + c", "ax^2+bx+c", "ln(x) + 2", "f'(0) = 2"] },
  { num: 8, text: "|sin x - cos x| + |x - pi|", keywords: ["|\\sin x - \\cos x|", "sin x - cos x| + |x - \\pi|", "sin x - \\cos x", "x - \\pi"] },
  { num: 9, text: "(a cos x + cos 2x + b)/x^4", keywords: ["a \\cos x + \\cos 2x", "acos x + cos 2x", "cos 2x + b", "x^4"] },
  { num: 10, text: "[x] sin(pi x) + |x-1| cos(pi x)", keywords: ["[x] \\sin(\\pi x)", "[x]sin(pi x)", "[x] \\sin", "cos(\\pi x)"] },
  { num: 11, text: "max{|x^2 - 4x|, |x|}", keywords: ["\\max\\{|x^2 - 4x|, |x|\\}", "max{|x^2 - 4x|, |x|}", "max{|x^2-4x|, |x|}", "x^2 - 4x|, |x|"] },
  { num: 12, text: "x^2 ([1/x] + [-1/x])", keywords: ["x^2 \\left( \\left[ \\frac{1}{x} \\right] + \\left[ \\frac{-1}{x} \\right] \\right)", "[1/x] + [-1/x]", "\\left[ \\frac{1}{x} \\right]"] },
  { num: 13, text: "sin(3x)/tan(2x), k, ln(1+3x)/2x", keywords: ["sin(3x)/tan(2x)", "sin 3x", "tan 2x", "ln(1+3x)/2x", "ln(1+3x)"] },
  { num: 14, text: "|x-2| + |x-3| LHD and RHD", keywords: ["|x-2| + |x-3|", "LHD", "RHD"] },
  { num: 15, text: "ax^2 + b, 2x + 3", keywords: ["ax^2 + b", "ax^2+b", "2x + 3", "2x+3"] },
  { num: 16, text: "|x^2 - 5x + 6| + |x^2 - 3x + 2|", keywords: ["|x^2 - 5x + 6| + |x^2 - 3x + 2|", "x^2 - 5x + 6| + |x^2 - 3x + 2|", "5x + 6| + |x^2 - 3x"] },
  { num: 17, text: "(1 - cos(ax))/x^2, b, 8(sqrt(x+c)-sqrt(c))/x", keywords: ["1-\\cos(ax)", "8(\\sqrt{x+c}", "8(\\sqrt{x+c} - \\sqrt{c})"] },
  { num: 18, text: "|x^2 - 5x + 6| e^{x-2} + |x-2| cos(pi x)", keywords: ["|x^2 - 5x + 6| e^{x-2}", "x^2 - 5x + 6| e^{x-2}", "cos(\\pi x)"] },
  { num: 19, text: "ax^3 + bx^2 + cx + d, x^4 + x^2 + 1", keywords: ["ax^3 + bx^2", "ax^3+bx^2", "twice differentiable", "x^4 + x^2 + 1"] },
  { num: 20, text: "max{2|x|, x^2} + |x-1|", keywords: ["\\max\\{2|x|, x^2\\}", "max{2|x|, x^2}", "max{2|x|, x^2} + |x-1|", "max{2|x|, x^2}"] },
  { num: 21, text: "(a e^{x^2} + b cos(2x) + c e^{-x^2})/x^4", keywords: ["a e^{x^2}", "b \\cos(2x)", "c e^{-x^2}", "ae^{x^2}", "b\\cos(2x)", "ce^{-x^2}"] },
  { num: 22, text: "|x^3 - 6x^2 + 11x - 6| + 4|x^2-4x+3| + 5|x-2|", keywords: ["|x^3 - 6x^2 + 11x - 6|", "4|x^2-4x+3|", "5|x-2|", "x^3 - 6x^2"] },
  { num: 23, text: "min{|x^2 - 10x + 21|...}, max{|x^2 - 12x + 32|...}", keywords: ["min\\{|x^2 - 10x + 21|\\}", "max\\{|x^2 - 12x + 32|\\}", "min { |x^2 - 10x + 21|", "max { |x^2 - 12x + 32|"] },
  { num: 24, text: "x^2 e^{x-1} + ax + b, c ln(x) + d x^2 + ex", keywords: ["x^2 e^{x-1}", "x^2e^{x-1}", "c \\ln(x)", "c\\ln(x)", "d x^2 + e x", "rational"] }
];

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
if (!fs.existsSync(jeePath)) {
  console.log("Database not found!");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
console.log(`Loaded ${db.length} questions from JEE Main database.`);

const results: any[] = [];

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

    if (score > 1) {
      matches.push({ q, score });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  
  if (matches.length > 0) {
    const top = matches[0];
    results.push({
      num: target.num,
      text: target.text,
      matchId: top.q.QuestionId,
      matchQuestion: top.q.Question?.substring(0, 150) + "...",
      matchAnswer: top.q.Answer,
      score: top.score
    });
  } else {
    results.push({
      num: target.num,
      text: target.text,
      matchId: "NONE",
      score: 0
    });
  }
});

fs.writeFileSync("continuity_matches_short.json", JSON.stringify(results, null, 2));
console.log("Completed matching! Results written to continuity_matches_short.json");
