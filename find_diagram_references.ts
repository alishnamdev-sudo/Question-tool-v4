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
    // Truncated JSON! Let's fix it by finding the last complete object
    // Find the last complete object closing brace '}' before truncation
    const lastBraceIndex = content.lastIndexOf("}");
    if (lastBraceIndex !== -1) {
      // Find the last complete object boundaries
      let fixedContent = content.substring(0, lastBraceIndex + 1);
      // Ensure it ends with ']' if it started with '['
      if (fixedContent.startsWith("[")) {
        fixedContent += "]";
      }
      return JSON.parse(fixedContent);
    }
  } catch (err) {
    console.error(`Failed to parse/fix JSON for file: ${filePath}`, err);
  }
  return null;
}

function loadFiles(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(dir, file);
      const parsedData = loadAndFixJson(filePath);
      if (parsedData && Array.isArray(parsedData)) {
        console.log(`Successfully loaded ${parsedData.length} questions from ${file}`);
        allQuestions = allQuestions.concat(parsedData.map((q: any) => ({ ...q, sourceFile: file })));
      }
    }
  }
}

dbDirs.forEach(loadFiles);
console.log(`\nLoaded ${allQuestions.length} total questions from all databases.`);

// Target 1: Q4 - Determine stereochemical configuration of diene (Z/E)
// Target 2: Q11 - 3-methyl-4-methylenehexa-1,5-diene ratio of sp2-sp2 to sp2-sp3
// Target 3: Q12 - Geometrical isomers of 1,6-diphenylhexa-1,3,5-triene (symmetrical polyene n=3)

const targets = [
  {
    num: 4,
    desc: "Determine stereochemical configuration of diene (Z/E)",
    keywords: ["diene", "gauche", "isomer", "configuration", "stereochemical", "E", "Z"]
  },
  {
    num: 11,
    desc: "3-methyl-4-methylenehexa-1,5-diene, sp2-sp2 to sp2-sp3 ratio",
    keywords: ["sp2", "sp3", "sigma", "bonds", "ratio", "diene"]
  },
  {
    num: 12,
    desc: "Geometrical isomers of 1,6-diphenylhexa-1,3,5-triene",
    keywords: ["geometrical", "isomer", "diphenyl", "triene", "polyene", "symmetrical"]
  }
];

targets.forEach(target => {
  console.log(`\n========================================`);
  console.log(`Searching for Reference Question for Target ${target.num}: ${target.desc}`);
  console.log(`========================================`);
  
  let matches: { q: any; score: number }[] = [];
  
  for (const q of allQuestions) {
    const qText = (q.Question || "").toLowerCase();
    const qSol = (q.Solution || "").toLowerCase();
    const qComb = qText + " " + qSol;
    
    let score = 0;
    
    // Check keyword match
    target.keywords.forEach(kw => {
      if (qComb.includes(kw.toLowerCase())) {
        score += 1;
      }
    });
    
    // Target 4: Stereochemical configuration of diene
    if (target.num === 4) {
      if (qComb.includes("diene") && (qComb.includes("configur") || qComb.includes("stereochem"))) {
        score += 5;
      }
      if (qComb.includes("gauche") || qComb.includes("conform")) {
        score -= 2; // de-emphasize conformers
      }
      if (qComb.includes("(e)") && qComb.includes("(z)")) {
        score += 5;
      }
    }
    
    // Target 11: Ratio of sp2-sp2 to sp2-sp3
    if (target.num === 11) {
      if (qComb.includes("sp2") && qComb.includes("sp3")) {
        score += 6;
      }
      if (qComb.includes("sigma") || qComb.includes("ratio")) {
        score += 4;
      }
      if (qComb.includes("bond")) {
        score += 2;
      }
    }
    
    // Target 12: Geometrical isomers of symmetrical triene
    if (target.num === 12) {
      if (qComb.includes("geometrical isomers") && (qComb.includes("triene") || qComb.includes("diene") || qComb.includes("polyene"))) {
        score += 6;
      }
      if (qComb.includes("symmetrical") || qComb.includes("odd") || qComb.includes("even")) {
        score += 3;
      }
      if (qComb.includes("octatriene") || qComb.includes("diphenyl")) {
        score += 5;
      }
    }
    
    if (score > 1) {
      matches.push({ q, score });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  
  const top = matches.slice(0, 5);
  if (top.length > 0) {
    top.forEach((m, idx) => {
      console.log(`\nMatch ${idx + 1} (Score: ${m.score}) [Source File: ${m.q.sourceFile}] [QuestionId: ${m.q.QuestionId}]`);
      console.log(`Chapter: ${m.q.Tags?.[0]?.Chapter || "N/A"} | Topic: ${m.q.Tags?.[0]?.Topic || "N/A"}`);
      console.log(`Question: ${m.q.Question?.substring(0, 300)}`);
      console.log(`Options: ${JSON.stringify(m.q.Options)}`);
      console.log(`Solution: ${m.q.Solution?.substring(0, 300)}...`);
    });
  } else {
    console.log("No matches found!");
  }
});
