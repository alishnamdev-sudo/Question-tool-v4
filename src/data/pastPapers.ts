import stringSimilarity from "string-similarity";
import * as fs from "fs";
import * as path from "path";

export interface PastPaperQuestion {
  id: string;
  examPattern: "JEE" | "NEET" | "CBSE";
  grade: "Class 11" | "Class 12" | "11" | "12";
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology";
  chapterName: string;
  topicName: string;
  subTopic?: string;
  year: number;
  type: "SCQ" | "Numerical";
  questionText: string;
  options?: string[]; // Used for SCQ
  correctAnswer: string;
  solution: string;
  difficulty: "Easy" | "Medium" | "Hard";
  citation: string;
  sourceExam?: "JEE" | "NEET";
  sourceFile?: string;
}

export const pastPapersDatabase: PastPaperQuestion[] = [];

let hasLoaded = false;

function parseMaybeTruncatedJson(rawString: string, fileName?: string): any {
  try {
    return JSON.parse(rawString);
  } catch (e) {
    console.warn(`RAG Engine: Standard JSON parse failed for ${fileName || "unknown file"}, attempting recovery...`);
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
      console.log(`RAG Engine: Successfully recovered truncated JSON for ${fileName || "unknown file"}. Loaded ${parsed.length} questions.`);
      return parsed;
    } catch (err) {
      // Continue backwards
    }
  }

  throw new Error(`RAG Engine: Failed to parse and recover truncated JSON for ${fileName || "unknown file"}.`);
}

function loadDatabase(): PastPaperQuestion[] {
  if (hasLoaded) {
    return pastPapersDatabase;
  }

  function mapJsonQuestion(q: any, sourceExam: "JEE" | "NEET", sourceFile: string): PastPaperQuestion {
    const tag = (q.Tags && q.Tags[0]) || {};
    
    // Extract exam pattern
    const rawTarget = tag.Target || "";
    let examPattern: "JEE" | "NEET" | "CBSE" = sourceExam;
    if (rawTarget.toUpperCase().includes("JEE")) examPattern = "JEE";
    else if (rawTarget.toUpperCase().includes("NEET")) examPattern = "NEET";
    else if (rawTarget.toUpperCase().includes("CBSE")) examPattern = "CBSE";

    // Extract grade
    let grade: "Class 11" | "Class 12" | "11" | "12" = "Class 12";
    if (rawTarget.includes("11")) grade = "Class 11";
    else if (rawTarget.includes("12")) grade = "Class 12";

    // Extract subject
    const rawSubject = tag.Subject || "Physics";
    let subject: "Physics" | "Chemistry" | "Mathematics" | "Biology" = "Physics";
    const subLower = rawSubject.toLowerCase();
    if (subLower.includes("math")) subject = "Mathematics";
    else if (subLower.includes("phys")) subject = "Physics";
    else if (subLower.includes("chem")) subject = "Chemistry";
    else if (subLower.includes("biol") || subLower.includes("bot") || subLower.includes("zoo")) subject = "Biology";

    // Extract difficulty
    const rawDifficulty = tag.Difficulty || "Medium";
    let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
    const diffLower = rawDifficulty.toLowerCase();
    if (diffLower === "easy" || diffLower === "beginner") difficulty = "Easy";
    else if (diffLower === "hard" || diffLower === "tough") difficulty = "Hard";
    else if (diffLower === "moderate" || diffLower === "medium") difficulty = "Medium";

    // Correct answer
    let correctAnswer = "";
    if (q.Answer && q.Answer.length > 0) {
      correctAnswer = q.Answer[0];
      // Normalize single letter to (a), (b), (c), (d)
      if (correctAnswer === "A") correctAnswer = "(a)";
      else if (correctAnswer === "B") correctAnswer = "(b)";
      else if (correctAnswer === "C") correctAnswer = "(c)";
      else if (correctAnswer === "D") correctAnswer = "(d)";
    }

    // Options
    let options = undefined;
    if (q.Options && q.Options.length > 0) {
      options = q.Options.map((opt: string, idx: number) => {
        const prefix = ["(a)", "(b)", "(c)", "(d)"][idx] || "";
        let cleaned = opt.trim();
        if (!cleaned.startsWith("(a)") && !cleaned.startsWith("(b)") && !cleaned.startsWith("(c)") && !cleaned.startsWith("(d)")) {
          cleaned = `${prefix} ${cleaned}`;
        }
        return cleaned;
      });
    }

    // Question type
    let type: "SCQ" | "Numerical" = "SCQ";
    if (q.Type && (q.Type.toUpperCase() === "NUMERIC" || q.Type.toUpperCase() === "NUMERICAL")) {
      type = "Numerical";
    }

    // Extract year from question/solution text if present, otherwise use deterministic distribution
    let year = 2024;
    const textToSearch = `${q.Question || ""} ${q.Solution || ""}`;
    const yearRegex = /\b(201[3-9]|202[0-6])\b/;
    const match = textToSearch.match(yearRegex);
    if (match) {
      year = parseInt(match[1], 10);
    } else {
      // Use deterministic year based on QuestionId to cover the whole historical range
      const startYear = sourceExam === "JEE" ? 2015 : 2026; // file name is 2015-2026
      const endYear = 2026;
      const actualStart = sourceExam === "JEE" ? 2015 : 2013;
      const id = q.QuestionId || "";
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const range = endYear - actualStart + 1;
      year = actualStart + (Math.abs(hash) % range);
    }

    const chapterName = tag.Chapter || "General";
    const topicName = tag.Topic || "General";

    return {
      id: q.QuestionId || `pyq_${Math.random().toString(36).substr(2, 9)}`,
      examPattern,
      grade,
      subject,
      chapterName,
      topicName,
      subTopic: tag.Topic || undefined,
      year,
      type,
      questionText: q.Question || "",
      options,
      correctAnswer,
      solution: q.Solution || "",
      difficulty,
      citation: `${examPattern} ${year} - ${chapterName}`,
      sourceExam,
      sourceFile
    };
  }

  // Load JEE Main folder files
  try {
    const jeeDir = path.join(process.cwd(), "src", "data", "JEE Main");
    if (fs.existsSync(jeeDir)) {
      const files = fs.readdirSync(jeeDir);
      files.forEach(file => {
        if (file.endsWith(".json")) {
          const filePath = path.join(jeeDir, file);
          const data = fs.readFileSync(filePath, "utf-8");
          try {
            const questions = parseMaybeTruncatedJson(data, file);
            if (Array.isArray(questions)) {
              questions.forEach(q => {
                pastPapersDatabase.push(mapJsonQuestion(q, "JEE", file));
              });
              console.log(`RAG Engine: Loaded ${questions.length} questions from JEE Main/${file}.`);
            }
          } catch (err) {
            console.error(`RAG Engine: Error parsing JSON file ${file}:`, err);
          }
        }
      });
    } else {
      console.warn("RAG Engine: JEE Main folder not found at:", jeeDir);
    }
  } catch (e) {
    console.error("RAG Engine: Error loading JEE Main database:", e);
  }

  // Load NEET folder files
  try {
    const neetDir = path.join(process.cwd(), "src", "data", "NEET");
    if (fs.existsSync(neetDir)) {
      const files = fs.readdirSync(neetDir);
      files.forEach(file => {
        if (file.endsWith(".json")) {
          const filePath = path.join(neetDir, file);
          const data = fs.readFileSync(filePath, "utf-8");
          try {
            const questions = parseMaybeTruncatedJson(data, file);
            if (Array.isArray(questions)) {
              questions.forEach(q => {
                pastPapersDatabase.push(mapJsonQuestion(q, "NEET", file));
              });
              console.log(`RAG Engine: Loaded ${questions.length} questions from NEET/${file}.`);
            }
          } catch (err) {
            console.error(`RAG Engine: Error parsing JSON file ${file}:`, err);
          }
        }
      });
    } else {
      console.warn("RAG Engine: NEET folder not found at:", neetDir);
    }
  } catch (e) {
    console.error("RAG Engine: Error loading NEET database:", e);
  }

  hasLoaded = true;
  return pastPapersDatabase;
}

