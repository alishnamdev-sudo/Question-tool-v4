import * as fs from "fs";
import * as path from "path";
import stringSimilarity from "string-similarity";

const targetQuestions = [
  { num: 1, text: "A point object is placed at a distance of 15 cm in front of a plane mirror. If the mirror is moved 5 cm away from the object, what is the distance between the initial and final positions of the image?" },
  { num: 2, text: "A man of height 1.8 m stands in front of a vertical plane mirror. What is the minimum length of the mirror required for him to see his complete image?" },
  { num: 3, text: "An object moves towards a stationary plane mirror with a speed of 4 m/s. What is the relative speed of the image with respect to the object?" },
  { num: 4, text: "An extended object of height 5 cm is placed in front of a plane mirror. What is the lateral magnification and the height of the image formed?" },
  { num: 5, text: "Two plane mirrors are inclined at an angle of 72. A point object is placed asymmetrically between them. The total number of images formed is:" },
  { num: 6, text: "A point source of light S is placed at a distance L in front of the center of a plane mirror of width d, hung vertically on a wall. A man walks in front of the mirror along a line parallel to the mirror at a distance 2L from it. The greatest distance over which he can see the image of the light source in the mirror is:" },
  { num: 7, text: "A plane mirror is moving with velocity 3i + 4j m/s in the x-y plane. The normal to the mirror is along the x-axis. An object is moving with velocity -2i + 5j m/s. The velocity of the image is:" },
  { num: 8, text: "A real object is placed in front of a concave mirror of focal length 20 cm. If the lateral magnification produced is -2, the distance of the object from the mirror is:" },
  { num: 9, text: "Two plane mirrors are placed parallel to each other at a distance of 20 cm. A point object is placed at a distance of 5 cm from one of the mirrors. What is the distance between the 3rd image formed by the first mirror and the 2nd image formed by the second mirror?" },
  { num: 10, text: "A plane mirror of length 10 cm is placed on the x-axis from x = -5 cm to x = 5 cm. An observer is at (0, 10 cm). An extended object is moving along the line y = 20 cm. What is the length of the path on y = 20 cm over which the observer can see the image of the object?" },
  { num: 11, text: "A plane mirror lies in the x-y plane and moves with a velocity vm = i - 2j + 5k m/s. A point object is moving with a velocity vo = 2i + 3j - 4k m/s. The velocity of the image formed by the plane mirror is:" },
  { num: 12, text: "A small object is placed perpendicular to the principal axis of a concave mirror of focal length 20 cm at a distance of 30 cm. If the object moves away from the mirror at a constant speed of 5 cm/s, the rate of change of its lateral magnification is:" },
  { num: 13, text: "Two plane mirrors are inclined at an angle of 72. A point object is placed asymmetrically between them. The total number of images formed is:" },
  { num: 14, text: "A person of height H stands in front of a vertical plane mirror. The minimum length of the mirror required for the person to see their complete full-length image is:" },
  { num: 15, text: "An object moves towards a stationary vertical plane mirror with a speed of 5 m/s. The relative speed of the image with respect to the object is:" },
  { num: 16, text: "A concave mirror of focal length 15 cm forms a real image that is 3 times the size of the object. Find the object distance from the mirror in cm." },
  { num: 17, text: "Two parallel plane mirrors are separated by a distance of 30 cm. A point object is placed 10 cm from the first mirror. Find the distance of the second image formed by the first mirror from the first mirror (in cm)." },
  { num: 18, text: "A plane mirror of length 10 cm is placed parallel to a wall. A point source of light is placed exactly midway between the wall and the mirror at a distance of 20 cm from the mirror. What is the length of the illuminated patch on the wall in cm?" },
  { num: 19, text: "A plane mirror lying in the y-z plane is moving with a speed of 4 m/s along the positive x-axis. An object is moving with a speed of 6 m/s at an angle of 60 with the positive x-axis in the x-y plane. Find the square of the magnitude of the velocity of the image (in m^2/s^2)." },
  { num: 20, text: "An object is placed at a distance of 40 cm from a spherical mirror, producing a lateral magnification of -1/3. If the object is moved by 20 cm towards the mirror, the new lateral magnification becomes -m. Find the value of 10m." },
  { num: 21, text: "A plane mirror is placed along the plane 2x - y + 2z = 12. A point object is placed at (2, 5, 2). If the coordinates of the image formed are (a, b, c), find the value of a^2 + b^2 + c^2." },
  { num: 22, text: "A person whose eyes are at a height of 1.5 m from the ground stands 2 m in front of a vertical plane mirror. A vertical pole of height 9 m is located 6 m behind the person. What is the minimum length of the mirror (in cm) required for the person to see the complete image of the pole?" },
  { num: 23, text: "A plane mirror is moving with a velocity vM = 2i + 3j - k m/s. The unit normal vector to the mirror surface is n = 1/3(2i - 2j + k). A point object is moving with a velocity vO = 6i - j + k m/s in front of the mirror. If the velocity of the image formed by the mirror is vI, find the value of |vI|^2 in m^2/s^2." },
  { num: 24, text: "A point object is placed at a distance of 25 cm from a concave mirror of focal length 20 cm on its principal axis. The mirror is cut into two equal halves along a plane containing the principal axis, and the two halves are moved apart perpendicularly to the principal axis by a total distance of 5 mm. Find the distance between the two images formed by the two halves in mm." }
];

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

const outLines: string[] = [];

targetQuestions.forEach(target => {
  outLines.push(`======================================================================`);
  outLines.push(`LATEX QUESTION ${target.num}: "${target.text}"`);
  outLines.push(`======================================================================`);

  // Compute scores for all DB questions
  const scored = dbQuestions.map(q => {
    const qText = q.Question || "";
    const score = stringSimilarity.compareTwoStrings(target.text.toLowerCase(), qText.toLowerCase());
    return { q, score };
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);

  // Print top 3 matches
  for (let i = 0; i < 3; i++) {
    const match = scored[i];
    if (match) {
      outLines.push(`  MATCH ${i + 1} (Score: ${match.score.toFixed(3)})`);
      outLines.push(`  Source: ${match.q.source} | ID: ${match.q.QuestionId}`);
      outLines.push(`  Chapter: ${match.q.Tags?.[0]?.Chapter || "N/A"} | Topic: ${match.q.Tags?.[0]?.Topic || "N/A"}`);
      outLines.push(`  Question: ${match.q.Question?.replace(/\s+/g, " ").trim()}`);
      outLines.push(`  Answer: ${JSON.stringify(match.q.Answer)}`);
      outLines.push(`  Solution: ${match.q.Solution?.replace(/\s+/g, " ").trim().substring(0, 300)}...`);
      outLines.push(`  ------------------------------------------------------------------`);
    }
  }
  outLines.push("\n");
});

fs.writeFileSync("top_physics_matches.txt", outLines.join("\n"));
console.log("Wrote top matches to top_physics_matches.txt");
