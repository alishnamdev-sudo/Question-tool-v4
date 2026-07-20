import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { TaxonomyManager } from "./src/services/taxonomyManager";
import { validateAndResolveSelection } from "./src/services/matcher";
import { GoogleGenAI } from "@google/genai";
import { generateQuestionMatrix } from "./src/services/balancer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Route for getting the full Taxonomy
  app.get("/api/taxonomy", async (req, res) => {
    try {
      const pattern = req.query.pattern?.toString() || "JEE";
      console.log(`API: Fetching taxonomy for pattern ${pattern}...`);
      const taxonomy = await TaxonomyManager.getTaxonomy(pattern);
      res.json(taxonomy);
    } catch (error: any) {
      console.error("API Error serving taxonomy:", error);
      res.status(500).json({ error: "Failed to get taxonomy from sheet" });
    }
  });

  // API Route for resolving a syllabus selection
  app.post("/api/resolve-selection", async (req, res) => {
    try {
      console.log("API: Resolving selection draft:", req.body);
      const { grade, subject, chapterName, topicName, subTopic01, pattern } = req.body;
      const taxonomy = await TaxonomyManager.getTaxonomy(pattern || "JEE");
      
      const result = validateAndResolveSelection(
        { grade, subject, chapterName, topicName, subTopic01 },
        taxonomy
      );
      res.json(result);
    } catch (error: any) {
      console.error("API Error resolving selection:", error);
      res.status(500).json({ error: "Failed to resolve selection" });
    }
  });

  // API Route for retrieving past papers matching the topic selection for RAG
  app.post("/api/past-papers", async (req, res) => {
    try {
      const { basket, topic, subject, examPattern } = req.body;
      const { retrievePastQuestions } = await import("./src/data/pastPapers");
      
      const results: any[] = [];
      if (basket && basket.length > 0) {
        for (const item of basket) {
          const easyCount = item.lodDistribution?.Easy || 0;
          const mediumCount = item.lodDistribution?.Medium || 0;
          const hardCount = item.lodDistribution?.Hard || 0;

          if (easyCount > 0) {
            const fetched = retrievePastQuestions({
              grade: item.node?.grade,
              subject: item.node?.subject || "Physics",
              chapterName: item.node?.chapterName || "",
              topicName: item.node?.topicName || "",
              subTopic01: item.node?.subTopic01 || "",
              examPattern: examPattern || "JEE",
              difficulty: "Easy"
            }, easyCount);
            results.push(...fetched);
          }
          if (mediumCount > 0) {
            const fetched = retrievePastQuestions({
              grade: item.node?.grade,
              subject: item.node?.subject || "Physics",
              chapterName: item.node?.chapterName || "",
              topicName: item.node?.topicName || "",
              subTopic01: item.node?.subTopic01 || "",
              examPattern: examPattern || "JEE",
              difficulty: "Medium"
            }, mediumCount);
            results.push(...fetched);
          }
          if (hardCount > 0) {
            const fetched = retrievePastQuestions({
              grade: item.node?.grade,
              subject: item.node?.subject || "Physics",
              chapterName: item.node?.chapterName || "",
              topicName: item.node?.topicName || "",
              subTopic01: item.node?.subTopic01 || "",
              examPattern: examPattern || "JEE",
              difficulty: "Hard"
            }, hardCount);
            results.push(...fetched);
          }

          if (easyCount === 0 && mediumCount === 0 && hardCount === 0) {
            const fetched = retrievePastQuestions({
              grade: item.node?.grade,
              subject: item.node?.subject || "Physics",
              chapterName: item.node?.chapterName || "",
              topicName: item.node?.topicName || "",
              subTopic01: item.node?.subTopic01 || "",
              examPattern: examPattern || "JEE"
            }, 3);
            results.push(...fetched);
          }
        }
      } else {
        const fetched = retrievePastQuestions({
          subject: subject || "Physics",
          chapterName: "Custom",
          topicName: topic || "General",
          examPattern: examPattern || "JEE"
        }, 3);
        results.push(...fetched);
      }
      
      // Deduplicate results
      const seen = new Set();
      const uniqueResults = results.filter(q => {
        if (seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      });

      res.json(uniqueResults);
    } catch (error: any) {
      console.error("API Error fetching past papers for RAG:", error);
      res.status(500).json({ error: "Failed to fetch past papers" });
    }
  });

  // API Routes for Custom JEE Main PYQs Database (2015-2026)
  app.get("/api/custom-pyqs/status", async (req, res) => {
    try {
      const customPath = path.join(process.cwd(), "src", "data", "customJEEPyqs.json");
      if (!fs.existsSync(customPath)) {
        return res.json({ exists: false });
      }

      const dataStr = await fs.promises.readFile(customPath, "utf-8");
      const questions = JSON.parse(dataStr);

      if (!Array.isArray(questions)) {
        return res.json({ exists: false, error: "Custom file format is invalid" });
      }

      // Compute statistics for the UI dashboard
      const subjectCounts: Record<string, number> = {};
      const yearCounts: Record<string, number> = {};
      const difficultyCounts: Record<string, number> = {};
      const chaptersSet = new Set<string>();

      questions.forEach((q: any) => {
        const sub = q.subject || "Physics";
        subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;

        const yr = q.year || 2024;
        yearCounts[yr] = (yearCounts[yr] || 0) + 1;

        const diff = q.difficulty || "Medium";
        difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;

        if (q.chapterName) {
          chaptersSet.add(q.chapterName);
        }
      });

      res.json({
        exists: true,
        totalCount: questions.length,
        subjectCounts,
        yearCounts,
        difficultyCounts,
        chaptersCount: chaptersSet.size,
        chapters: Array.from(chaptersSet).slice(0, 10), // Limit list to top 10 for compact representation
      });
    } catch (e: any) {
      console.error("API Error fetching custom pyq status:", e);
      res.status(500).json({ error: "Failed to get custom PYQ database status" });
    }
  });

  app.post("/api/custom-pyqs/upload", async (req, res) => {
    try {
      const { questions } = req.body;
      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: "Invalid payload. Expected an array of questions in 'questions' field." });
      }

      console.log(`API: Received ${questions.length} questions for custom JEE PYQs database. Processing and normalizing...`);
      
      // Helper to normalize different formats
      const normalized = questions.map((q: any, idx: number) => {
        const questionText = q.questionText || q.question || q.question_text || q.text || "";
        
        let options: string[] | undefined = undefined;
        if (Array.isArray(q.options)) {
          options = q.options.map((opt: any) => String(opt));
        } else if (Array.isArray(q.choices)) {
          options = q.choices.map((opt: any) => String(opt));
        } else if (q.options && typeof q.options === 'object') {
          options = Object.entries(q.options).map(([key, val]) => `(${key.toLowerCase()}) ${val}`);
        } else if (q.choices && typeof q.choices === 'object') {
          options = Object.entries(q.choices).map(([key, val]) => `(${key.toLowerCase()}) ${val}`);
        }
        
        let correctAnswer = q.correctAnswer || q.correct_answer || q.answer || q.ans || "";
        if (correctAnswer && typeof correctAnswer === 'string') {
          correctAnswer = correctAnswer.trim();
          const match = correctAnswer.match(/^\(?([a-dA-D])\)?$/);
          if (match) {
            correctAnswer = `(${match[1].toLowerCase()})`;
          }
        }
        
        const solution = q.solution || q.explanation || q.sol || q.expl || "No detailed solution provided.";
        
        let difficulty = "Medium";
        const rawDiff = String(q.difficulty || q.level || "Medium").toLowerCase().trim();
        if (rawDiff.includes("easy")) difficulty = "Easy";
        else if (rawDiff.includes("hard") || rawDiff.includes("difficult")) difficulty = "Hard";
        
        const year = Number(q.year || q.exam_year || 2024);
        
        let subject = "Physics";
        const rawSubj = String(q.subject || q.subjectName || q.subj || "Physics").toLowerCase().trim();
        if (rawSubj.includes("chem")) subject = "Chemistry";
        else if (rawSubj.includes("math")) subject = "Mathematics";
        else if (rawSubj.includes("biol") || rawSubj.includes("bot") || rawSubj.includes("zoo")) subject = "Biology";
        
        const chapterName = q.chapterName || q.chapter || q.chapter_name || "General";
        const topicName = q.topicName || q.topic || q.topic_name || "General";
        const subTopic = q.subTopic || q.subtopic || q.sub_topic || "";
        
        let type = q.type || q.questionType || (options ? "SCQ" : "Numerical");
        if (typeof type === 'string' && type.toLowerCase().includes("num")) {
          type = "Numerical";
        } else if (typeof type === 'string' && type.toLowerCase().includes("scq")) {
          type = "SCQ";
        }
        
        return {
          id: q.id || `custom_pyq_${idx}_${Date.now()}`,
          examPattern: "JEE",
          grade: q.grade || "Class 12",
          subject,
          chapterName,
          topicName,
          subTopic,
          year,
          type,
          questionText,
          options,
          correctAnswer,
          solution,
          difficulty,
          citation: q.citation || `JEE Main ${year} - ${chapterName}`
        };
      });

      const dirPath = path.join(process.cwd(), "src", "data");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const customPath = path.join(dirPath, "customJEEPyqs.json");
      await fs.promises.writeFile(customPath, JSON.stringify(normalized, null, 2), "utf-8");
      
      console.log(`API: Successfully saved ${normalized.length} normalized questions to ${customPath}`);
      
      res.json({
        success: true,
        totalCount: normalized.length,
        message: `Successfully uploaded and normalized ${normalized.length} questions.`
      });
    } catch (e: any) {
      console.error("API Error uploading custom pyqs:", e);
      res.status(500).json({ error: "Failed to process and save custom PYQ file" });
    }
  });

  app.post("/api/custom-pyqs/clear", async (req, res) => {
    try {
      const customPath = path.join(process.cwd(), "src", "data", "customJEEPyqs.json");
      if (fs.existsSync(customPath)) {
        await fs.promises.unlink(customPath);
      }
      res.json({ success: true, message: "Custom PYQ database deleted successfully. System reverted to default grounding DB." });
    } catch (e: any) {
      console.error("API Error clearing custom pyqs:", e);
      res.status(500).json({ error: "Failed to clear custom PYQ database" });
    }
  });

  // API Route for generating questions (supporting KNOWLEDGE_BASE and SOURCE_BASED modes)
  app.post("/api/generate", async (req, res) => {
    // Set headers for Server-Sent Events (SSE) streaming support
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      const { 
        mode, 
        examPattern, 
        topic, 
        easyCount, 
        mediumCount, 
        hardCount, 
        additionalInstructions, 
        selectedModel, 
        withFigures, 
        basket, 
        questionMix,
        files,
        isCustomExtract,
        customSubject,
        customChapter,
        customTopic,
        customTotalCount,
        customScqCount,
        customNumericalCount
      } = req.body;

      const cleanPattern = examPattern || "JEE";
      const taxonomy = await TaxonomyManager.getTaxonomy(cleanPattern);

      // Handle custom PDF exact question extraction model
      if (isCustomExtract) {
        // Build deduplicated taxonomy categories
        const uniqueNodes = new Set<string>();
        taxonomy.forEach(row => {
          const entry = `Subject: ${row.subject} | Chapter: ${row.chapterName} | Topic: ${row.topicName}${row.subTopic01 ? ` | Subtopic: ${row.subTopic01}` : ""}`;
          uniqueNodes.add(entry);
        });
        const taxonomyRepresentation = Array.from(uniqueNodes).map(node => `- ${node}`).join("\n");

        const preContextInfo = `
- Expected Exam Pattern/Target Stream: ${examPattern || "JEE/NEET (Auto)"}
- Expected Subject Focus: ${customSubject || "Auto/General"}
- Expected Chapter / Source Context: ${customChapter || "Auto/General"}
- Expected Topic / Subtopic Context (Optional): ${customTopic || "Auto/General"}
- Intended Total Questions Count in PDF: ${customTotalCount || "Not specified / Auto"}
- Intended Total SCQ questions: ${customScqCount || "Not specified / Auto"}
- Intended Total Numerical questions: ${customNumericalCount || "Not specified / Auto"}`;

        const systemInstruction = `# ROLE & BEHAVIOR
You are "ExamForge-Engine," an expert educational test parser and digitizer specializing in the Indian JEE (Advanced) and NEET examination frameworks. Your task is to digitize and extract EXACTLY and WORD-FOR-WORD the same questions and premium evaluation items present in the uploaded PDF/textbook/document pages.

---

# USER-PROVIDED QUESTIONS DOCUMENT METADATA PRE-CONTEXT
Use the following metadata characteristics provided by the user to guide your extraction, double-check count alignment, and verify correct mapping:
${preContextInfo}

Use this pre-context to:
1. Double-check that you have extracted all eligible questions. If there's an expected total count specified, ensure you have parsed and included every single matching item.
2. Resolve questions citation alignment. Align extracted questions matching the subject and chapter above with correct Taxonomy Map nodes (specifically mapping to the "${customSubject || "Physics"}" nodes).

---

# CONTEXT AND FILES
1. Source_Document: This is a visual PDF, practicing paper, or text document containing raw reference questions that you MUST extract exactly as they are without changing any wording, parameters, or questions. Do not generate variants.
2. Syllabus Taxonomy Map: This is your structural map of Class 11 and Class 12 chemistry, physics, biology, and mathematics. Use this list of topics to categorize, align, and construct precise 'Citation' fields for each extracted question.

## Taxonomy Map for Categorization:
${taxonomyRepresentation}

---

# EXTRACTION AND CLASSIFICATION DIRECTIVES (STRICT COUNT BOUNDARY)
1. Extract verbatim questions from the provided Source_Document. If an "Intended Total Questions Count in PDF" is specified as a number, you MUST extract EXACTLY that number of questions (and no more), starting from the very first page and listing them sequentially. If not specified, extract all available questions.
- Under NO circumstance generate any questions beyond the specified count. For example, if "Intended Total Questions Count in PDF" is specified as a number, you are STRICTLY FORBIDDEN from outputting any question numbered higher than that count. Once you write the last question, you MUST stop and terminate immediately.
2. Filter/separate the extracted questions into exactly two sections:
   - SECTION I: SINGLE CHOICE QUESTIONS
   - SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS

3. Never output empty, skeleton, blank, or placeholder question boxes. If there are fewer questions in the Source_Document than targeted, ONLY output the actual, fully completed extracted items. If you have extracted all valid questions from the images or reached the requested count limit, STOP generating. Do NOT write dry headings or numbers (like "Question 7:") without actual body text, options, answers, and solutions. Every question you print must be fully defined and complete.

4. All mathematical and chemical formulas, fractions, equations, values, variables, and symbols MUST be fully enclosed in standard inline $...$ or block $$...$$ syntax.
   - **MANDATORY**: Never leave any LaTeX command (such as \\frac, \\int, \\sqrt, \\tan, \\cot, \\sin, \\cos, \\pi, \\alpha, \\theta, \\lambda) or variable naked/un-enclosed. Always enclose them in $...$ (or $$...$$ for display equations) so that the frontend can compile it as a textbook equation.
   - **STRICTLY PROHIBITED**: Do not use square brackets [ ... ] or parenthesis ( ... ) to wrap formulas. Always use $...$ or $$...$$.
   - **STRICT HUMAN-READABLE TEXTBOOK MARKDOWN ONLY**: Do NOT use raw LaTeX document layout environments (such as \\\\begin{enumerate}, \\\\begin{itemize}, \\\\item, \\\\begin{center}, \\\\begin{tabular}, \\\\textit, \\\\textbf, or raw vertical linebreakers) inside the question statements, options, answers, or solution bodies unless explicitly required inside a complex formula. Instead, use clean, classic Markdown ('- ' for lists, '*italic*' for scientific names/emphasis, '**bold**' for title/emphasis). Keep LaTeX strictly scoped/limited to the math blocks.
   - Escape percentage signs: write \\%
   - Escape underscores: write \\_ outside of math scripts
   - Escape ampersands: write \\&
   - Escape hash: write \\#
   - Wrap chemical formulas in standard science math format, e.g., $\\text{H}_2\\text{SO}_4$.

5. For each question, locate the single best-matching topic/subtopic entry from the 'Taxonomy Map for Categorization' provided above.
   Construct the 'Citation' value EXACTLY in this format:
   \`Exam:${cleanPattern} -> [Subject from Taxonomy] -> [Chapter from Taxonomy] -> [Topic from Taxonomy]/[Subtopic from Taxonomy (if present)]\`
   Examples:
   - \`Exam:${cleanPattern} -> Physics -> Electrostatics -> Coulomb's Law/Vector form\`
   - \`Exam:${cleanPattern} -> Chemistry -> Chemical Bonding -> Hybridisation\`

---

# OUTPUT EXPECTED TEMPLATE FORMAT (STRICTLY ADHERE TO)
For each question, print it strictly in the standard raw format below:

### If the question is a Single-Choice Question (SCQ):
SCQ:
\noindent \textbf{Question [Number]:} [Verbatim question text, using elegant LaTeX for math elements]
\begin{itemize}
    \item[(a)] [Option A text]
    \item[(b)] [Option B text]
    \item[(c)] [Option C text]
    \item[(d)] [Option D text]
\end{itemize}
Answer: [Correct option letter inside parentheses, e.g., (b)]
Solution: [Provide a step-by-step, elegant educational explanation, written in the voice of a professional teacher. Do NOT provide any internal doubts/corrections or notes.]
Question Type: SCQ
Level: [Assess the complexity, cognitive depth, and steps needed to solve this verbatim question and categorize its difficulty level as exactly [Easy], [Medium], or [Hard].]
Citation: Exam:${cleanPattern} -> [Subject] -> [Chapter] -> [Topic]/[Subtopic]

### If the question is a Numerical type:
Numerical:
\noindent \textbf{Question [Number]:} [Verbatim question text, using LaTeX for variables/equations]
Answer: [Clean integer value, e.g., 5 or 12]
Solution: [Provide a step-by-step, elegant educational derivation, written in the voice of a professional teacher. Show all formulas and substitutions neatly. Do NOT print internal verification or scratchpad steps here.]
Question Type: Numerical
Level: [Assess the complexity, cognitive depth, and steps needed to solve this verbatim question and categorize its difficulty level as exactly [Easy], [Medium], or [Hard].]
Citation: Exam:${cleanPattern} -> [Subject] -> [Chapter] -> [Topic]/[Subtopic]

---

# OUTPUT FORMATTING (STRICT SECTION-WISE 2-COLUMN LATEX)
Organize the entire generated text within the dual columns:
\\\\begin{multicols}{2}

\\\\section*{\\\\centering \\\\small SECTION I: SINGLE CHOICE QUESTIONS}
\\\\hrule
\\\\vspace{10pt}

[Insert SCQ Questions here in standard template format, sequentially starting from Question 1]

\\\\vfill\\\\null
\\\\columnbreak  % Keep columns neat

\\\\section*{\\\\centering \\\\small SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS}
\\\\hrule
\\\\vspace{10pt}

[Insert Numerical Questions here in standard template format, continuing the sequential numbering]

\\\\end{multicols}
`;

        const contentParts: any[] = [];
        if (Array.isArray(files) && files.length > 0) {
          files.forEach((base64String: string, index: number) => {
            const base64Data = base64String.includes(",") ? base64String.split(",")[1] : base64String;
            contentParts.push({
              text: `[Source Material Page Image ${index + 1}]`
            });
            contentParts.push({
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
              }
            });
          });
        }

        contentParts.push({
          text: `Extract all questions verbatim from the Source Material Page Images. Print them strictly using the SECTION-WISE formats inside the LaTeX multicols block.`
        });

        let modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
        if (selectedModel && selectedModel !== "auto") {
          if (selectedModel === "gemini-3.5-flash") {
            modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
          } else if (selectedModel === "gemini-2.5-flash") {
            modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
          } else if (selectedModel === "gemini-2.5-pro") {
            modelsToTry = ["gemini-2.5-pro", "gemini-3.1-pro-preview"];
          } else if (selectedModel === "gemini-3.1-pro-preview") {
            modelsToTry = ["gemini-3.1-pro-preview"];
          } else {
            modelsToTry = [selectedModel];
          }
        }

        const apiKey = process.env.VITE_EXTERNAL_GEMINI_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Missing GEMINI_API_KEY or VITE_EXTERNAL_GEMINI_KEY environment variable on the server.");
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });

        let streamFinished = false;
        let lastError = null;

        for (const modelName of modelsToTry) {
          let chunksStreamedCount = 0;
          try {
            console.log(`Backend API: Attempting Custom Digitizing Stream with model "${modelName}"...`);
            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents: [
                { role: "user", parts: contentParts }
              ],
              config: {
                systemInstruction,
                temperature: 0.1,
                // Relax safety thresholds to prevent false positives blocking math/LaTeX formulas
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
                  { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
                  { category: "HARM_CATEGORY_CIVIC_INTEGRITY" as any, threshold: "BLOCK_NONE" as any }
                ]
              }
            });

            for await (const chunk of responseStream) {
              if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
                chunksStreamedCount++;
              }
            }
            streamFinished = true;
            break;
          } catch (err: any) {
            console.error(`Backend API: Custom Digitizing model "${modelName}" failed during execution. Chunks streamed: ${chunksStreamedCount}. Error:`, err);
            lastError = err;
            if (chunksStreamedCount > 0) {
              throw err;
            }
          }
        }

        if (!streamFinished) {
          throw new Error(lastError ? lastError.message : "Failed to execute any Gemini model in the fallback chain for digitization.");
        }

        res.write("data: [DONE]\n\n");
        return res.end();
      }

      const finalQuestionMix = questionMix || {
        SCQ: Math.ceil(((easyCount || 5) + (mediumCount || 5) + (hardCount || 5)) * 0.6),
        NUMERICAL: ((easyCount || 5) + (mediumCount || 5) + (hardCount || 5)) - Math.ceil(((easyCount || 5) + (mediumCount || 5) + (hardCount || 5)) * 0.6)
      };

      // Map and sanitize incoming selection basket
      let validatedBasket = (basket || []).map((item: any) => {
        const { resolvedNode } = validateAndResolveSelection(item.node, taxonomy);
        return { ...item, node: resolvedNode };
      });

      // If "custom" mode or empty basket, populate with a virtual item for balancer
      if (validatedBasket.length === 0) {
        validatedBasket = [{
          id: "custom-topic",
          node: {
            grade: cleanPattern === "JEE" ? "Class 11" : "Class 11",
            subject: cleanPattern === "JEE" ? "Physics" : "Physics",
            chapterName: "Custom",
            topicName: topic || "General",
            subTopic01: ""
          },
          count: (easyCount || 5) + (mediumCount || 5) + (hardCount || 5),
          lodDistribution: { 
            Easy: easyCount || 5, 
            Medium: mediumCount || 5, 
            Hard: hardCount || 5 
          }
        }];
      }

      // 1. Generate the strict question mapping
      const questionMatrix = generateQuestionMatrix(validatedBasket, finalQuestionMix);

      const scqQuestions = questionMatrix.filter(q => q.section === "SECTION_A_SCQ");
      const numericalQuestions = questionMatrix.filter(q => q.section === "SECTION_B_NUMERICAL");

      // 2. Format the matrix into specific directives for the model
      const scqInstructions = scqQuestions
        .map((q, idx) => `  - Question ${idx + 1}: Topic: ${q.node.topicName} | Sub-topic: ${q.node.subTopic01 || "None"} | Difficulty: [${q.lod}]`)
        .join('\n');

      const numericalInstructions = numericalQuestions
        .map((q, idx) => `  - Question ${scqQuestions.length + idx + 1}: Topic: ${q.node.topicName} | Sub-topic: ${q.node.subTopic01 || "None"} | Difficulty: [${q.lod}]`)
        .join('\n');

      const directivePrompt = `
Generate the paper strictly divided into two distinct sections.

CRITICAL BOUNDARY AND COERCIVE TERMINATION: 
- You must generate EXACTLY ${questionMatrix.length} questions in total: EXACTLY ${scqQuestions.length} SCQs in Section I, and EXACTLY ${numericalQuestions.length} Numerical questions in Section II. Absolutely NO extra questions are allowed.
- The highest question number across the entire paper MUST be exactly Question ${questionMatrix.length}.
- You are STRICTLY FORBIDDEN from generating any Question ${questionMatrix.length + 1} or any extra text or questions beyond Question ${questionMatrix.length}.
- Once you have fully written the Solution, Level, and Citation for Question ${questionMatrix.length}, you must end the LaTeX block immediately with \\end{multicols} if necessary and STOP generating immediately.

SECTION I: SINGLE CHOICE QUESTIONS (SCQs)
You must generate exactly ${scqQuestions.length} questions matching this structure:
${scqInstructions}

SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS
You must generate exactly ${numericalQuestions.length} questions matching this structure:
${numericalInstructions}
`;

      let basketSummary = "";
      if (validatedBasket && validatedBasket.length > 0 && validatedBasket[0].id !== "custom-topic") {
        basketSummary = validatedBasket.map((item: any, idx: number) => {
          return `${idx + 1}. Grade: ${item.node.grade} | Subject: ${item.node.subject} | Chapter: ${item.node.chapterName} | Topic: ${item.node.topicName} | Sub Topic: ${item.node.subTopic01 || "None"} (Easy: ${item.lodDistribution?.Easy || 0}, Medium: ${item.lodDistribution?.Medium || 0}, Hard: ${item.lodDistribution?.Hard || 0})`;
        }).join("\n");
      } else {
        basketSummary = `Topic: "${topic || "General"}" (Easy: ${easyCount || 5}, Medium: ${mediumCount || 5}, Hard: ${hardCount || 5})`;
      }

      const config = {
        examPattern: cleanPattern,
        topic: topic || "General",
        easyCount: easyCount || 5,
        mediumCount: mediumCount || 5,
        hardCount: hardCount || 5
      };

      let examPatternInstructions = "";
      if (cleanPattern === "JEE") {
        examPatternInstructions = `EXAM PATTERN: JEE (Joint Entrance Examination - Main & Advanced)
- Subjects: Physics, Chemistry, and Mathematics.
- Focus: Highly analytical, conceptual, and mathematically rigorous. Questions must evaluate logical inference rather than memorization. All generated questions must be directly indexed and aligned with the historical JEE Main/Advanced Past Year Questions (PYQs) patterns and logical depth.
- Easy Level: Moderate/Semi-conceptual questions of genuine JEE Main standard. It should have multiple concepts but should be easier than medium level questions comparatively. No trivial/board-level questions. Must remain of genuine entrance exam caliber but features three- to four-step math and lower algebraic overhead.
  * LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
  * Formatting in output: Level: [Easy (LOD Index: 7.3)] (or any precise value inside the 7.0-7.5 band).
- Medium Level: High reasoning, multi-concept linkages (e.g., linking Mechanics with Electrostatics). High conceptual reasoning. Requires 5-6 major analytical or algebraic steps to derive the correct option.
  * LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
  * Formatting in output: Level: [Medium (LOD Index: 8.0)] (or any precise value inside the 7.5-8.5 band).
- Hard Level: Intricate multi-concept linkages (combining 3 or more concepts/topics). Highly non-linear logic. Extreme analytical complexity, heavy algebraic manipulation, calculus-based derivations, or vector analysis. Numerical answers must evaluate to a positive non-zero integer in $[1, 999]$.
  * LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
  * Formatting in output: Level: [Hard (LOD Index: 9.3)] (or any precise value inside the 8.5-10.0 band).

JEE DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The database difficulty tags (such as [Level: Easy/Medium/Hard]) on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, cognitive depth, mathematical/analytical steps, and conceptual linkages.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must be strictly harder than your self-evaluated medium/easy baselines and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated moderate/medium baseline standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be semi-conceptual but feature simpler steps and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the JEE PYQs.`;
      } else if (cleanPattern === "NEET") {
        examPatternInstructions = `EXAM PATTERN: NEET (National Eligibility cum Entrance Test)
- Subjects: Physics, Chemistry, and Biology.
- Focus: NCERT-centric, high recall, conceptual clarity, and rapid direct application of key formulas. Absolutely NO advanced calculus (limit math to basic algebra, trigonometry, and simple ratios).
- Easy Level: Direct factual recall, NCERT textbook statement identification, definition of terms, or single-step formula substitution with standard units.
  * LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
  * Formatting in output: Level: [Easy (LOD Index: 7.3)] (or any precise value inside the 7.0-7.5 band).
- Medium Level: 2-step direct calculations, statement comparison (Statement I and Statement II), assertion-reasoning questions, ratio/percentage comparison problems, or direct physical/chemical principles.
  * LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
  * Formatting in output: Level: [Medium (LOD Index: 8.0)] (or any precise value inside the 7.5-8.5 band).
- Hard Level: Multi-statement assessment (e.g., Match the Columns, "How many of the following 5 structures are correct"), diagram-based interpretation, or multi-step qualitative/quantitative deductions within standard NCERT syllabus bounds.
  * LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
  * Formatting in output: Level: [Hard (LOD Index: 9.3)] (or any precise value inside the 8.5-10.0 band).

NEET DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The pre-assigned database difficulty tags (such as [Level: Easy/Medium/Hard]) on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, cognitive depth, and factual or calculation-based steps.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must be strictly harder than your self-evaluated medium/easy baselines and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated moderate/medium baseline standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be NCERT-centric with simpler recall or direct steps and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the NEET PYQs.`;
      } else {
        examPatternInstructions = `EXAM PATTERN: CBSE Boards (Senior Secondary Board Exam Standard)
- Subjects: Physics, Chemistry, and Mathematics/Biology.
- Focus: Highly aligned with standard CBSE Class 11/12 NCERT curriculum and Board exam patterns, emphasizing derivations, standard textbook problems, and qualitative conceptual clarity.
- Easy Level: Standard definitions, basic textbook recall, direct formula application from standard NCERT exercises (e.g., finding focal length given radius of curvature).
  * LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
  * Formatting in output: Level: [Easy (LOD Index: 7.3)] (or any precise value inside the 7.0-7.5 band).
- Medium Level: Standard board PYQ-style problems, derivation-based logic, 2-step direct calculations, or qualitative scientific reasoning (e.g., explaining electromagnetic induction or optical behavior).
  * LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
  * Formatting in output: Level: [Medium (LOD Index: 8.0)] (or any precise value inside the 7.5-8.5 band).
- Hard Level: High Order Thinking Skills (HOTS) questions, case-study style multi-step scenario problems, or challenging qualitative/quantitative board-level problems that test deep systematic conceptual application.
  * LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
  * Formatting in output: Level: [Hard (LOD Index: 9.3)] (or any precise value inside the 8.5-10.0 band).

CBSE DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The pre-assigned database difficulty tags on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, board scoring standards, and derivation steps.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must match challenging HOTS questions and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated standard board PYQ standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be straightforward recall/definitions and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the CBSE PYQs.`;
      }

      let systemInstruction = "";

      if (mode === "SOURCE_BASED") {
        systemInstruction = `
Your task is to generate high-quality, original problem sets strictly based on the provided sources.

${examPatternInstructions}

CORE BEHAVIOR:

1. Source Usage Strategy:
Use the provided sources for concepts, theory, question format, structure, and difficulty levels.

2. Strict Source Grounding:
Use ONLY the provided sources. Do NOT use external knowledge.

3. Originality Constraint:
Do NOT copy or paraphrase questions. Generate completely NEW questions. Follow the SAME format and style as in the Question-Answer PDFs.

4. Output Format (VERY IMPORTANT):
The output MUST strictly follow this sample format for output of questions. You MUST use proper line breaks (newlines) exactly as shown. Do NOT output the entire question on a single line:

Question 1: A wire of resistance $R$ is stretched to twice its original length. What is its new resistance?
Options:
(a) $2R$
(b) $4R$
(c) $R/2$
(d) $R/4$
Answer: (b)
Solution:
When a wire is stretched, its volume $V = A \\times l$ remains constant.
1. If length $l' = 2l$, then area $A' = A/2$.
2. Resistance $R = \\rho \\frac{l}{A}$.
3. New resistance $R' = \\rho \\frac{2l}{A/2} = 4 \\times \\rho \\frac{l}{A} = 4R$.
Level: [Medium (LOD Index: 8.0)]
Citation: (Physics Textbook - Page 42 | Current Electricity; Past Paper 2023 - Pattern)

5. Topic Relevance:
Questions must strictly match the given topic: "${config.topic}".
Concepts must align with the sources.

6. Strict Limitation:
If the topic is not sufficiently covered in the sources, SKIP it and explain why. Do NOT generate irrelevant questions.

7. STRICT DIFFICULTY AND QUANTITY STRUCTURE (CRITICAL BOUNDARY - ZERO TOLERANCE):
- You must generate EXACTLY the numbers and types of questions requested in the directive mapping.
- The total count of generated questions in your final response MUST be EXACTLY equal to the sum of requested questions (exactly equal to the length of the directive mapping, which is ${questionMatrix.length} questions in total: ${scqQuestions.length} SCQ in Section I, and ${numericalQuestions.length} Numerical in Section II).
- You are STRICTLY FORBIDDEN from generating any extra questions beyond this mapped count (do not exceed ${questionMatrix.length} questions in total under any circumstance, e.g. if the requested total is 30, you must NOT generate 31 or 37 or any other number).
- Once the last requested question (Question ${questionMatrix.length}) is fully written with its Answer, Solution, Level, and Citation, you must write \\end{multicols} if necessary and STOP and TERMINATE your response immediately. Do not append any trailing notes or extra questions.
- The difficulty levels in your generated questions must map to:
  - ${config.easyCount} Easy questions
  - ${config.mediumCount} Medium questions
  - ${config.hardCount} Hard questions

8. Difficulty Tagging:
Each question MUST include its difficulty level along with its precise LOD Index at the end before the citation, formatted exactly as: Level: [Easy (LOD Index: 7.x)], Level: [Medium (LOD Index: 8.x)], or Level: [Hard (LOD Index: 9.x)]. Do NOT put the difficulty at the start of the question.

9. Citations:
Each question MUST include a citation at the end: (Source Title - Page | Topic X; Source Title - Pattern). Do NOT fabricate citations.

10. No Repetition:
Avoid duplicate or similar questions. Ensure variety in logic and structure.

11. Quality Requirements:
Clear, exam-level questions. Grammatically correct. Suitable for Class 11 & 12 (${config.examPattern} level).

12. Restrictions:
Do NOT mention source content explicitly in the question text.

13. Answers and Concise Solutions (CRITICAL):
ALSO INCLUDE THE ANSWER AFTER EACH INDIVIDUAL QUESTION.
Keep solutions extremely brief, concise, and straight to the point. The end users of this application are teachers, who do NOT need long, verbose, or conversational explanations. Show only the essential core equations/formulas, parameter substitutions, and the direct mathematical derivation. Limit each solution strictly to 2-3 lines of text maximum.




14. Figures and Diagrams:
If a question requires a figure, diagram, graph, or table that is present in the source images, you MUST extract it by providing its bounding box.
Use the EXACT following syntax to include the figure:
<figure source="[Source Name]" page="[Page Number]" bbox="[ymin, xmin, ymax, xmax]" />
Where:
- [Source Name] is the name of the source file.
- [Page Number] is the page number provided before the image.
- [ymin, xmin, ymax, xmax] are the bounding box coordinates of the figure on the page, normalized to 0-1000.
Do NOT use markdown images for figures from the source, ONLY use the <figure> tag.
Do NOT include any figures, diagrams, graphs, or images in the generated questions. If a question from the source material relies heavily on an image to be solved or understood, SKIP that question entirely and generate a different one that is entirely text-based.

15. IMAGE-TO-QUESTION MATCHING RULES:
1. An image belongs to a question if ANY of these are true:
   a) The question text explicitly references it (e.g., "Figure 9.1", "Fig. 2", "the diagram", "the given figure", "shown in the figure", "see figure").
   b) For "Example" (Example questions with solutions) section: Solution & Figures are mostly present BELOW the question body (before the solution starts). Look directly under the question text.
   c) For "Problems" (intext questions): Figures are part of the question and are present BELOW the question only.
   d) For "Exercise" (end-of-chapter questions): Figures are present with questions, located BELOW the question body.
   e) The image appears BETWEEN the question start and the next question start (i.e., within the question boundary) — assign it to that question.
   f) The image appears immediately BEFORE a question and is clearly related to it.
   g) The image appears inside the Answer or Solution section that corresponds to the question. **CRITICAL FOCUS**: Ensure figures inside the solutions and answers are properly extracted and mapped to the respective question.
2. Match using the [IMAGE: figure_X] markers and [CAPTION: ...] or [LAYOUT_CAPTION: ...] in the OCR text. The position of these markers along with reading order and spatial coordinates ([BBOX: ...]) tells you which question boundary the image falls within.
3. If a question does NOT have any image within its boundary and does not reference any figure, do not include a figure tag.
4. Match figure captions to question text. For example, if [CAPTION: Figure 9.1 Forces on a submerged object] appears and a question says "refer to Figure 9.1", assign that figure.
5. Decorative images, logos, page headers, copyright symbols are NOT question images. Skip them.
6. When an image falls within a question boundary, ASSIGN it to that question even if the question text does not explicitly name it. Proximity is a strong signal, especially below the text.

16. FIGURE-BASED QUESTION GENERATION LOGIC (STRICT RULES):
<role>
You are an educational question generation system.
Generate new questions that match the source question pattern, difficulty, and subject logic.
</role>

<inputs>
You will receive:
1. Source question text.
2. Source page text.
3. Optional figure(s) from the source PDF page.
4. Figure metadata including page number and bounding box.
</inputs>

<task>
Generate one new question that is:
1. Pattern-aligned with the source question.
2. Different from the source question.
3. Solvable from the same local context.
4. If a figure is present, grounded strictly in that figure.
</task>

<figure_grounding_rules>
If a figure exists:
1. Use the exact same visible figure facts.
2. Never alter labels, values, units, symbols, geometry, or annotations.
3. Never add hidden assumptions.
4. Never ask for information that is not visible in the figure or local text.
5. Reuse the figure only if the new question remains logically valid.
6. The generated question must not duplicate the source question’s target.
</figure_grounding_rules>

<question_variation_rules>
1. Keep the same chapter/topic family.
2. Keep the same exam style and difficulty band.
3. Change the reasoning target, not the diagram.
4. Prefer a parallel ask, such as:
   - If source asks for value A, ask for value B.
   - If source asks for direct identification, ask for calculation or inference.
   - If source asks for one property, ask for a related property.
5. Do not make the new question broader, easier, or unrelated.
</question_variation_rules>

<solvability_rules>
A question is valid only if:
1. Every needed value is visible or explicitly provided.
2. No outside knowledge beyond the intended syllabus level is required.
3. The figure remains unchanged.
4. The answer can be derived from the cropped figure and nearby local context.
</solvability_rules>

<selection_rules>
If multiple figures exist:
1. Select the figure closest to the source question.
2. Prefer figures between the question stem boundaries.
3. Use caption cues such as Fig., Figure, Diagram, or labeled references.
4. If still ambiguous, reject rather than guess.
</selection_rules>

<output_rules>
For each figure-based question, use the following structure (the <question> tag MUST contain the full format: Question, Options, Answer, Solution, Level, Citation):

<result>
  <question>
  [Full Question Format here]
  </question>
  <figure source="..." page="..." bbox="[ymin, xmin, ymax, xmax]" />
</result>

If no valid figure question can be made, return: NO_VALID_FIGURE_QUESTION
</output_rules>

<rejection_conditions>
Return NO_VALID_FIGURE_QUESTION if:
1. The figure is missing or unclear.
2. The figure does not support a different valid question.
3. The question would require changing any figure fact.
4. The new question would repeat the source ask.
5. The answer would depend on hidden assumptions.
</rejection_conditions>

<strict_rule>
Under no circumstance may you modify the visual data to fit the question.
The question must adapt to the figure, not the figure to the question.
</strict_rule>
`;
      } else {
        systemInstruction = `# ROLE & BEHAVIOR
You are "ExamForge-Engine," an expert educational test architect specializing in the Indian JEE (Advanced) and NEET examination frameworks. You generate mathematically precise, original science and math evaluation items strictly aligned with the taxonomical structure of the provided master reference database.

---

# CONTEXT AND FILES
1. TopicTree.csv: This is your structural map of Class 11 and Class 12 chemistry, physics, and mathematics. It contains no questions. You must use its row hierarchy (Grade, Subject, Chapter Name, Topic name, Sub Topic 01) as your hard boundary. 
2. Source_Document (Only in SOURCE_BASED mode): This is a visual PDF, image collection, or text document containing raw reference questions.

CURRENT RUNTIME CONTEXT:
- GENERATION MODE: ${mode || "SOURCE_BASED"}
- EXAM PATTERN: ${cleanPattern}
- SYLLABUS GROUNDING TARGETS:
${basketSummary}

${examPatternInstructions}

- DIFFICULTY LEVEL DISTRIBUTION REQUESTED:
  - Easy: ${validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Easy || 0), 0) : (easyCount || 5)}
  - Medium: ${validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Medium || 0), 0) : (mediumCount || 5)}
  - Hard: ${validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Hard || 0), 0) : (hardCount || 5)}

- ADDITIONAL INSTRUCTIONS / CONSTRAINTS:
${additionalInstructions || "None"}

---

# CORE EXECUTION PIPELINE

## 1. Syllabus Validation & Boundary Rule
- Before drafting any question, map the requested concepts back to a row in TopicTree.csv (grounded in: ${basketSummary}).
- If a concept is not found, apply closest-semantic match fallback logic within the same chapter.
- Never generate questions outside the boundary defined by TopicTree.csv.

## 2. Source-Based Pattern Ratio Mapping (Only in SOURCE_BASED mode)
${mode === "SOURCE_BASED" ? `
- Analyze the uploaded Source_Document (provided as image/document parts). Index its questions on a 1-10 difficulty scale.
- Calculate the frequency of topics and difficulty level (LOD) distributions.
- **Strict Pattern Symmetry:** If the source document contains a 2:1 ratio of conceptual questions to calculation questions for the selected topic, your generated variant output must maintain this structural ratio.
- If an uploaded question relies heavily on a complex diagram to be understood, and you cannot safely extract it using coordinate cropping (via figure tags like <figure source="..." page="..." bbox="..." />), skip that question entirely and generate a parallel text-based problem.
` : `
- Mode is KNOWLEDGE_BASE. Act as an autonomous curriculum and content creator. Use your deep internal representation of the JEE/NEET syllabi. Generate highly original, conceptually rich questions without any source document constraints.
`}

## 3. Class-Balanced Merging
- When the user requests a mixed set of questions containing both Grade 11 and Grade 12 concepts, integrate them sequentially into one document.
- Group Grade 11 questions together first (ordered chronologically by chapter as they appear in the taxonomy), followed directly by Grade 12 questions.

## 4. Integer Numerical Constraint (CRITICAL)
- For every NUMERICAL type question generated:
  - The final answer MUST evaluate to a positive, non-zero integer in the range $[1, 999]$.
  - **Internal Solving Verification:** You are strictly required to perform a step-by-step mathematical verification internally before finalizing the output. Write down the equation, substitute your exact input parameters, and solve for the target.
  - If the calculation results in a decimal, fraction, or negative value, you must adjust the starting variables in the question and solve again until the output is a clean integer.
  - **Do NOT show this internal calculation, scratchpad, or verification process in your final output.** The final 'Solution:' field under each question must only contain the polished, correct, step-by-step educational explanation as written by a master teacher.

## 5. Completeness of All Allocated Slots (CRITICAL)
- You must generate a highly detailed, complete question with custom text, explanation, and answer for EVERY single slot requested in the directive mapping.
- NEVER leave any question blank, empty, or formatted as a placeholder (such as with "N/A" or "No detailed solution provided"). Every single requested question must be fully written, independent, and complete.

## 8. STRICT GENERATION COUNT LIMITS (CRITICAL BOUNDARY - ZERO TOLERANCE)
- The total count of generated questions in your final response MUST be EXACTLY equal to the sum of requested questions (exactly equal to the length of the directive mapping, which is ${questionMatrix.length} questions in total: ${scqQuestions.length} SCQ in Section I, and ${numericalQuestions.length} Numerical in Section II).
- You are STRICTLY FORBIDDEN from generating any extra questions beyond this mapped count (do not exceed ${questionMatrix.length} questions in total under any circumstance, e.g. if the requested total is 30, you must NOT generate 31 or 37 or any other number).
- Once the last requested question (Question ${questionMatrix.length}) is fully written with its Answer, Solution, Level, and Citation, you must write \\end{multicols} if necessary and STOP and TERMINATE your response immediately. Do not append any trailing notes or extra questions.

## 6. LaTeX Compiler Safety and Math Delimiters (CRITICAL)
- All mathematical formulas, symbols, fractions, equations, values, variables, and coordinates must be wrapped in standard inline $...$ or block $$...$$ syntax.
- **MANDATORY**: Never leave any LaTeX command (such as \\frac, \\int, \\sqrt, \\tan, \\cot, \\sin, \\cos, \\pi, \\alpha, \\theta, \\lambda) or variable naked/un-enclosed. Always wrap them in $...$ or $$...$$.
- **STRICTLY PROHIBITED**: Do not use square brackets [ ... ] or parenthesis ( ... ) to wrap formulas or equations. Only use standard $...$ and $$...$$.
- **STRICT HUMAN-READABLE TEXTBOOK MARKDOWN ONLY**: Do NOT use raw LaTeX document layout environments (such as \\\\begin{enumerate}, \\\\begin{itemize}, \\\\item, \\\\begin{center}, \\\\tabular, \\\\textit, \\\\textbf, or raw vertical spacers) inside the question statements, options, answers, or solution bodies unless explicitly required inside a complex mathematical formula. Instead, use clean, classic Markdown ('- ' for lists, '*italic*' for italic/scientific names, '**bold**' for emphasis/titles). Keep raw LaTeX strictly scoped/limited to the math blocks of formulas.
- You must sanitize your text to prevent LaTeX compiler crashes:
  - Escape all percentage signs: write \\% (do not write %).
  - Escape all underscores outside of math subscripts: write \\_ (do not write _).
  - Escape all ampersands: write \\& (do not write &).
  - Escape all hash symbols: write \\# (do not write #).
  - Wrap chemical formulas in standard math text formats, e.g., $\\text{H}_2\\text{SO}_4$.

## 7. Textbook/Solution-Book Standard Solutions (NO AI SCRIPTING, CHAT, OR THOUGHTS) (CRITICAL)
- The "Solution:" field for all generated questions must strictly conform to a highly professional, brief, and printed textbook solution book/manual format. Keep the solutions extremely brief and concise. Under no circumstances should solutions exceed 2-3 lines of text. The target audience is teachers who only need a swift reference to the core mathematical solving steps, so avoid any verbose textual elaboration.
- **STRICTLY PROHIBITED (Zero Tolerance):** Do NOT output any first-person or second-person pronoun talk ("I", "we", "let's", "you"). Do NOT output any intermediate diagnostics, self-doubts, or conversational remarks (e.g. "Ah, I made a mistake...", "It seems there is a typo...", "checking options again...", "Wait, let's recheck...").
- **Required Structure:** Start directly with the given variables or fundamental physics/math theory, show step-by-step mathematical derivation using clear formula blocks, substitute parameters neatly, and state the final answer. Act as a seasoned physical science textbook author. Keep it under 2-3 lines total.

---

# STANDARDIZED TEMPLATES

Use these templates exactly for formatting multiple choice questions (MCQ), assertion-reasoning (AR), or matching questions as requested.

## Option A: Assertion-Reasoning (AR) Formatting
\noindent \textbf{Assertion (A):} [Assertion Text] \\
\textbf{Reason (R):} [Reasoning Text]
\begin{itemize}
    \item[(a)] Both (A) and (R) are true and (R) is the correct explanation of (A).
    \item[(b)] Both (A) and (R) are true but (R) is not the correct explanation of (A).
    \item[(c)] (A) is true but (R) is false.
    \item[(d)] (A) is false but (R) is true.
\end{itemize}

## Option B: Match the Following Formatting
\noindent [Question Stem]
\begin{center}
\begin{tabular}{ll}
\textbf{Column I} & \textbf{Column II} \\
A. [Item 1] & P. [Description 1] \\
B. [Item 2] & Q. [Description 2] \\
C. [Item 3] & R. [Description 3] \\
D. [Item 4] & S. [Description 4] \\
\end{tabular}
\end{center}
Options:
(a) A-P, B-Q, C-R, D-S
(b) A-Q, B-P, C-S, D-R...

## Option C: Standard Multiple Choice (MCQ) Formatting
Question [Number]: [Insert question text here]
Options:
(a) [Option A]
(b) [Option B]
(c) [Option C]
(d) [Option D]

For every question, make sure to also include Answer, Solution, Level, and Citation fields in the raw format below:
Answer: [Correct Option, e.g. (b) or numerical value/integer in range [1, 999]]
Solution: [Provide a masterfully formatted, extremely concise textbook manual style step-by-step solution. Keep it strictly under 2-3 lines total. Start directly with the formula, substitute parameters, solve, and print the result. Do NOT provide any conversational words, personal pronouns, doubts, corrections, verbose explanations, or raw thoughts.]
Level: [Easy or Medium or Hard - strictly use the exact level requested for this question number in the directive list, e.g., Level: [Easy] or Level: [Hard]]
Citation: [Include a citation to taxonomy: Grade: X | Subject: Y | Chapter: Z]

---

# OUTPUT FORMATTING (STRICT SECTION-WISE 2-COLUMN LATEX)
You must divide the layout into two sections inside the \\begin{multicols}{2} wrapper:

\\begin{multicols}{2}

\\section*{\\centering \\small SECTION I: SINGLE CHOICE QUESTIONS}
\\hrule
\\vspace{10pt}

% Insert SCQ Questions here
\\noindent \\textbf{Question 1:} [Text] ...
\\begin{itemize}
    \\item[(a)] [Option A] \\item[(b)] [Option B] \\item[(c)] [Option C] \\item[(d)] [Option D]
\\end{itemize}

\\vfill\\null
\\columnbreak  % Keep columns neat

\\section*{\\centering \\small SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS}
\\hrule
\\vspace{10pt}

% Insert Numerical Questions here
\\noindent \\textbf{Question [X]:} [Text where answer is a clean integer] ...

\\end{multicols}
`;
      }

      // Calculate and append RAG section (always active on the backend by default)
      let ragSection = "";
      if (req.body.enableRag !== false) {
        try {
          const { retrievePastQuestions } = await import("./src/data/pastPapers");
          let pyqs: any[] = [];
          if (validatedBasket && validatedBasket.length > 0) {
            for (const item of validatedBasket) {
              const easyCount = item.lodDistribution?.Easy || 0;
              const mediumCount = item.lodDistribution?.Medium || 0;
              const hardCount = item.lodDistribution?.Hard || 0;

              if (easyCount > 0) {
                const fetchedEasy = retrievePastQuestions({
                  grade: item.node?.grade,
                  subject: item.node?.subject || "Physics",
                  chapterName: item.node?.chapterName || "",
                  topicName: item.node?.topicName || "",
                  subTopic01: item.node?.subTopic01 || "",
                  examPattern: cleanPattern,
                  difficulty: "Easy"
                }, easyCount);
                pyqs.push(...fetchedEasy);
              }

              if (mediumCount > 0) {
                const fetchedMedium = retrievePastQuestions({
                  grade: item.node?.grade,
                  subject: item.node?.subject || "Physics",
                  chapterName: item.node?.chapterName || "",
                  topicName: item.node?.topicName || "",
                  subTopic01: item.node?.subTopic01 || "",
                  examPattern: cleanPattern,
                  difficulty: "Medium"
                }, mediumCount);
                pyqs.push(...fetchedMedium);
              }

              if (hardCount > 0) {
                const fetchedHard = retrievePastQuestions({
                  grade: item.node?.grade,
                  subject: item.node?.subject || "Physics",
                  chapterName: item.node?.chapterName || "",
                  topicName: item.node?.topicName || "",
                  subTopic01: item.node?.subTopic01 || "",
                  examPattern: cleanPattern,
                  difficulty: "Hard"
                }, hardCount);
                pyqs.push(...fetchedHard);
              }

              if (easyCount === 0 && mediumCount === 0 && hardCount === 0) {
                const fetched = retrievePastQuestions({
                  grade: item.node?.grade,
                  subject: item.node?.subject || "Physics",
                  chapterName: item.node?.chapterName || "",
                  topicName: item.node?.topicName || "",
                  subTopic01: item.node?.subTopic01 || "",
                  examPattern: cleanPattern
                }, 2); // 2 questions per topic keeps it focused and compact
                pyqs.push(...fetched);
              }
            }
          }
          
          // Deduplicate
          const seen = new Set();
          const uniquePyqs = pyqs.filter(q => {
            if (seen.has(q.id)) return false;
            seen.add(q.id);
            return true;
          });

          if (uniquePyqs.length > 0) {
            ragSection = `
---

# SYSTEM-INJECTED ACTUAL PAST-YEAR EXAM PAPERS (RAG REFERENCE PATTERNS):
Below are actual historical exam questions (from the past 5 years) matching your current syllabus selection.

CRITICAL INSTRUCTION FOR DIFFICULTY EVALUATION (SELF-CALIBRATION):
The difficulty tags (e.g., "Level: Easy/Medium/Hard") provided in the database metadata for these REFERENCE PYQs may be inaccurate, inconsistent, or mislabeled.
Therefore:
1. Do NOT rely on or trust the pre-assigned difficulty level labels shown in the [Database Metadata Tag: ...] label.
2. You MUST evaluate the difficulty level of each REFERENCE PYQ yourself by assessing its analytical complexity, cognitive depth, logical multi-concept connections, and mathematical steps.
3. Use your self-evaluated difficulty standards of these actual entrance exam questions as your baseline reference.
4. Align and calibrate the difficulty of the newly generated questions strictly against these self-evaluated entrance-exam baselines:
   - Newly generated [Easy] questions must match genuine entrance-exam standard, being semi-conceptual but requiring fewer calculation/reasoning steps than Medium questions.
   - Newly generated [Medium] questions must strictly align with your self-evaluated medium/moderate PYQ baselines.
   - Newly generated [Hard] questions must match your self-evaluated high-complexity PYQ baselines, testing intricate concept linkages.

You MUST analyze these reference questions for:
1. True Difficulty & Style: Ignore the database tag, determine the actual difficulty yourself, and calibrate the new questions of corresponding LOD to match this self-evaluated depth.
2. Latex Formatting: Note the use of $...$ for inline equations and $$...$$ for block equations.
3. Concise Solutions: Note how direct, non-conversational, and brief the solutions are.

YOUR DIRECTIVE: Generate completely new, original questions of the SAME cognitive depth, format, and complexity as these examples. Do NOT copy these questions, but use them as a direct blueprint/style-guide to achieve 100% exam-level accuracy.

${uniquePyqs.map((q, idx) => `
REFERENCE PYQ #${idx + 1} [Exam: ${q.examPattern} | Year: ${q.year} | Database Metadata Tag: ${q.difficulty} (DO NOT TRUST - EVALUATE YOURSELF)]
Topic: ${q.topicName} | Subtopic: ${q.subTopic || "None"}
Question: ${q.questionText}
${q.options ? `Options:\n${q.options.join('\n')}` : ""}
Answer: ${q.correctAnswer}
Solution: ${q.solution}
`).join('\n\n')}

---
`;
          }
        } catch (e) {
          console.error("Error generating RAG references for system instructions:", e);
        }
      }

      systemInstruction += ragSection;

      // 2. Extract uploaded sources for multimodal inlineData parts once if SOURCE_BASED
      const baseSourceParts: any[] = [];
      if (mode === "SOURCE_BASED" && Array.isArray(files) && files.length > 0) {
        files.forEach((base64String: string, index: number) => {
          const base64Data = base64String.includes(",") ? base64String.split(",")[1] : base64String;
          baseSourceParts.push({
            text: `[Source Material Page Image ${index + 1}]`
          });
          baseSourceParts.push({
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          });
        });
      }

      // Adjust batch size dynamically based on total requested questions to prevent rate-limits and proxy/connection timeouts on large tasks.
      let maxBatchSize = 5;
      if (questionMatrix.length > 50) {
        maxBatchSize = 15; // Reduces sequential batches for large sets (e.g., 78) to ~6, preventing rate limits (10 RPM) and connection timeouts (120s).
      } else if (questionMatrix.length > 20) {
        maxBatchSize = 10; // Reduces sequential batches for moderate sets to ~3.
      }
      const batches: {
        batchIndex: number;
        slots: { globalNum: number; slot: any }[];
      }[] = [];

      let globalCounter = 1;
      for (let i = 0; i < questionMatrix.length; i += maxBatchSize) {
        const chunk = questionMatrix.slice(i, i + maxBatchSize);
        const slotsWithMeta = chunk.map(slot => ({
          globalNum: globalCounter++,
          slot
        }));
        batches.push({
          batchIndex: Math.floor(i / maxBatchSize),
          slots: slotsWithMeta
        });
      }

      console.log(`Backend API: Flowing ${questionMatrix.length} total questions in ${batches.length} sequential batches (size: ${maxBatchSize}).`);

      const apiKey = process.env.VITE_EXTERNAL_GEMINI_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY or VITE_EXTERNAL_GEMINI_KEY environment variable on the server.");
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Utility delay helper for API cooldown pacing
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Maintain an array of active stream controllers and chunk queues for each batch to preserve correct output order while running model requests in parallel
      const batchStates = batches.map((batch) => {
        return {
          batch,
          chunks: [] as { type: "text" | "done" | "error" | "meta"; val: any }[],
          isFinished: false,
          error: null as Error | null,
          resolver: null as (() => void) | null,
        };
      });

      // Start all generations concurrently in the background with a staggered 500ms start to prevent immediate API bursts
      batches.forEach((batch, idx) => {
        const state = batchStates[idx];

        (async () => {
          try {
            if (idx > 0) {
              await delay(idx * 500);
            }

            console.log(`Backend API [Parallel]: Initiating Batch #${batch.batchIndex + 1} of ${batches.length} (Questions Q${batch.slots[0].globalNum} to Q${batch.slots[batch.slots.length - 1].globalNum})...`);

            const batchScqs = batch.slots.filter(item => item.slot.section === "SECTION_A_SCQ");
            const batchNumericals = batch.slots.filter(item => item.slot.section === "SECTION_B_NUMERICAL");

            const scqInstructions = batchScqs
              .map(item => `  - Question ${item.globalNum}: Topic: ${item.slot.node.topicName} | Sub-topic: ${item.slot.node.subTopic01 || "None"} | Difficulty: [${item.slot.lod}]`)
              .join('\n');

            const numericalInstructions = batchNumericals
              .map(item => `  - Question ${item.globalNum}: Topic: ${item.slot.node.topicName} | Sub-topic: ${item.slot.node.subTopic01 || "None"} | Difficulty: [${item.slot.lod}]`)
              .join('\n');

            const directivePrompt = `
Generate the paper strictly matching this batch directive mapping.
This is Batch #${batch.batchIndex + 1} of the overall test paper generation process containing exactly ${batch.slots.length} questions.

CRITICAL BOUNDARY AND COERCIVE TERMINATION: 
- You must generate EXACTLY ${batch.slots.length} questions in total in this batch response. Absolutely NO extra questions are allowed.
- You must generate and number the questions exactly as specified below:
  - Starting with Question ${batch.slots[0].globalNum} up to Question ${batch.slots[batch.slots.length - 1].globalNum}.
- IMPORTANT: You MUST assign the EXACT difficulty level specified in the 'Difficulty' field of the mapping below to each corresponding question. For example, if 'Question X' is mapped to 'Difficulty: [Easy]', you MUST output 'Level: [Easy]' for that question. If it is mapped to 'Difficulty: [Hard]', you MUST output 'Level: [Hard]' for that question. Do NOT make all questions Medium.
`;

            let directiveSections = "";
            if (batchScqs.length > 0) {
              directiveSections += `
SECTION I: SINGLE CHOICE QUESTIONS (SCQs)
You must generate exactly ${batchScqs.length} SCQs matching this structure:
${scqInstructions}
`;
            }

            if (batchNumericals.length > 0) {
              directiveSections += `
SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS
You must generate exactly ${batchNumericals.length} Numerical questions matching this structure:
${numericalInstructions}
`;
            }

            const fullDirective = directivePrompt + directiveSections + `
- You are STRICTLY FORBIDDEN from generating any extra questions or any text beyond Question ${batch.slots[batch.slots.length - 1].globalNum}.
- Once you have fully written the Answer, Solution, Level, and Citation for Question ${batch.slots[batch.slots.length - 1].globalNum}, STOP and TERMINATE your response immediately for this batch. Do not append any trailing notes or extra questions.
`;

            const batchEasyCount = batch.slots.filter(item => item.slot.lod === "Easy").length;
            const batchMediumCount = batch.slots.filter(item => item.slot.lod === "Medium").length;
            const batchHardCount = batch.slots.filter(item => item.slot.lod === "Hard").length;

            // Customise System Instruction with specific batch boundaries dynamically
            let batchSystemInstruction = systemInstruction;
            
            // Replace absolute question count boundaries with the specific batch boundaries
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`${questionMatrix.length} questions in total: ${scqQuestions.length} SCQ in Section I, and ${numericalQuestions.length} Numerical in Section II`, 'g'),
              `${batch.slots.length} questions in total: ${batchScqs.length} SCQ, and ${batchNumericals.length} Numerical`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`exceed ${questionMatrix.length} questions`, 'g'),
              `exceed ${batch.slots.length} questions`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`Question ${questionMatrix.length}`, 'g'),
              `Question ${batch.slots[batch.slots.length - 1].globalNum}`
            );

            // Map and override difficulty distributions in systemInstruction if knowledge base or source mode mentions distributions
            const easyTotal = validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Easy || 0), 0) : (easyCount || 5);
            const mediumTotal = validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Medium || 0), 0) : (mediumCount || 5);
            const hardTotal = validatedBasket.length > 0 ? validatedBasket.reduce((p, c) => p + (c.lodDistribution?.Hard || 0), 0) : (hardCount || 5);

            // 1. For KNOWLEDGE_BASE mode:
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- Easy: ${easyTotal}`, 'g'),
              `- Easy: ${batchEasyCount}`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- Medium: ${mediumTotal}`, 'g'),
              `- Medium: ${batchMediumCount}`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- Hard: ${hardTotal}`, 'g'),
              `- Hard: ${batchHardCount}`
            );

            // 2. For SOURCE_BASED mode (with/without leading spaces):
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- ${config.easyCount} Easy questions`, 'g'),
              `- ${batchEasyCount} Easy questions`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- ${config.mediumCount} Medium questions`, 'g'),
              `- ${batchMediumCount} Medium questions`
            );
            batchSystemInstruction = batchSystemInstruction.replace(
              new RegExp(`- ${config.hardCount} Hard questions`, 'g'),
              `- ${batchHardCount} Hard questions`
            );

            // Construct multimodal content part for this specific batch
            const contentPartsForBatch: any[] = [...baseSourceParts];
            contentPartsForBatch.push({
              text: `Based on your instructions, proceed to generate Batch #${batch.batchIndex + 1} of the test paper containing exactly ${batch.slots.length} questions:
${basketSummary}

${fullDirective}

Respond in valid LaTeX formats with exact solutions.`
            });

            // Fallback and model selection routing
            let modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
            
            const hasHardQuestions = batchHardCount > 0;
            const isHighReasoning = hasHardQuestions || (cleanPattern === "JEE" && batchMediumCount > 0);

            if (isHighReasoning) {
              console.log(`[Model Routing] Batch #${batch.batchIndex + 1} contains Hard or high reasoning questions. Routing to Pro models first for superior analytical framing.`);
              modelsToTry = ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-3.5-flash", "gemini-2.5-flash"];
            } else if (selectedModel && selectedModel !== "auto") {
              if (selectedModel === "gemini-3.5-flash") {
                modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
              } else if (selectedModel === "gemini-2.5-flash") {
                modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
              } else if (selectedModel === "gemini-2.5-pro") {
                modelsToTry = ["gemini-2.5-pro", "gemini-3.1-pro-preview"];
              } else if (selectedModel === "gemini-3.1-pro-preview") {
                modelsToTry = ["gemini-3.1-pro-preview"];
              } else {
                modelsToTry = [selectedModel];
              }
            }

            let streamFinished = false;
            let lastError = null;

            for (const modelName of modelsToTry) {
              let chunksStreamedCount = 0;
              try {
                console.log(`Backend API [Parallel]: Starting batch #${batch.batchIndex + 1} with model "${modelName}"...`);
                const responseStream = await ai.models.generateContentStream({
                  model: modelName,
                  contents: [
                    { role: "user", parts: contentPartsForBatch }
                  ],
                  config: {
                    systemInstruction: batchSystemInstruction,
                    temperature: 0.15,
                    // Relax safety thresholds to prevent false positives blocking math/LaTeX formulas
                    safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
                      { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
                      { category: "HARM_CATEGORY_CIVIC_INTEGRITY" as any, threshold: "BLOCK_NONE" as any }
                    ]
                  }
                });

                let isMetaSent = false;
                for await (const chunk of responseStream) {
                  if (chunk.text) {
                    if (!isMetaSent) {
                      state.chunks.push({
                        type: "meta",
                        val: {
                          model: modelName,
                          batchIndex: batch.batchIndex,
                          slots: batch.slots.map(s => ({
                            globalNum: s.globalNum,
                            topicName: s.slot.node.topicName,
                            subTopic: s.slot.node.subTopic01 || "",
                            difficulty: s.slot.lod
                          }))
                        }
                      });
                      isMetaSent = true;
                    }
                    state.chunks.push({ type: "text", val: chunk.text });
                    // Trigger custom stream emitter polling/resolver
                    if (state.resolver) {
                      state.resolver();
                    }
                    chunksStreamedCount++;
                  }
                }
                streamFinished = true;
                break;
              } catch (err: any) {
                console.error(`Backend API [Parallel]: Batch #${batch.batchIndex + 1} with model "${modelName}" failed during execution. Chunks streamed: ${chunksStreamedCount}. Error:`, err);
                lastError = err;
                if (chunksStreamedCount > 0) {
                  throw err;
                }
                // Cooldown backoff delay before transitioning/retrying to allow rate-limits or quota allocations to reset
                console.log(`Backend API [Parallel]: Cooldown delay of 1000ms before falling back to next available model...`);
                await delay(1000);
              }
            }

            if (!streamFinished) {
              throw new Error(lastError ? lastError.message : `Failed to execute any Gemini model in the fallback chain for Batch #${batch.batchIndex + 1}.`);
            }

            state.chunks.push({ type: "done", val: "" });
            if (state.resolver) state.resolver();

          } catch (err: any) {
            state.error = err;
            state.chunks.push({ type: "error", val: err.message || "Unknown error inside batch" });
            if (state.resolver) state.resolver();
          } finally {
            state.isFinished = true;
          }
        })();
      });

      // Pull from the concurrency stream buffers sequentially to output questions to the client in correct order
      for (let i = 0; i < batches.length; i++) {
        const state = batchStates[i];
        console.log(`Emitter Thread: Consuming Batch #${i + 1} of ${batches.length}...`);

        let finished = false;
        while (!finished) {
          if (state.chunks.length > 0) {
            const chunk = state.chunks.shift()!;
            if (chunk.type === "text") {
              res.write(`data: ${JSON.stringify({ text: chunk.val })}\n\n`);
            } else if (chunk.type === "meta") {
              res.write(`data: ${JSON.stringify({ meta: chunk.val })}\n\n`);
            } else if (chunk.type === "done") {
              finished = true;
            } else if (chunk.type === "error") {
              throw new Error(chunk.val);
            }
          } else {
            if (state.isFinished && state.chunks.length === 0) {
              if (state.error) {
                throw state.error;
              }
              finished = true;
            } else {
              // Wait for background worker to produce chunks
              await new Promise<void>((resolve) => {
                state.resolver = resolve;
              });
              state.resolver = null;
            }
          }
        }

        // Add visual spacing between batches in the stream
        res.write(`data: ${JSON.stringify({ text: "\n\n" })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error: any) {
      console.error("Backend streaming generation failed:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Unknown error during streaming" })}\n\n`);
      res.end();
    }
  });

  // Serve static assets in production, or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
});
