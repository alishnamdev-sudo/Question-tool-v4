import { GoogleGenAI } from "@google/genai";
import { convertPdfToImages } from "../lib/pdfUtils";

export interface GenerationConfig {
  examPattern: string;
  topic: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  additionalInstructions: string;
  selectedModel: string;
  withFigures: boolean;
  resolvedNode?: {
    grade: string;
    subject: string;
    chapterName: string;
    topicName: string;
    subTopic01: string;
  };
  resolvedNodes?: Array<{
    grade: string;
    subject: string;
    chapterName: string;
    topicName: string;
    subTopic01?: string;
  }>;
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64
  file?: File;
}

export async function generateQuestions(
  files: UploadedFile[],
  config: GenerationConfig,
  onChunk: (text: string) => void,
  onProgress: (tokens: number, pages: number) => void,
  onClear?: () => void
) {
  const figureInstructions = config.withFigures ? `

` : `
`;

  const examPatternInstructions = config.examPattern === "JEE" 
    ? `EXAM PATTERN: JEE (Joint Entrance Examination - Main & Advanced)
- Subjects: Physics, Chemistry, and Mathematics.
- Focus: Highly conceptual, analytical, and numerical-heavy questions.
- Style: Multi-concept problems, assertion-reasoning, and integer-type questions are common.
- Difficulty Levels (LOD Alignment):
  * Easy Level: Moderate/Semi-conceptual questions of genuine JEE Main standard. It should have multiple concepts but should be easier than medium level questions comparatively. No trivial/board-level questions. Must remain of genuine entrance exam caliber but features three- to four-step math and lower algebraic overhead.
    - LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
    - Output format: Level: [Easy (LOD Index: 7.3)] (or another precise value in this range).
  * Medium Level: High reasoning, multi-concept linkages (e.g., linking Mechanics with Electrostatics). High conceptual reasoning. Requires 5-6 major analytical or algebraic steps to derive the correct option.
    - LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
    - Output format: Level: [Medium (LOD Index: 8.0)] (or another precise value in this range).
  * Hard Level: Intricate multi-concept linkages (combining 3 or more concepts/topics). Highly non-linear logic. Extreme analytical complexity, heavy algebraic manipulation, calculus-based derivations, or vector analysis.
    - LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
    - Output format: Level: [Hard (LOD Index: 9.3)] (or another precise value in this range).
    
JEE DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The pre-assigned database difficulty tags (such as [Level: Easy/Medium/Hard]) on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, cognitive depth, mathematical/analytical steps, and conceptual linkages.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must be strictly harder than your self-evaluated medium/easy baselines and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated moderate/medium baseline standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be semi-conceptual but feature simpler steps and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the JEE PYQs.`
    : config.examPattern === "NEET"
    ? `EXAM PATTERN: NEET (National Eligibility cum Entrance Test)
- Subjects: Physics, Chemistry, and Biology (Botany & Zoology).
- Focus: Fact-based, direct application of formulas, and theoretical questions. Highly aligned with NCERT curriculum.
- Style: Single-choice objective questions, match the following, assertion-reasoning, and diagram-based questions are common.
- Difficulty Levels (LOD Alignment):
  * Easy Level: Direct factual recall, NCERT textbook statement identification, definition of terms, or single-step formula substitution with standard units.
    - LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
    - Output format: Level: [Easy (LOD Index: 7.3)] (or another precise value in this range).
  * Medium Level: 2-step direct calculations, statement comparison (Statement I and Statement II), ratio/percentage comparison problems, or direct physical/chemical principles.
    - LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
    - Output format: Level: [Medium (LOD Index: 8.0)] (or another precise value in this range).
  * Hard Level: Multi-statement assessment (e.g., Match the Columns, "How many of the following structures are correct"), diagram-based interpretation, or multi-step qualitative/quantitative deductions within standard NCERT syllabus bounds.
    - LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
    - Output format: Level: [Hard (LOD Index: 9.3)] (or another precise value in this range).

NEET DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The pre-assigned database difficulty tags (such as [Level: Easy/Medium/Hard]) on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, cognitive depth, and factual or calculation-based steps.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must be strictly harder than your self-evaluated medium/easy baselines and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated moderate/medium baseline standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be NCERT-centric with simpler recall or direct steps and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the NEET PYQs.`
    : `EXAM PATTERN: CBSE Boards (Senior Secondary Board Exam Standard)
- Subjects: Physics, Chemistry, and Mathematics/Biology.
- Focus: Highly aligned with standard CBSE Class 11/12 NCERT curriculum and Board exam patterns, emphasizing derivations, standard textbook problems, and qualitative conceptual clarity.
- Style: Standard theoretical derivations, qualitative reasoning, definitions, and board-level calculations.
- Difficulty Levels (LOD Alignment):
  * Easy Level: Standard definitions, basic textbook recall, direct formula application from standard NCERT exercises (e.g., finding focal length given radius of curvature).
    - LOD INDEX: MUST be indexed between 7.0 and 7.5 (inclusive, i.e., 7.0 <= index <= 7.5).
    - Output format: Level: [Easy (LOD Index: 7.3)] (or another precise value in this range).
  * Medium Level: Standard board PYQ-style problems, derivation-based logic, 2-step direct calculations, or qualitative scientific reasoning (e.g., explaining electromagnetic induction or optical behavior).
    - LOD INDEX: MUST be indexed between 7.5 and 8.5 (inclusive, i.e., 7.5 <= index <= 8.5).
    - Output format: Level: [Medium (LOD Index: 8.0)] (or another precise value in this range).
  * Hard Level: High Order Thinking Skills (HOTS) questions, case-study style multi-step scenario problems, or challenging qualitative/quantitative board-level problems that test deep systematic conceptual application.
    - LOD INDEX: MUST be indexed between 8.5 and 10.0 (inclusive, i.e., 8.5 <= index <= 10.0).
    - Output format: Level: [Hard (LOD Index: 9.3)] (or another precise value in this range).

CBSE DIFFICULTY AND LOD ALIGNMENT STRATEGY (CRITICAL):
Analyze the provided system-injected REFERENCE PYQs. The pre-assigned database difficulty tags on these REFERENCE PYQs may be inaccurate or mislabeled. You MUST ignore those database tags and evaluate the difficulty level of each REFERENCE PYQ yourself. Evaluate its actual complexity, board scoring standards, and derivation steps.
Once you have evaluated the baseline difficulty of the REFERENCE PYQs yourself:
- Use your self-evaluated standard as the calibration baseline.
- Any new Hard question you generate must match challenging HOTS questions and have an LOD index assigned in the 8.5 - 10.0 range.
- Any new Medium question must match your self-evaluated standard board PYQ standards and have an LOD index assigned in the 7.5 - 8.5 range.
- Any new Easy question must be straightforward recall/definitions and have an LOD index assigned in the 7.0 - 7.5 range.
Ensure the logic, steps, and patterns are strictly aligned with your self-evaluated standards of the CBSE PYQs.`;

  let syllabusDescription = "";
  if (config.resolvedNodes && config.resolvedNodes.length > 0) {
    const first = config.resolvedNodes[0];
    const topicsStr = config.resolvedNodes.map(n => {
      let segment = `- Topic: "${n.topicName}"`;
      if (n.subTopic01) {
        segment += ` (Subtopic: "${n.subTopic01}")`;
      }
      return segment;
    }).join("\n");
    syllabusDescription = `Grade: ${first.grade} | Subject: ${first.subject} | Chapter: ${first.chapterName}\nSelected Syllabus Topics:\n${topicsStr}`;
  } else if (config.resolvedNode) {
    syllabusDescription = `Grade: ${config.resolvedNode.grade} | Subject: ${config.resolvedNode.subject} | Chapter: ${config.resolvedNode.chapterName} | Topic: ${config.resolvedNode.topicName}${config.resolvedNode.subTopic01 ? ` | Subtopic: ${config.resolvedNode.subTopic01}` : ""}`;
  } else {
    syllabusDescription = `Topic: ${config.topic}`;
  }

  const systemInstruction = `
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
- Generate EXACTLY:
  - ${config.easyCount} Easy questions
  - ${config.mediumCount} Medium questions
  - ${config.hardCount} Hard questions
- The total count of generated questions in your final response MUST be EXACTLY equal to the sum of requested questions (exactly equal to ${config.easyCount + config.mediumCount + config.hardCount} questions in total).
- You are STRICTLY FORBIDDEN from generating any extra questions beyond this count. Once you complete writing the last question, you must STOP and TERMINATE your response immediately. Do not append any trailing notes, checklists, or extra questions.

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
Keep solutions extremely brief, concise, and straight to the point. The end users of this application are teachers, who do NOT need long, verbose, or conversational explanations.
Strict rules for solutions:
- If the question is a Single Choice Question (SCQ/MCQ) type, keep its solution much shorter than subjective/numerical types.
- For Mathematics: Skip any textual explanations in the solution; keep it purely in mathematical steps and extremely concise.
- For Chemistry and Physics: If the solution is numerical, keep it in the least number of steps possible.
- For any theory-based question for any subject (such as Biology): Keep the solution in 10-15 words max, using the absolute minimum words.

14. Textbook/Solution-Book Standard Solutions (NO AI SCRIPTING, CHAT, OR THOUGHTS):
The "Solution:" field must strictly conform to a highly brief, printed educational reference book template. You are strictly forbidden from writing in the first or second person (do NOT use "I", "we", "let's", "you"). You must never output internal diagnostics, self-doubts, corrections, or raw notes (such as: "Wait, let's recheck...", "Ah, I made a mistake...", "It seems there is a typo...", "checking options again...", "mismatch with the options..."). All checking and calculations must be performed internally or silently. The printed "Solution:" must always start directly with the core mathematical/scientific equations or given variables, show step-by-step substitutions, and conclude with the final derivation. There must be zero conversational meta-commentary, and solutions must look like an authoritative printed reference book.
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

${figureInstructions}
`;

  const parts: any[] = [];
  const sourceImages: Record<string, { pageNumber: number; dataUrl: string }[]> = {};
  let totalPages = 0;
  
  for (const f of files) {
    if (f.type === "application/pdf" && f.file) {
      if (config.withFigures) {
        const pageImages = await convertPdfToImages(f.file);
        sourceImages[f.name] = pageImages;
        totalPages += pageImages.length;
        for (const page of pageImages) {
          parts.push({ text: `[Source: ${f.name}, Page: ${page.pageNumber}]` });
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: page.dataUrl.split(",")[1],
            },
          });
        }
      } else {
        // Send PDF directly
        totalPages += 1; // Fallback to 1 page if not converting to images
        sourceImages[f.name] = [];
        parts.push({ text: `[Source: ${f.name}]` });
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: f.data.split(",")[1],
          },
        });
      }
    } else {
      totalPages += 1;
      sourceImages[f.name] = [{ pageNumber: 0, dataUrl: f.data }];
      parts.push({ text: `[Source: ${f.name}, Page: 0]` });
      parts.push({
        inlineData: {
          mimeType: f.type,
          data: f.data.split(",")[1],
        },
      });
    }
  }

  onProgress(0, totalPages);

  parts.push({
    text: `Generate the question set for the syllabus topic: "${syllabusDescription}".`,
  });

  let modelsToTry: string[] = [];
  const hasHardQuestions = config.hardCount > 0;
  const isHighReasoning = hasHardQuestions || (config.examPattern === "JEE" && config.mediumCount > 0);

  if (isHighReasoning) {
    console.log(`[Model Routing] Request contains Hard or high reasoning questions. Routing to Pro models first.`);
    modelsToTry = ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-3.5-flash", "gemini-2.5-flash"];
  } else if (config.selectedModel === "auto") {
    modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
  } else if (config.selectedModel === "gemini-3.5-flash") {
    modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
  } else if (config.selectedModel === "gemini-2.5-flash") {
    modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview"];
  } else if (config.selectedModel === "gemini-2.5-pro") {
    modelsToTry = ["gemini-2.5-pro", "gemini-3.1-pro-preview"];
  } else if (config.selectedModel === "gemini-3.1-pro-preview") {
    modelsToTry = ["gemini-3.1-pro-preview"];
  } else {
    modelsToTry = [config.selectedModel];
  }

  let fullText = "";
  let success = false;
  let lastError: any = null;

  const primaryKey = (import.meta as any).env?.VITE_EXTERNAL_GEMINI_KEY;
  const secondaryKey = process.env.GEMINI_API_KEY;

  const keysToTry: { key: string; name: string }[] = [];
  if (primaryKey) keysToTry.push({ key: primaryKey, name: "Primary Key" });
  if (secondaryKey) keysToTry.push({ key: secondaryKey, name: "Secondary Key" });

  if (keysToTry.length === 0) {
    throw new Error("No Gemini API keys found. Please configure your API keys.");
  }

  for (const modelName of modelsToTry) {
    for (const keyObj of keysToTry) {
      try {
        console.log(`Attempting generation with model: ${modelName} and key: ${keyObj.name}`);
        if (onClear) onClear(); // Clear UI before starting/retrying
        
        const currentAi = new GoogleGenAI({ apiKey: keyObj.key });
        const responseStream = await currentAi.models.generateContentStream({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            temperature: 0.7,
            // Relax safety thresholds to prevent false positives blocking math/LaTeX formulas
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
              { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
              { category: "HARM_CATEGORY_CIVIC_INTEGRITY" as any, threshold: "BLOCK_NONE" as any }
            ]
          },
        });

        fullText = "";
        let tokens = 0;
        for await (const chunk of responseStream) {
          if (chunk.text) {
            fullText += chunk.text;
            tokens += chunk.text.length / 4; // Rough estimation
            onChunk(chunk.text);
            onProgress(Math.round(tokens), totalPages);
          }
        }
        success = true;
        break; // Success, exit the keys loop
      } catch (err: any) {
        console.error(`Error with model ${modelName} and key ${keyObj.name}:`, err);
        lastError = err;
        
        const errorMessage = err.message || "";
        const isRateLimitOrAuth = err.status === 429 || 
                            err.status === 401 ||
                            err.status === 403 ||
                            errorMessage.includes("429") || 
                            errorMessage.includes("401") ||
                            errorMessage.includes("403") ||
                            errorMessage.includes("quota") || 
                            errorMessage.includes("API key not valid") ||
                            errorMessage.includes("RESOURCE_EXHAUSTED");
                            
        if (!isRateLimitOrAuth) {
          // If it's not a rate limit or auth error, don't fallback to another key for the SAME model
          // Break the keys loop to try the next model, or throw if it's a fatal error
          break;
        }
        
        console.log(`Failed with ${keyObj.name} for ${modelName}, trying next key or model...`);
        // Continue to the next key in the loop
      }
    }
    if (success) break; // Success, exit the models loop
  }

  if (!success) {
    throw lastError || new Error("All models failed to generate content.");
  }

  try {
    // Process <figure> tags
    const figureRegex = /<figure\s+source="([^"]+)"\s+page="(\d+)"\s+bbox="\[?([\d,\s]+)\]?"\s*\/>/g;
    let match;
    let processedText = fullText;
    
    // We need to do this asynchronously because cropImage is async
    const replacements: { original: string; replacement: string }[] = [];
    
    while ((match = figureRegex.exec(fullText)) !== null) {
      const original = match[0];
      const source = match[1];
      const pageStr = match[2];
      const bboxStr = match[3];
      const pageNumber = parseInt(pageStr, 10);
      const bbox = bboxStr.split(",").map((s) => parseInt(s.trim(), 10)) as [number, number, number, number];
      
      const sourceImageSet = sourceImages[source];
      if (sourceImageSet) {
        const pageImage = sourceImageSet.find((p) => p.pageNumber === pageNumber);
        if (pageImage) {
          try {
            const { cropImage } = await import("../lib/pdfUtils");
            const croppedDataUrl = await cropImage(pageImage.dataUrl, bbox);
            replacements.push({
              original,
              replacement: `\n\n![Figure](${croppedDataUrl})\n\n`,
            });
          } catch (e) {
            console.error("Failed to crop image", e);
          }
        }
      }
    }

    for (const { original, replacement } of replacements) {
      processedText = processedText.replace(original, replacement);
    }

    // Strip XML-like tags used for figure-based question logic
    processedText = processedText
      .replace(/<result>/g, "")
      .replace(/<\/result>/g, "")
      .replace(/<question>/g, "")
      .replace(/<\/question>/g, "")
      .replace(/NO_VALID_FIGURE_QUESTION/g, "");

    return processedText.trim();
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}