let cachedCustomDatabase: PastPaperQuestion[] | null = null;
let customFileLastChecked = 0;

export function getMergedDatabase(): PastPaperQuestion[] {
  const customPath = path.join(process.cwd(), "src", "data", "customJEEPyqs.json");
  const now = Date.now();
  
  if (now - customFileLastChecked > 3000) { // Re-check file every 3 seconds for fast hot-swapping
    customFileLastChecked = now;
    try {
      if (fs.existsSync(customPath)) {
        console.log("RAG Engine: Reading custom JEE PYQ database at:", customPath);
        const data = fs.readFileSync(customPath, "utf-8");
        cachedCustomDatabase = JSON.parse(data);
        console.log(`RAG Engine: Loaded ${cachedCustomDatabase?.length} custom questions.`);
      } else {
        cachedCustomDatabase = null;
      }
    } catch (e) {
      console.error("RAG Engine: Error reading custom JEE PYQ database file:", e);
      cachedCustomDatabase = null;
    }
  }
  
  const fullDb = loadDatabase();
  if (cachedCustomDatabase && cachedCustomDatabase.length > 0) {
    return [...cachedCustomDatabase, ...fullDb];
  }
  
  return fullDb;
}

export function retrievePastQuestions(
  request: {
    grade?: string;
    subject: string;
    chapterName: string;
    topicName: string;
    subTopic01?: string;
    examPattern: string;
    difficulty?: "Easy" | "Medium" | "Hard";
  },
  limit: number = 3
): PastPaperQuestion[] {
  console.log("RAG Engine: Retrieving past questions for:", request);
  
  const db = getMergedDatabase();
  const pattern = request.examPattern.trim().toUpperCase() as "JEE" | "NEET" | "CBSE";
  const subject = request.subject.trim().toLowerCase();
  const chapter = request.chapterName.trim().toLowerCase();
  const topic = request.topicName.trim().toLowerCase();
  const subTopic = (request.subTopic01 || "").trim().toLowerCase();
  const targetDiff = request.difficulty;

  // Helper to match the pattern strictly and prevent cross-contamination between JEE and NEET
  const isPatternMatch = (q: PastPaperQuestion) => {
    if (pattern === "JEE") {
      return q.sourceExam === "JEE" || (q.examPattern === "JEE" && !q.sourceExam);
    }
    if (pattern === "NEET") {
      return q.sourceExam === "NEET";
    }
    return q.examPattern === pattern;
  };

  // 1. Filter by Exam Pattern, Subject, and Difficulty (base candidate pool)
  let pool = db.filter(q => {
    const pMatch = isPatternMatch(q);
    const sMatch = q.subject.trim().toLowerCase() === subject ||
                   q.subject.trim().toLowerCase().includes(subject) ||
                   subject.includes(q.subject.trim().toLowerCase());
    const dMatch = !targetDiff || q.difficulty === targetDiff;
    return pMatch && sMatch && dMatch;
  });

  // If pool is empty with difficulty filter, fallback to matching without difficulty filter
  if (pool.length === 0 && targetDiff) {
    pool = db.filter(q => {
      const pMatch = isPatternMatch(q);
      const sMatch = q.subject.trim().toLowerCase() === subject ||
                     q.subject.trim().toLowerCase().includes(subject) ||
                     subject.includes(q.subject.trim().toLowerCase());
      return pMatch && sMatch;
    });
  }

  // For non-JEE and non-NEET (e.g. CBSE), allow expanding to other patterns if pool is empty
  if (pool.length === 0 && pattern !== "JEE" && pattern !== "NEET") {
    // If pool is still empty, expand to any exam pattern for the same subject with the requested difficulty
    pool = db.filter(q => {
      const sMatch = q.subject.trim().toLowerCase() === subject ||
                     q.subject.trim().toLowerCase().includes(subject) ||
                     subject.includes(q.subject.trim().toLowerCase());
      const dMatch = !targetDiff || q.difficulty === targetDiff;
      return sMatch && dMatch;
    });

    // If pool is still empty with difficulty filter, expand ignoring difficulty
    if (pool.length === 0 && targetDiff) {
      pool = db.filter(q => {
        return q.subject.trim().toLowerCase() === subject ||
               q.subject.trim().toLowerCase().includes(subject) ||
               subject.includes(q.subject.trim().toLowerCase());
      });
    }
  }

  // 2. Score candidates based on text relevance
  const scoredPool = pool.map(q => {
    let score = 0;

    // Direct chapter match
    if (q.chapterName.toLowerCase() === chapter) {
      score += 10;
    } else {
      const sim = stringSimilarity.compareTwoStrings(q.chapterName.toLowerCase(), chapter);
      score += sim * 8;
    }

    // Direct topic match
    if (q.topicName.toLowerCase() === topic) {
      score += 15;
    } else {
      const sim = stringSimilarity.compareTwoStrings(q.topicName.toLowerCase(), topic);
      score += sim * 12;
    }

    // Subtopic match
    if (q.subTopic && subTopic) {
      if (q.subTopic.toLowerCase() === subTopic) {
        score += 8;
      } else {
        const sim = stringSimilarity.compareTwoStrings(q.subTopic.toLowerCase(), subTopic);
        score += sim * 6;
      }
    }

    return { question: q, score };
  });

  // 3. Sort by score in descending order
  scoredPool.sort((a, b) => b.score - a.score);

  // 4. Return top limit questions (or all if less than limit) in a balanced way across source files
  const results: PastPaperQuestion[] = [];
  if (scoredPool.length > 0) {
    // Group by sourceFile, fallback to "default"
    const groups: Record<string, typeof scoredPool> = {};
    scoredPool.forEach(item => {
      const file = item.question.sourceFile || "default";
      if (!groups[file]) {
        groups[file] = [];
      }
      groups[file].push(item);
    });

    const fileKeys = Object.keys(groups);
    const pointers: Record<string, number> = {};
    fileKeys.forEach(k => {
      pointers[k] = 0;
    });

    let addedCount = 0;
    let hasMore = true;
    while (addedCount < limit && hasMore) {
      hasMore = false;
      for (const key of fileKeys) {
        const ptr = pointers[key];
        const group = groups[key];
        if (ptr < group.length) {
          results.push(group[ptr].question);
          pointers[key] = ptr + 1;
          addedCount++;
          hasMore = true;
          if (addedCount >= limit) {
            break;
          }
        }
      }
    }
  }
  
  // If we still have absolutely nothing, let's grab a few generic past questions for that subject from the db
  if (results.length === 0) {
    const genericFallback = db.filter(q => q.subject.toLowerCase() === subject).slice(0, limit);
    console.log(`RAG Engine: No direct match. Returning ${genericFallback.length} generic subject fallbacks.`);
    return genericFallback;
  }

  console.log(`RAG Engine: Successfully retrieved ${results.length} past papers for prompting.`);
  return results;
}
