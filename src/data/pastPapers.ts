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
}

export const pastPapersDatabase: PastPaperQuestion[] = [];

let hasLoaded = false;

function loadDatabase(): PastPaperQuestion[] {
  if (hasLoaded) {
    return pastPapersDatabase;
  }

  function mapJsonQuestion(q: any, sourceExam: "JEE" | "NEET"): PastPaperQuestion {
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
      sourceExam
    };
  }

  // Load JEE Main PYQs
  try {
    const jeePath = path.join(process.cwd(), "src", "data", "JEE Main PYQs (2015-2026).json");
    if (fs.existsSync(jeePath)) {
      const data = fs.readFileSync(jeePath, "utf-8");
      const questions = JSON.parse(data);
      if (Array.isArray(questions)) {
        questions.forEach(q => {
          pastPapersDatabase.push(mapJsonQuestion(q, "JEE"));
        });
        console.log(`RAG Engine: Loaded ${questions.length} questions from JEE Main PYQs.`);
      }
    } else {
      console.warn("RAG Engine: JEE Main PYQs file not found at:", jeePath);
    }
  } catch (e) {
    console.error("RAG Engine: Error loading JEE Main PYQs database:", e);
  }

  // Load NEET PYQs
  try {
    const neetPath = path.join(process.cwd(), "src", "data", "NEET PYQs (2013-2026).json");
    if (fs.existsSync(neetPath)) {
      const data = fs.readFileSync(neetPath, "utf-8");
      const questions = JSON.parse(data);
      if (Array.isArray(questions)) {
        questions.forEach(q => {
          pastPapersDatabase.push(mapJsonQuestion(q, "NEET"));
        });
        console.log(`RAG Engine: Loaded ${questions.length} questions from NEET PYQs.`);
      }
    } else {
      console.warn("RAG Engine: NEET PYQs file not found at:", neetPath);
    }
  } catch (e) {
    console.error("RAG Engine: Error loading NEET PYQs database:", e);
  }

  // Load PDF-Ingested NEET Questions (extracted from uploaded PDF/textbook sources)
  // This dataset ships with pre-flattened fields (questionText, options, correctAnswer,
  // subject, chapter, topic, year, difficulty), so we map them directly instead of using
  // mapJsonQuestion (whose Answer/Tags handling targets the PYQ schema).
  try {
    const pdfNeetPath = path.join(process.cwd(), "src", "data", "NEET", "PDF_Ingested_Questions.json");
    if (fs.existsSync(pdfNeetPath)) {
      const data = fs.readFileSync(pdfNeetPath, "utf-8");
      const questions = JSON.parse(data);
      if (Array.isArray(questions)) {
        questions.forEach((q: any, idx: number) => {
          const rawSubject = String(q.subject || (q.Tags && q.Tags[0] && q.Tags[0].Subject) || "Physics").toLowerCase();
          let subject: PastPaperQuestion["subject"] = "Physics";
          if (rawSubject.includes("math")) subject = "Mathematics";
          else if (rawSubject.includes("chem")) subject = "Chemistry";
          else if (rawSubject.includes("biol") || rawSubject.includes("bot") || rawSubject.includes("zoo")) subject = "Biology";
          else if (rawSubject.includes("phys")) subject = "Physics";

          const rawDiff = String(q.difficulty || "Medium").toLowerCase();
          let difficulty: PastPaperQuestion["difficulty"] = "Medium";
          if (rawDiff.includes("easy") || rawDiff.includes("beginner")) difficulty = "Easy";
          else if (rawDiff.includes("hard") || rawDiff.includes("tough") || rawDiff.includes("difficult")) difficulty = "Hard";

          const rawType = String(q.type || q.Type || "").toLowerCase();
          const type: PastPaperQuestion["type"] = rawType.includes("num") ? "Numerical" : "SCQ";

          const options = Array.isArray(q.options)
            ? q.options.map((o: any) => String(o))
            : undefined;
          const year = Number(q.year) || 2024;
          const chapterName = q.chapter || (q.Tags && q.Tags[0] && q.Tags[0].Chapter) || "General";
          const topicName = q.topic || (q.Tags && q.Tags[0] && q.Tags[0].Topic) || "General";

          pastPapersDatabase.push({
            id: String(q.id || q.QuestionId || `pdf_neet_${idx}`),
            examPattern: "NEET",
            grade: "Class 12",
            subject,
            chapterName,
            topicName,
            subTopic: q.topic || undefined,
            year,
            type,
            questionText: q.questionText || q.Question || "",
            options,
            correctAnswer: q.correctAnswer || "",
            solution: q.solution || "",
            difficulty,
            citation: `NEET ${year} - ${chapterName}`,
            sourceExam: "NEET"
          });
        });
        console.log(`RAG Engine: Loaded ${questions.length} questions from PDF-Ingested NEET dataset.`);
      }
    } else {
      console.warn("RAG Engine: PDF-Ingested NEET file not found at:", pdfNeetPath);
    }
  } catch (e) {
    console.error("RAG Engine: Error loading PDF-Ingested NEET database:", e);
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

  // 4. Return top limit questions (or all if less than limit)
  const results = scoredPool.slice(0, limit).map(item => item.question);
  
  // If we still have absolutely nothing, let's grab a few generic past questions for that subject from the db
  if (results.length === 0) {
    const genericFallback = db.filter(q => q.subject.toLowerCase() === subject).slice(0, limit);
    console.log(`RAG Engine: No direct match. Returning ${genericFallback.length} generic subject fallbacks.`);
    return genericFallback;
  }

  console.log(`RAG Engine: Successfully retrieved ${results.length} past papers for prompting.`);
  return results;
}
