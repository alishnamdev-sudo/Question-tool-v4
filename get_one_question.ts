import * as fs from "fs";
import * as path from "path";

function parseMaybeTruncatedJson(rawString: string, fileName?: string): any {
  try {
    return JSON.parse(rawString);
  } catch (e) {
    console.warn(`Recovery: Standard JSON parse failed for ${fileName || "unknown file"}, attempting recovery...`);
  }

  let index = rawString.length;
  while (true) {
    index = rawString.lastIndexOf("}", index - 1);
    if (index === -1) {
      break;
    }

    let slice = rawString.slice(0, index + 1).trim();
    if (slice.endsWith(",")) {
      slice = slice.slice(0, -1).trim();
    }

    const candidate = slice + "]";
    try {
      const parsed = JSON.parse(candidate);
      console.log(`Recovery: Successfully recovered truncated JSON for ${fileName || "unknown file"}. Loaded ${parsed.length} questions.`);
      return parsed;
    } catch (err) {
      // Continue backwards
    }
  }

  throw new Error(`Recovery: Failed to parse and recover truncated JSON for ${fileName || "unknown file"}.`);
}

const targetIds = [
  "5fe9ea79e9fb3d3419dbe188",
  "5ebfc0383bbc4101506d0b8a",
  "69022339ae413f2843ac2c17",
  "5c82191ce4b00c779334c1e8",
  "6a17ac5be64c2344c77e7e56",
  "6985b44b952d4d2d44b9487e",
  "615bf9c03c665c0ae21c9e96",
  "6a0f13a2e0907f20bb7b2041",
  "5c6fefbde4b058541473fcdc"
];

const dbDirs = [
  path.join(process.cwd(), "src", "data", "JEE Main"),
  path.join(process.cwd(), "src", "data", "NEET")
];

dbDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith(".json")) {
      const filePath = path.join(dir, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = parseMaybeTruncatedJson(content, file);
        if (parsed && Array.isArray(parsed)) {
          parsed.forEach((q: any) => {
            if (targetIds.includes(q.QuestionId)) {
              console.log(`\n========================================`);
              console.log(`FOUND TARGET ID: ${q.QuestionId} [File: ${file}]`);
              console.log(`========================================`);
              console.log(`Question: ${q.Question}`);
              console.log(`Options: ${JSON.stringify(q.Options)}`);
              console.log(`Answer: ${JSON.stringify(q.Answer)}`);
              console.log(`Solution: ${q.Solution}`);
            }
          });
        }
      } catch (err) {
        console.error(`Fatal error reading ${file}:`, err);
      }
    }
  });
});
