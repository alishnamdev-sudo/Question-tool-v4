import * as fs from "fs";
import * as path from "path";
import stringSimilarity from "string-similarity";

const targetQuestions = [
  {
    num: 1,
    text: "A point object is placed at a distance of 15 cm in front of a plane mirror. If the mirror is moved 5 cm away from the object, what is the distance between the initial and final positions of the image?",
    keywords: ["plane mirror", "moved", "away from the object", "initial and final positions of the image", "15 cm"]
  },
  {
    num: 2,
    text: "A man of height 1.8 m stands in front of a vertical plane mirror. What is the minimum length of the mirror required for him to see his complete image?",
    keywords: ["man of height", "stands in front of a vertical plane mirror", "minimum length of the mirror required"]
  },
  {
    num: 3,
    text: "An object moves towards a stationary plane mirror with a speed of 4 m/s. What is the relative speed of the image with respect to the object?",
    keywords: ["relative speed", "moves towards a stationary plane mirror", "4 m/s", "with respect to the object"]
  },
  {
    num: 4,
    text: "An extended object of height 5 cm is placed in front of a plane mirror. What is the lateral magnification and the height of the image formed?",
    keywords: ["height 5 cm", "plane mirror", "lateral magnification", "height of the image formed"]
  },
  {
    num: 5,
    text: "Two plane mirrors are inclined at an angle of 72. A point object is placed asymmetrically between them. The total number of images formed is:",
    keywords: ["inclined at an angle of 72", "point object is placed asymmetrically", "images formed"]
  },
  {
    num: 6,
    text: "A point source of light S is placed at a distance L in front of the center of a plane mirror of width d, hung vertically on a wall. A man walks in front of the mirror along a line parallel to the mirror at a distance 2L from it. The greatest distance over which he can see the image of the light source in the mirror is:",
    keywords: ["point source of light S", "center of a plane mirror of width d", "walks in front of the mirror", "parallel to the mirror at a distance 2L"]
  },
  {
    num: 7,
    text: "A plane mirror is moving with velocity 3i + 4j m/s in the x-y plane. The normal to the mirror is along the x-axis. An object is moving with velocity -2i + 5j m/s. The velocity of the image is:",
    keywords: ["plane mirror is moving with velocity", "normal to the mirror is along", "velocity of the image is"]
  },
  {
    num: 8,
    text: "A real object is placed in front of a concave mirror of focal length 20 cm. If the lateral magnification produced is -2, the distance of the object from the mirror is:",
    keywords: ["concave mirror of focal length 20 cm", "lateral magnification produced is -2", "distance of the object"]
  },
  {
    num: 9,
    text: "Two plane mirrors are placed parallel to each other at a distance of 20 cm. A point object is placed at a distance of 5 cm from one of the mirrors. What is the distance between the 3rd image formed by the first mirror and the 2nd image formed by the second mirror?",
    keywords: ["parallel to each other at a distance of 20 cm", "point object is placed at a distance of 5 cm", "3rd image", "2nd image"]
  },
  {
    num: 10,
    text: "A plane mirror of length 10 cm is placed on the x-axis from x = -5 cm to x = 5 cm. An observer is at (0, 10 cm). An extended object is moving along the line y = 20 cm. What is the length of the path on y = 20 cm over which the observer can see the image of the object?",
    keywords: ["x-axis from x = -5 cm to x = 5 cm", "observer is at (0, 10 cm)", "moving along the line y = 20 cm", "observer can see the image of the object"]
  },
  {
    num: 11,
    text: "A plane mirror lies in the x-y plane and moves with a velocity vm = i - 2j + 5k m/s. A point object is moving with a velocity vo = 2i + 3j - 4k m/s. The velocity of the image formed by the plane mirror is:",
    keywords: ["plane mirror lies in the x-y plane", "velocity of the image formed by the plane mirror"]
  },
  {
    num: 12,
    text: "A small object is placed perpendicular to the principal axis of a concave mirror of focal length 20 cm at a distance of 30 cm. If the object moves away from the mirror at a constant speed of 5 cm/s, the rate of change of its lateral magnification is:",
    keywords: ["concave mirror of focal length 20 cm at a distance of 30 cm", "constant speed of 5 cm/s", "rate of change of its lateral magnification"]
  },
  {
    num: 13,
    text: "Two plane mirrors are inclined at an angle of 72. A point object is placed asymmetrically between them. The total number of images formed is:",
    keywords: ["inclined at an angle of 72", "point object is placed asymmetrically", "total number of images formed"]
  },
  {
    num: 14,
    text: "A person of height H stands in front of a vertical plane mirror. The minimum length of the mirror required for the person to see their complete full-length image is:",
    keywords: ["height H stands in front of a vertical plane mirror", "minimum length of the mirror required"]
  },
  {
    num: 15,
    text: "An object moves towards a stationary vertical plane mirror with a speed of 5 m/s. The relative speed of the image with respect to the object is:",
    keywords: ["stationary vertical plane mirror with a speed of 5 m/s", "relative speed of the image"]
  },
  {
    num: 16,
    text: "A concave mirror of focal length 15 cm forms a real image that is 3 times the size of the object. Find the object distance from the mirror in cm.",
    keywords: ["concave mirror of focal length 15 cm", "real image that is 3 times", "object distance from the mirror"]
  },
  {
    num: 17,
    text: "Two parallel plane mirrors are separated by a distance of 30 cm. A point object is placed 10 cm from the first mirror. Find the distance of the second image formed by the first mirror from the first mirror (in cm).",
    keywords: ["parallel plane mirrors are separated by a distance of 30 cm", "point object is placed 10 cm from the first mirror", "second image formed by the first mirror"]
  },
  {
    num: 18,
    text: "A plane mirror of length 10 cm is placed parallel to a wall. A point source of light is placed exactly midway between the wall and the mirror at a distance of 20 cm from the mirror. What is the length of the illuminated patch on the wall in cm?",
    keywords: ["length 10 cm is placed parallel to a wall", "midway between the wall and the mirror", "illuminated patch on the wall"]
  },
  {
    num: 19,
    text: "A plane mirror lying in the y-z plane is moving with a speed of 4 m/s along the positive x-axis. An object is moving with a speed of 6 m/s at an angle of 60 with the positive x-axis in the x-y plane. Find the square of the magnitude of the velocity of the image (in m^2/s^2).",
    keywords: ["mirror lying in the y-z plane is moving with a speed of 4", "angle of 60", "square of the magnitude of the velocity of the image"]
  },
  {
    num: 20,
    text: "An object is placed at a distance of 40 cm from a spherical mirror, producing a lateral magnification of -1/3. If the object is moved by 20 cm towards the mirror, the new lateral magnification becomes -m. Find the value of 10m.",
    keywords: ["spherical mirror", "lateral magnification of -1/3", "moved by 20 cm towards", "value of 10m"]
  },
  {
    num: 21,
    text: "A plane mirror is placed along the plane 2x - y + 2z = 12. A point object is placed at (2, 5, 2). If the coordinates of the image formed are (a, b, c), find the value of a^2 + b^2 + c^2.",
    keywords: ["plane mirror is placed along the plane", "2x - y + 2z = 12", "point object is placed at (2, 5, 2)", "a^2 + b^2 + c^2"]
  },
  {
    num: 22,
    text: "A person whose eyes are at a height of 1.5 m from the ground stands 2 m in front of a vertical plane mirror. A vertical pole of height 9 m is located 6 m behind the person. What is the minimum length of the mirror (in cm) required for the person to see the complete image of the pole?",
    keywords: ["height of 1.5 m from the ground stands 2 m", "pole of height 9 m is located 6 m", "minimum length of the mirror", "complete image of the pole"]
  },
  {
    num: 23,
    text: "A plane mirror is moving with a velocity vM = 2i + 3j - k m/s. The unit normal vector to the mirror surface is n = 1/3(2i - 2j + k). A point object is moving with a velocity vO = 6i - j + k m/s in front of the mirror. If the velocity of the image formed by the mirror is vI, find the value of |vI|^2 in m^2/s^2.",
    keywords: ["vM = 2i + 3j - k", "unit normal vector to the mirror surface is", "vO = 6i - j + k", "value of |vI|^2"]
  },
  {
    num: 24,
    text: "A point object is placed at a distance of 25 cm from a concave mirror of focal length 20 cm on its principal axis. The mirror is cut into two equal halves along a plane containing the principal axis, and the two halves are moved apart perpendicularly to the principal axis by a total distance of 5 mm. Find the distance between the two images formed by the two halves in mm.",
    keywords: ["concave mirror of focal length 20 cm on its principal axis", "mirror is cut into two equal halves", "moved apart perpendicularly", "distance between the two images"]
  }
];

