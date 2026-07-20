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

console.log(`Concise search initialized. Loaded ${allQuestions.length} complete questions.`);

const targets = [
  {
    num: 4,
    desc: "Q4: Determine stereochemical configuration of diene (Z/E)",
    keywords: ["diene", "gauche", "isomer", "configuration", "stereochemical", "(e)", "(z)"]
  },
  {
    num: 11,
    desc: "Q11: 3-methyl-4-methylenehexa-1,5-diene, sp2-sp2 to sp2-sp3 ratio",
    keywords: ["sp2", "sp3", "sigma", "bonds", "ratio", "diene", "methylene"]
  },
  {
    num: 12,
    desc: "Q12: Geometrical isomers of 1,6-diphenylhexa-1,3,5-triene",
    keywords: ["geometrical", "isomer", "diphenyl", "triene", "polyene", "symmetrical"]
  }
];

targets.forEach(target => {
  console.log(`\n========================================`);
  console.log(`TARGET ${target.num}: ${target.desc}`);
  console.log(`========================================`);
  
  let scored = allQuestions.map(q => {
    const qText = (q.Question || "").toLowerCase();
    const qSol = (q.Solution || "").toLowerCase();
    const qComb = qText + " " + qSol;
    let score = 0;
    
    target.keywords.forEach(kw => {
      if (qComb.includes(kw.toLowerCase())) {
        score += 1;
      }
    });

    if (target.num === 4) {
      if (qComb.includes("diene") && (qComb.includes("configur") || qComb.includes("stereochem") || qComb.includes("e,z") || qComb.includes("e/z"))) {
        score += 10;
      }
      if (qComb.includes("(e)") && qComb.includes("(z)")) {
        score += 8;
      }
    }

    if (target.num === 11) {
      if (qComb.includes("sp2") && qComb.includes("sp3")) {
        score += 10;
      }
      if (qComb.includes("sigma") && qComb.includes("bond")) {
        score += 5;
      }
      if (qComb.includes("ratio") || qComb.includes("number of")) {
        score += 3;
      }
    }

    if (target.num === 12) {
      if (qComb.includes("geometrical isomers") || qComb.includes("geometrical isomer")) {
        score += 10;
      }
      if (qComb.includes("polyene") || qComb.includes("triene") || qComb.includes("diene")) {
        score += 5;
      }
      if (qComb.includes("symmetrical") || qComb.includes("even") || qComb.includes("odd")) {
        score += 3;
      }
    }

    return { q, score };
  });

  scored.sort((a, b) => b.score - a.score);
  
  scored.slice(0, 3).forEach((m, idx) => {
    console.log(`Match ${idx+1} (Score: ${m.score})`);
    console.log(`  File: ${m.q.sourceFile}`);
    console.log(`  ID: ${m.q.QuestionId}`);
    console.log(`  Question: ${m.q.Question?.replace(/\s+/g, " ").trim().substring(0, 300)}`);
    console.log(`  Solution: ${m.q.Solution?.replace(/\s+/g, " ").trim().substring(0, 300)}`);
    console.log(`  Answer: ${JSON.stringify(m.q.Answer)}`);
  });
});
