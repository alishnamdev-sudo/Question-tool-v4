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

const findKeywords = (kws: string[]) => {
  return dbQuestions.filter(q => {
    const text = (q.Question || "") + " " + (q.Solution || "");
    return kws.every(kw => text.toLowerCase().includes(kw.toLowerCase()));
  });
};

const findAnyKeywords = (kws: string[]) => {
  return dbQuestions.filter(q => {
    const text = (q.Question || "") + " " + (q.Solution || "");
    return kws.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  });
};

console.log("\n--- SEARCHING QUESTIONS ---");

// Let's run custom searches for each question block:

const searchResults: any = {};

// Q1: Mirror moved, distance 15 cm
searchResults[1] = findKeywords(["mirror", "moved", "image"]).slice(0, 5);

// Q2 & Q14: Man of height 1.8 m or H, stands in front of vertical plane mirror, minimum length
searchResults[2] = findKeywords(["height", "mirror", "minimum length", "vertical"]).slice(0, 5);
if (searchResults[2].length === 0) searchResults[2] = findKeywords(["height", "mirror", "minimum", "plane"]).slice(0, 5);

// Q3 & Q15: object moves towards plane mirror, speed 4 m/s or 5 m/s, relative speed of image
searchResults[3] = findKeywords(["mirror", "relative speed", "image"]).slice(0, 5);
if (searchResults[3].length === 0) searchResults[3] = findKeywords(["mirror", "relative velocity", "image"]).slice(0, 5);

// Q4: Extended object of height 5 cm, lateral magnification
searchResults[4] = findKeywords(["height", "plane mirror", "magnification"]).slice(0, 5);

// Q5 & Q13: Two plane mirrors inclined at 72 degrees
searchResults[5] = findKeywords(["mirrors", "inclined", "images"]).slice(0, 5);

// Q6: S placed at distance L, width d, walks parallel at 2L
searchResults[6] = findKeywords(["width", "mirror", "greatest distance"]).slice(0, 5);
if (searchResults[6].length === 0) searchResults[6] = findKeywords(["mirror", "field of view"]).slice(0, 5);

// Q7: Mirror velocity 3i + 4j, normal along x-axis, object moving with velocity -2i + 5j
searchResults[7] = findKeywords(["velocity", "mirror", "image"]).slice(0, 5);

// Q8: real object, concave mirror, focal length 20 cm, magnification -2
searchResults[8] = findKeywords(["concave mirror", "magnification", "focal length", "20"]).slice(0, 5);

// Q9: parallel mirrors distance 20 cm, point object at 5 cm, distance between 3rd and 2nd images
searchResults[9] = findKeywords(["parallel", "mirrors", "distance", "image"]).slice(0, 5);

// Q10: mirror length 10 cm, observer at (0, 10), moving along y = 20
searchResults[10] = findKeywords(["observer", "mirror", "y ="]).slice(0, 5);

// Q11: velocity vm = i - 2j + 5k, vo = 2i + 3j - 4k
searchResults[11] = findKeywords(["velocity", "mirror", "image", "k"]).slice(0, 5);

// Q12: Concave mirror, focal length 20, distance 30, constant speed 5, rate of change of lateral magnification
searchResults[12] = findKeywords(["rate of change", "magnification"]).slice(0, 5);

// Q16: concave mirror, focal length 15 cm, real image 3 times
searchResults[16] = findKeywords(["concave mirror", "focal length 15", "times"]).slice(0, 5);

// Q17: Parallel plane mirrors separated by 30 cm, 10 cm from first
searchResults[17] = findKeywords(["parallel", "mirrors", "30", "10"]).slice(0, 5);

// Q18: mirror length 10 cm parallel to wall, point source midway, distance 20 cm, illuminated patch
searchResults[18] = findKeywords(["patch", "wall"]).slice(0, 5);

// Q19: mirror in y-z plane moving at 4 m/s, object at 6 m/s, angle 60
searchResults[19] = findKeywords(["y-z plane", "mirror"]).slice(0, 5);

// Q20: distance of 40 cm, lateral magnification of -1/3, moved by 20 cm towards
searchResults[20] = findKeywords(["magnification", "moved", "40", "mirror"]).slice(0, 5);

// Q21: plane 2x - y + 2z = 12, object (2, 5, 2)
searchResults[21] = findKeywords(["2x", "y", "z", "mirror"]).slice(0, 5);
if (searchResults[21].length === 0) searchResults[21] = findKeywords(["plane", "mirror", "image"]).slice(0, 10);

// Q22: height 1.5 m stands 2 m, pole height 9 m located 6 m behind
searchResults[22] = findKeywords(["pole", "mirror"]).slice(0, 5);

// Q23: mirror velocity vM = 2i + 3j - k, normal 1/3(2i - 2j + k), object velocity vO = 6i - j + k
searchResults[23] = findKeywords(["normal", "velocity", "mirror"]).slice(0, 5);

// Q24: concave mirror focal length 20 cm, object at 25 cm, cut into two equal halves moved 5 mm
searchResults[24] = findKeywords(["cut", "halves"]).slice(0, 5);

// Print findings
Object.keys(searchResults).forEach(num => {
  console.log(`\n========================================`);
  console.log(`LATEX QUESTION ${num}`);
  const matches = searchResults[num];
  if (matches && matches.length > 0) {
    matches.forEach((m: any, idx: number) => {
      console.log(`  MATCH ${idx + 1}: [${m.source}] ID: ${m.QuestionId}`);
      console.log(`  Q: ${m.Question?.substring(0, 250)}`);
      console.log(`  Ans: ${JSON.stringify(m.Answer)}`);
    });
  } else {
    console.log("  NO EXACT KEYWORD MATCH FOUND.");
  }
});