const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");

let allQuestions: any[] = [];

if (fs.existsSync(jeePath)) {
  const jeeData = JSON.parse(fs.readFileSync(jeePath, "utf-8"));
  allQuestions = allQuestions.concat(jeeData.map((q: any) => ({ ...q, source: "JEE" })));
}
if (fs.existsSync(neetPath)) {
  const neetData = JSON.parse(fs.readFileSync(neetPath, "utf-8"));
  allQuestions = allQuestions.concat(neetData.map((q: any) => ({ ...q, source: "NEET" })));
}

console.log(`Loaded ${allQuestions.length} questions in total from default databases.`);

targetQuestions.forEach(target => {
  let bestMatch: any = null;
  let highestScore = 0;

  for (const q of allQuestions) {
    const qText = q.Question || "";
    
    // Calculate string similarity on full text
    let score = stringSimilarity.compareTwoStrings(target.text.toLowerCase(), qText.toLowerCase());

    // Look at keyword presence to boost matching
    let keywordMatches = 0;
    target.keywords.forEach(kw => {
      if (qText.toLowerCase().includes(kw.toLowerCase())) {
        keywordMatches++;
      }
    });

    if (keywordMatches > 0) {
      score += keywordMatches * 0.12;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = q;
    }
  }

  console.log(`\n========================================`);
  console.log(`LATEX QUESTION ${target.num}: "${target.text}"`);
  if (bestMatch && highestScore > 0.15) {
    console.log(`MATCHED PYQ SOURCE: [${bestMatch.source}] [ID: ${bestMatch.QuestionId || "N/A"}] (Score: ${highestScore.toFixed(3)})`);
    console.log(`Chapter: ${bestMatch.Tags?.[0]?.Chapter || "N/A"} | Topic: ${bestMatch.Tags?.[0]?.Topic || "N/A"}`);
    console.log(`Original Question: "${bestMatch.Question?.replace(/\s+/g, " ").trim()}"`);
    console.log(`Original Answer: ${JSON.stringify(bestMatch.Answer)}`);
    console.log(`Original Options: ${JSON.stringify(bestMatch.Options)}`);
    console.log(`Original Solution: "${bestMatch.Solution?.replace(/\s+/g, " ").trim().substring(0, 150)}..."`);
  } else {
    console.log(`NO STRONG MATCH FOUND (Highest score: ${highestScore.toFixed(3)})`);
  }
});
