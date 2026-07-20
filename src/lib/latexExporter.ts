import { parseQuestions, QuestionItem } from "./questionParser";

/**
 * Sanitizes a string to prevent LaTeX compiler crashes on special characters.
 * Leaves text inside math blocks ($...$ or $$...$$) untouched to protect math equations.
 */
export function sanitizeForLatex(text: string | undefined): string {
  if (!text) return "";

  // Split the text using math blocks as delimiters ($ and $$)
  // Odd sub-strings in the split array will be inside math blocks
  const parts = text.split(/(\$\$?[\s\S]*?\$\$?)/);

  for (let i = 0; i < parts.length; i++) {
    // If it's outside a math block (even indexes)
    if (i % 2 === 0) {
      let segment = parts[i];
      // Escape percentage signs: % -> \% (if not already escaped)
      segment = segment.replace(/(?<!\\)%/g, "\\%");
      // Escape underscores: _ -> \_ (if not already escaped)
      segment = segment.replace(/(?<!\\)_/g, "\\_");
      // Escape ampersands: & -> \& (if not already escaped)
      segment = segment.replace(/(?<!\\)&/g, "\\&");
      // Escape hash: # -> \# (if not already escaped)
      segment = segment.replace(/(?<!\\)#/g, "\\#");
      parts[i] = segment;
    }
  }

  return parts.join("");
}

/**
 * Formats a question item's options into LaTeX list format or as choices.
 */
function formatOptionsForLatex(item: QuestionItem): string {
  if (!item.optionA && !item.optionB && !item.optionC && !item.optionD) {
    return "";
  }

  let optionsStr = "\\begin{itemize}\n";
  if (item.optionA) optionsStr += `    \\item[(a)] ${sanitizeForLatex(item.optionA)}\n`;
  if (item.optionB) optionsStr += `    \\item[(b)] ${sanitizeForLatex(item.optionB)}\n`;
  if (item.optionC) optionsStr += `    \\item[(c)] ${sanitizeForLatex(item.optionC)}\n`;
  if (item.optionD) optionsStr += `    \\item[(d)] ${sanitizeForLatex(item.optionD)}\n`;
  optionsStr += "\\end{itemize}";
  
  return optionsStr;
}

/**
 * Generates an export file string formatted according to the QUESTIONS_ONLY LaTeX template.
 */
export function generateQuestionsOnlyLatex(generatedContentOrQuestions: string | QuestionItem[], subjectName: string = "Physics / Chemistry", maxCount?: number): string {
  const questions = Array.isArray(generatedContentOrQuestions)
    ? generatedContentOrQuestions
    : parseQuestions(generatedContentOrQuestions, maxCount);
  
  let scqTexList: string[] = [];
  let numericalTexList: string[] = [];
  
  if (questions.length === 0) {
    // Fallback if parsing fails - sanitize the original content directly
    const rawContent = typeof generatedContentOrQuestions === "string" ? generatedContentOrQuestions : "";
    return `% 1. Preamble (Packages go here)
\\documentclass{article}
\\usepackage{multicol}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}

\\geometry{margin=0.5in}

% 2. Document Body
\\begin{document}
${sanitizeForLatex(rawContent)}
\\end{document}`;
  }

  const scqParsed = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
  const numericalsParsed = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
  
  let currentCount = 1;

  scqParsed.forEach((item) => {
    const num = currentCount++;
    let qBlock = `\\noindent \\textbf{Question ${num}:} ${sanitizeForLatex(item.questionText)} \\\\\n`;
    const optionsFormatted = formatOptionsForLatex(item);
    if (optionsFormatted) {
      qBlock += `${optionsFormatted}\n`;
    } else {
      qBlock += "\\\\[0.5em]\n";
    }
    scqTexList.push(qBlock);
  });

  numericalsParsed.forEach((item) => {
    const num = currentCount++;
    let qBlock = `\\noindent \\textbf{Question ${num}:} ${sanitizeForLatex(item.questionText)} \\\\\n`;
    qBlock += `\\\\[0.5em]\n`;
    numericalTexList.push(qBlock);
  });

  let bodyContent = "";
  if (scqTexList.length > 0) {
    bodyContent += `\\section*{\\centering \\small SECTION I: SINGLE CHOICE QUESTIONS}\n\\hrule\n\\vspace{10pt}\n\n` + scqTexList.join("\n") + "\n\n";
  }
  if (scqTexList.length > 0 && numericalTexList.length > 0) {
    bodyContent += `\\vfill\\null\n\\columnbreak\n\n`;
  }
  if (numericalTexList.length > 0) {
    bodyContent += `\\section*{\\centering \\small SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS}\n\\hrule\n\\vspace{10pt}\n\n` + numericalTexList.join("\n") + "\n\n";
  }

  return `% 1. Preamble (Packages go here)
\\documentclass{article}
\\usepackage{multicol}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}

\\geometry{margin=0.5in}

% 2. Document Body
\\begin{document}

\\begin{multicols}{2}
${bodyContent}
\\end{multicols}

\\end{document}`;
}

/**
 * Generates an export file string formatted according to the QUESTIONS_WITH_SOLUTIONS LaTeX template.
 */
export function generateQuestionsWithSolutionsLatex(generatedContentOrQuestions: string | QuestionItem[], maxCount?: number): string {
  const questions = Array.isArray(generatedContentOrQuestions)
    ? generatedContentOrQuestions
    : parseQuestions(generatedContentOrQuestions, maxCount);
  
  let scqTexList: string[] = [];
  let numericalTexList: string[] = [];
  
  if (questions.length === 0) {
    // Fallback if parsing fails - sanitize the original content directly
    const rawContent = typeof generatedContentOrQuestions === "string" ? generatedContentOrQuestions : "";
    return `% 1. Preamble (Packages go here)
\\documentclass{article}
\\usepackage{multicol}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}

\\geometry{margin=0.5in}

% 2. Document Body
\\begin{document}
${sanitizeForLatex(rawContent)}
\\end{document}`;
  }

  const scqParsed = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
  const numericalsParsed = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
  
  let currentCount = 1;

  scqParsed.forEach((item) => {
    const num = currentCount++;
    let qBlock = `\\noindent \\textbf{Question ${num}:} ${sanitizeForLatex(item.questionText)} \\\\\n`;
    const optionsFormatted = formatOptionsForLatex(item);
    if (optionsFormatted) {
      qBlock += `${optionsFormatted}\n`;
    }
    qBlock += `\\textbf{Answer:} (${item.answer || 'N/A'}) \\\\\n`;
    qBlock += `\\textbf{Solution:} ${sanitizeForLatex(item.solution || 'No detailed solution provided.')} \\\\\n`;
    qBlock += `\\textbf{Level:} [${item.level || 'Medium'}] \\\\\n`;
    qBlock += `\\textbf{Taxonomy Reference:} ${sanitizeForLatex(item.citation || 'ExamForge Taxonomy')} \\\\\n`;
    scqTexList.push(qBlock);
  });

  numericalsParsed.forEach((item) => {
    const num = currentCount++;
    let qBlock = `\\noindent \\textbf{Question ${num}:} ${sanitizeForLatex(item.questionText)} \\\\\n`;
    qBlock += `\\textbf{Answer:} ${item.answer || 'N/A'} \\\\\n`;
    qBlock += `\\textbf{Solution:} ${sanitizeForLatex(item.solution || 'No detailed solution provided.')} \\\\\n`;
    qBlock += `\\textbf{Level:} [${item.level || 'Medium'}] \\\\\n`;
    qBlock += `\\textbf{Taxonomy Reference:} ${sanitizeForLatex(item.citation || 'ExamForge Taxonomy')} \\\\\n`;
    numericalTexList.push(qBlock);
  });

  let bodyContent = "";
  if (scqTexList.length > 0) {
    bodyContent += `\\section*{\\centering \\small SECTION I: SINGLE CHOICE QUESTIONS}\n\\hrule\n\\vspace{10pt}\n\n` + scqTexList.join("\n") + "\n\n";
  }
  if (scqTexList.length > 0 && numericalTexList.length > 0) {
    bodyContent += `\\vfill\\null\n\\columnbreak\n\n`;
  }
  if (numericalTexList.length > 0) {
    bodyContent += `\\section*{\\centering \\small SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS}\n\\hrule\n\\vspace{10pt}\n\n` + numericalTexList.join("\n") + "\n\n";
  }

  return `% 1. Preamble (Packages go here)
\\documentclass{article}
\\usepackage{multicol}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{geometry}

\\geometry{margin=0.5in}

% 2. Document Body
\\begin{document}

\\begin{multicols}{2}
${bodyContent}
\\end{multicols}

\\end{document}`;
}
