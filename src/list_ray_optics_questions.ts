import * as fs from "fs";
import * as path from "path";

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");

let allRayOptics: any[] = [];

function loadAndFilter(filePath: string, source: string) {
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    data.forEach((q: any) => {
      const qText = q.Question || "";
      const tags = q.Tags || [];
      const isRayOptics = tags.some((t: any) => t.Chapter && t.Chapter.toLowerCase().includes("ray optics") || t.Topic && t.Topic.toLowerCase().includes("ray optics"));
      const hasKeywords = qText.toLowerCase().includes("mirror") || qText.toLowerCase().includes("optics") || qText.toLowerCase().includes("lens") || qText.toLowerCase().includes("refraction") || qText.toLowerCase().includes("magnification");
      
      if (isRayOptics || hasKeywords) {
        allRayOptics.push({
          ...q,
          source,
          isRayOptics
        });
      }
    });
  }
}

loadAndFilter(jeePath, "JEE");
loadAndFilter(neetPath, "NEET");

console.log(`Found ${allRayOptics.length} potential Ray Optics questions.`);

// Write the summarized list to a file for easy viewing
const outputLines: string[] = [];
allRayOptics.forEach((q, i) => {
  outputLines.push(`--- INDEX ${i} | ${q.source} | ID: ${q.QuestionId} ---`);
  outputLines.push(`Chapter: ${q.Tags?.[0]?.Chapter || "N/A"} | Topic: ${q.Tags?.[0]?.Topic || "N/A"}`);
  outputLines.push(`Question: ${q.Question}`);
  outputLines.push(`Answer: ${JSON.stringify(q.Answer)}`);
  if (q.Options && q.Options.length > 0) {
    outputLines.push(`Options: ${JSON.stringify(q.Options)}`);
  }
  outputLines.push(`Solution: ${q.Solution?.substring(0, 300)}...`);
  outputLines.push("\n");
});

fs.writeFileSync("ray_optics_extracted.txt", outputLines.join("\n"));
console.log("Successfully wrote output to ray_optics_extracted.txt");
