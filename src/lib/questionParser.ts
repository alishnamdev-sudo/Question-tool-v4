export interface QuestionItem {
  id: string;
  number: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  solution: string;
  level: string;
  citation: string;
}

export function cleanLaTeXToHumanMarkdown(text: string | undefined): string {
  if (!text) return "";

  let normalized = text;
  // 1. Convert standard LaTeX display and inline math delimiters to standard $$...$$ and $...$
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math.trim()}$$`);
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // 1b. Split by $ or $$ blocks to separate raw text from already correct math blocks
  const segments = normalized.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      // OUTSIDE math blocks:
      let seg = segments[i];

      // 2. Normalize brackets with raw LaTeX math commands inside (e.g., [ I = \int... ]) into $$...$$ display equations
      // Use negative lookbehinds to prevent matching \left[ or \right] sequences.
      seg = seg.replace(/(?<!\\left\s*)(?<!\\)\[([^\]\n]*?(?:\\frac|\\int|\\sqrt|\\sum|\\lim|\\tan|\\cot|\\sin|\\cos|\\theta|\\pi|\\vec|\\alpha|\\beta|\\gamma|\\infty|\\partial)\b[^\]]*?)(?<!\\right\s*)\]/g, (_, p1) => `$$${p1.trim()}$$`);

      // Wrap raw, unwrapped LaTeX functions in inline $...$ delimiters for perfect KaTeX rendering
      seg = seg.replace(/(?<![\$\w\\])(?:\\(?:frac|sqrt|int|sum|lim|log|ln|sin|cos|tan|cot|cosec|sec|arcsin|arccos|arctan|pi|theta|alpha|beta|gamma|delta|epsilon|lambda|sigma|phi|psi|omega|mu|nu|rho|tau|chi|xi|zeta|eta|iota|kappa|infty|partial|nabla|times|div|pm|cap|cup|subset|subseteq|in|notin|vec|hat|bar|dot|ddot|mathrm|mathbf|mathit|mathsf|mathtt|text)\b)(?:\{[^}]*\}|\[[^\]]*\]|_\{[^{}]*\}|\^\{[^{}]*\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9]|[^\s$(){}[\]]*)*(?:\s*[\+\-\*\/=><,]\s*(?:\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*|[a-zA-Z0-9]+))*/g, (match) => {
        const layoutCommands = [
          "noindent", "columnbreak", "vfill", "null", "centering", "pagebreak", "newpage", 
          "small", "large", "Large", "begin", "end", "item", "section", "subsection", "label", "ref", "cite",
          "textbf", "textit", "texttt", "underline"
        ];
        const cmdName = match.replace(/^\\/, "").split(/[^a-zA-Z]/)[0];
        if (layoutCommands.includes(cmdName)) {
          return match;
        }
        return `$${match.trim()}$`;
      });
      segments[i] = seg;
    }
  }
  normalized = segments.join("");

  // 1c. Temporarily extract all inline $...$ and block $$...$$ math parts to protect them from regex layout cleanup replacement
  const mathBlocks: string[] = [];
  let placeholderText = normalized.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
    mathBlocks.push(match);
    return `___MATH_BLOCK_PLACEHOLDER_${mathBlocks.length - 1}___`;
  });

  // 2. Perform cleanups on the non-math portions of the text
  let cleaned = placeholderText;

  // Remove standard LaTeX layout and line-breaking/page-breaking directives
  cleaned = cleaned.replace(/\\noindent\s*/gi, "");
  cleaned = cleaned.replace(/\\columnbreak\s*/gi, "\n");
  cleaned = cleaned.replace(/\\vfill\s*/gi, "");
  cleaned = cleaned.replace(/\\null\s*/gi, "");
  cleaned = cleaned.replace(/\\hrule\s*/gi, "\n\n---\n\n");
  cleaned = cleaned.replace(/\\vspace\*?\{[^}]*\}\s*/gi, "\n");
  cleaned = cleaned.replace(/\\hspace\*?\{[^}]*\}\s*/gi, " ");
  cleaned = cleaned.replace(/\\pagebreak\s*/gi, "");
  cleaned = cleaned.replace(/\\newpage\s*/gi, "");
  cleaned = cleaned.replace(/\\centering\s*/gi, "");
  cleaned = cleaned.replace(/\\small\s*/gi, "");
  cleaned = cleaned.replace(/\\large\s*/gi, "");
  cleaned = cleaned.replace(/\\Large\s*/gi, "");

  // Remove center layout environment wrapper
  cleaned = cleaned.replace(/\\begin\{center\}\s*/gi, "");
  cleaned = cleaned.replace(/\\end\{center\}\s*/gi, "");

  // Clean raw LaTeX tables (tabular) to simplified newline blocks
  cleaned = cleaned.replace(/\\begin\{tabular\}(?:\{[^}]*\})?/gi, "\n");
  cleaned = cleaned.replace(/\\end\{tabular\}/gi, "\n");

  // Format enumerate & itemize lists into beautiful clean Bullet Points
  // Specific item lists like \item[(a)] or \item[1.]
  cleaned = cleaned.replace(/\\item\s*\[\s*\(?([a-zA-Z0-9\-\.]+)\)?\s*\]\s*/gi, "\n- **$1** ");
  // Standard list bullet points
  cleaned = cleaned.replace(/\\item\s*/gi, "\n- ");

  // Strip raw list containers which break standard markdown parsing
  cleaned = cleaned.replace(/\\begin\{enumerate\}(?:\[[^\]]*\])?\s*/gi, "\n");
  cleaned = cleaned.replace(/\\end\{enumerate\}\s*/gi, "\n\n");
  cleaned = cleaned.replace(/\\begin\{itemize\}\s*/gi, "\n");
  cleaned = cleaned.replace(/\\end\{itemize\}\s*/gi, "\n\n");

  // Inline formatting style conversions (LaTeX to Markdown matching blocks)
  // Bold
  cleaned = cleaned.replace(/\\textbf\s*\{([^}]*)\}/gi, "**$1**");
  // Italic
  cleaned = cleaned.replace(/\\textit\s*\{([^}]*)\}/gi, "*$1*");
  // Monospace/Code
  cleaned = cleaned.replace(/\\texttt\s*\{([^}]*)\}/gi, "`$1`");
  // Underline
  cleaned = cleaned.replace(/\\underline\s*\{([^}]*)\}/gi, "<u>$1</u>");

  // Convert double-slash '\\' carriage returns to simple newlines
  cleaned = cleaned.replace(/\\\\\s*/g, "\n");
  cleaned = cleaned.replace(/\\linebreak\s*/gi, "\n");

  // Remove any leftover/residual styling or layout formatting commands that are broken or orphaned outside math blocks
  cleaned = cleaned.replace(/\\(?:textbf|textit|texttt|underline|mathrm|text|mathbf|mathit|mathsf|mathtt|bold|emph|noindent|columnbreak|vfill|null|centering|pagebreak|newpage|small|large|Large|normalsize|tiny|huge|Huge|item|begin|end|section|subsection|subsubsection|label|ref|cite)\b\s*\{?\s*\}?/gi, "");
  cleaned = cleaned.replace(/\{\}/g, "");

  // 3. Restore the protected math blocks
  let restoredText = cleaned.replace(/___MATH_BLOCK_PLACEHOLDER_(\d+)___/g, (match, index) => {
    return mathBlocks[parseInt(index, 10)];
  });

  // 4. Do final stray character/split-fragment cleanups
  restoredText = restoredText.trim();
  while (restoredText.startsWith("}") || restoredText.startsWith("]") || restoredText.startsWith(")")) {
    restoredText = restoredText.slice(1).trim();
  }
  while (restoredText.endsWith("{") || restoredText.endsWith("[") || restoredText.endsWith("(")) {
    restoredText = restoredText.slice(0, -1).trim();
  }

  // Remove any trailing backslash commands or trailing backslashes
  restoredText = restoredText.replace(/\\(?:textbf|textit|texttt|underline|mathrm|text|mathbf|mathit|mathsf|mathtt|bold|emph|noindent|columnbreak|vfill|null|centering|pagebreak|newpage|small|large|Large|normalsize|tiny|huge|Huge|item|begin|end|section|subsection|subsubsection|label|ref|cite)\b\s*\{?\s*\}?$/gi, "");
  restoredText = restoredText.replace(/\\+$/gi, "");

  // Deduplicate and collapse contiguous vertical newlines from layout strips
  restoredText = restoredText.replace(/\t+/g, " ");
  restoredText = restoredText.replace(/\n{3,}/g, "\n\n");

  return restoredText.trim();
}


interface OptionIndices {
  idxA: number; lenA: number;
  idxB: number; lenB: number;
  idxC: number; lenC: number;
  idxD: number; lenD: number;
}

export function findSortedOptionIndices(text: string): OptionIndices | null {
  const itemRegexA = /\\item\s*\[\s*\(?[aA]\)?\s*\]|\\item\s*\[\s*[aA]\.\s*\]/g;
  const itemRegexB = /\\item\s*\[\s*\(?[bB]\)?\s*\]|\\item\s*\[\s*[bB]\.\s*\]/g;
  const itemRegexC = /\\item\s*\[\s*\(?[cC]\)?\s*\]|\\item\s*\[\s*[cC]\.\s*\]/g;
  const itemRegexD = /\\item\s*\[\s*\(?[dD]\)?\s*\]|\\item\s*\[\s*[dD]\.\s*\]/g;

  const matchA = itemRegexA.exec(text);
  const matchB = itemRegexB.exec(text);
  const matchC = itemRegexC.exec(text);
  const matchD = itemRegexD.exec(text);

  if (matchA && matchB && matchC && matchD && 
      matchA.index < matchB.index && 
      matchB.index < matchC.index && 
      matchC.index < matchD.index) {
    return {
      idxA: matchA.index, lenA: matchA[0].length,
      idxB: matchB.index, lenB: matchB[0].length,
      idxC: matchC.index, lenC: matchC[0].length,
      idxD: matchD.index, lenD: matchD[0].length
    };
  }

  const getCandidates = (pattern: RegExp) => {
    const list: { index: number; length: number }[] = [];
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      list.push({ index: m.index, length: m[0].length });
    }
    return list;
  };

  const candA = getCandidates(/(?:\(\s*[aA]\s*\)|(?<![a-zA-Z0-9\\])[aA]\.(?!\d)|(?<![a-zA-Z0-9\\])[aA]\))/g);
  const candB = getCandidates(/(?:\(\s*[bB]\s*\)|(?<![a-zA-Z0-9\\])[bB]\.(?!\d)|(?<![a-zA-Z0-9\\])[bB]\))/g);
  const candC = getCandidates(/(?:\(\s*[cC]\s*\)|(?<![a-zA-Z0-9\\])[cC]\.(?!\d)|(?<![a-zA-Z0-9\\])[cC]\))/g);
  const candD = getCandidates(/(?:\(\s*[dD]\s*\)|(?<![a-zA-Z0-9\\])[dD]\.(?!\d)|(?<![a-zA-Z0-9\\])[dD]\))/g);

  let bestSeq: OptionIndices | null = null;

  for (const d of candD) {
    for (const c of candC) {
      if (c.index >= d.index) continue;
      for (const b of candB) {
        if (b.index >= c.index) continue;
        for (const a of candA) {
          if (a.index >= b.index) continue;
          
          const seq = {
            idxA: a.index, lenA: a.length,
            idxB: b.index, lenB: b.length,
            idxC: c.index, lenC: c.length,
            idxD: d.index, lenD: d.length
          };
          if (!bestSeq || seq.idxA > bestSeq.idxA) {
            bestSeq = seq;
          }
        }
      }
    }
  }

  return bestSeq;
}

export function parseQuestions(text: string, maxCount?: number): QuestionItem[] {
  if (!text) return [];


  // Split content by "Question [number]" indicator, SCQ/Numerical headers, or \noindent blocks
  // Using [^}]* inside the \\textbf{} part to match any characters inside the braces of the key question statement
  const blocks = text.split(/(?=Question\s+\d+[:.]?|SCQ:\s*\\noindent|Numerical:\s*\\noindent|SCQ:\s*Question|Numerical:\s*Question|\\noindent\s*\\textbf\{\s*Question\s+\d+[^}]*\})/gi);
  const questions: QuestionItem[] = [];

  let qCount = 1;

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    const lowerBlock = trimmedBlock.toLowerCase();
    
    // Extract Question Number from the block
    const numMatch = trimmedBlock.match(/(?:Question|SCQ|Numerical|\{Question)\s+(\d+)/i);
    const questionNumber = numMatch ? parseInt(numMatch[1], 10) : qCount;

    // Ignore blocks that are purely document preamble, multicols wrappers, page boundaries, or section headers
    if (trimmedBlock.includes("\\documentclass") || 
        trimmedBlock.includes("\\begin{document}") || 
        (trimmedBlock.includes("\\begin{multicols}") && !numMatch && !trimmedBlock.includes("Answer:")) || 
        (trimmedBlock.includes("\\section*") && !numMatch && !trimmedBlock.includes("Answer:")) ||
        (trimmedBlock.includes("\\columnbreak") && !numMatch && !trimmedBlock.includes("Answer:")) ||
        (lowerBlock.includes("section i:") && !numMatch && !trimmedBlock.includes("Answer:")) ||
        (lowerBlock.includes("section ii:") && !numMatch && !trimmedBlock.includes("Answer:"))) {
      continue;
    }

    // Check if block contains any valid question indicators
    const hasQuestionIndicator = 
      lowerBlock.includes("question") || 
      lowerBlock.includes("\\noindent") || 
      lowerBlock.startsWith("scq:") || 
      lowerBlock.startsWith("numerical:");

    if (!hasQuestionIndicator) {
      continue; // Skip any introductory/wrapper template structures
    }

    // Clean up block prefix (e.g., "SCQ:", "Numerical:", "Question 1: ", "\noindent \textbf{Question 1:}")
    let blockContent = trimmedBlock
      .replace(/^(?:SCQ:\s*|Numerical:\s*)?\\noindent\s*\\textbf\{\s*Question\s*\d+[^}]*\}\s*/i, "")
      .replace(/^(?:SCQ:\s*|Numerical:\s*)?Question\s*\d+\s*[:.]?\s*/i, "")
      .replace(/^(?:SCQ:\s*|Numerical:\s*)/i, "");

    // Structure parser
    let questionText = "";
    let optionA = "";
    let optionB = "";
    let optionC = "";
    let optionD = "";
    let answer = "";
    let solution = "";
    let level = "Medium";
    let citation = "";

    const sortedIdxs = findSortedOptionIndices(blockContent);

    if (sortedIdxs) {
      const { idxA, lenA, idxB, lenB, idxC, lenC, idxD, lenD } = sortedIdxs;
      
      questionText = blockContent.substring(0, idxA).trim();
      
      const rawOptA = blockContent.substring(idxA + lenA, idxB).trim();
      const rawOptB = blockContent.substring(idxB + lenB, idxC).trim();
      const rawOptC = blockContent.substring(idxC + lenC, idxD).trim();
      
      const optDPart = blockContent.substring(idxD + lenD);
      const boundaryMatch = optDPart.match(/(Answer:|Solution:|Explanation:|Level:|Citation:|Question Type:|\\end\{itemize\})/i);
      let rawOptD = "";
      if (boundaryMatch && boundaryMatch.index !== undefined) {
        rawOptD = optDPart.substring(0, boundaryMatch.index).trim();
      } else {
        rawOptD = optDPart.trim();
      }

      const cleanOption = (opt: string) => {
        let clean = opt.replace(/\\item\[.*?\]/g, "").replace(/\\end\{itemize\}/g, "").trim();
        clean = clean.replace(/^[:.\-\s]+/, "").trim();
        return clean;
      };

      optionA = cleanOption(rawOptA);
      optionB = cleanOption(rawOptB);
      optionC = cleanOption(rawOptC);
      optionD = cleanOption(rawOptD);
    } else {
      // 1. Parse Options fallback
      const optAMatch = blockContent.match(/^\s*\\item\[\(?a\)?\]\s+(.+)$/im) || blockContent.match(/^\s*\(?a\)?\s+(.+)$/im);
      const optBMatch = blockContent.match(/^\s*\\item\[\(?b\)?\]\s+(.+)$/im) || blockContent.match(/^\s*\(?b\)?\s+(.+)$/im);
      const optCMatch = blockContent.match(/^\s*\\item\[\(?c\)?\]\s+(.+)$/im) || blockContent.match(/^\s*\(?c\)?\s+(.+)$/im);
      const optDMatch = blockContent.match(/^\s*\\item\[\(?d\)?\]\s+(.+)$/im) || blockContent.match(/^\s*\(?d\)?\s+(.+)$/im);

      if (optAMatch) optionA = optAMatch[1].replace(/\\item\[.*?\]/g, "").replace(/\\end\{itemize\}/g, "").trim();
      if (optBMatch) optionB = optBMatch[1].replace(/\\item\[.*?\]/g, "").replace(/\\end\{itemize\}/g, "").trim();
      if (optCMatch) optionC = optCMatch[1].replace(/\\item\[.*?\]/g, "").replace(/\\end\{itemize\}/g, "").trim();
      if (optDMatch) optionD = optDMatch[1].replace(/\\item\[.*?\]/g, "").replace(/\\end\{itemize\}/g, "").trim();

      // 2. Parse Question Text fallback
      const firstOptionIndex = blockContent.search(/^\s*(?:\\item\[\(?[a-d]\)?\]|\(?[a-d]\)?)\s+/im);
      const beginitemizeIndex = blockContent.indexOf("\\begin{itemize}");
      const optionsHeaderIndex = blockContent.indexOf("Options:");
      
      let cutIndex = -1;
      if (beginitemizeIndex !== -1 && (firstOptionIndex === -1 || beginitemizeIndex < firstOptionIndex)) {
        cutIndex = beginitemizeIndex;
      } else if (optionsHeaderIndex !== -1 && (firstOptionIndex === -1 || optionsHeaderIndex < firstOptionIndex)) {
        cutIndex = optionsHeaderIndex;
      } else {
        cutIndex = firstOptionIndex;
      }

      if (cutIndex !== -1) {
        questionText = blockContent.substring(0, cutIndex).trim();
      } else {
        const answerIndex = blockContent.search(/Answer:/i);
        if (answerIndex !== -1) {
          questionText = blockContent.substring(0, answerIndex).trim();
        } else {
          questionText = blockContent.trim();
        }
      }
    }

    // Clean up trailing "Options:" or "Option:" from questionText
    if (questionText.endsWith("Options:")) {
      questionText = questionText.slice(0, -8).trim();
    } else if (questionText.endsWith("Option:")) {
      questionText = questionText.slice(0, -7).trim();
    }

    // Clean up any unmatched curly braces or brackets left over from splitting at the start of question text
    while (questionText.startsWith("}") || questionText.startsWith("]") || questionText.startsWith(" ")) {
      questionText = questionText.slice(1).trim();
    }

    // Strip "Internal Solving Verification" completely from question text and solutions
    const stripInternalVerification = (val: string): string => {
      if (!val) return "";
      const pattern = /(?:\\textbf\{|\*\*|\*)?(?:Internal\s+)?Solving\s+Verification:?[*}\s]*/i;
      
      const match = val.match(pattern);
      if (match && match.index !== undefined) {
        // If it starts late in the solution (e.g., after 100 characters), strip everything after it:
        if (match.index > 100) {
          return val.substring(0, match.index).trim();
        } else {
          // If it starts near the beginning, just strip the heading itself so the valuable steps are preserved!
          return (val.substring(0, match.index) + val.substring(match.index + match[0].length)).trim();
        }
      }
      return val;
    };

    const cleanConversationalAiThoughts = (val: string): string => {
      if (!val) return "";
      
      const truncatePatterns = [
        /ah,?\s+i\s+(?:made|have|corrected|mistake|am|copying|notice|feel|think|realize)/i,
        /it\s+seems\s+(?:there|we|to|like|might)\s+(?:might\s+be|is|seems\s+to\s+be)\s+an?\s+(?:issue|typo|mistake|error|problem|conflict)/i,
        /there\s+(?:is|might\s+be|seems\s+to\s+be)\s+a\s+(?:typo|mistake|error|issue|problem|conflict)\b/i,
        /mismatch\s+(?:with|between)\s+(?:the\s+)?options/i,
        /none\s+of\s+the\s+options/i,
        /does\s+not\s+match\s+any\s+of\s+the\s+options/i,
        /wait,?\s+there's\s+a\s+mismatch/i,
        /wait,?\s+there\s+is\s+a\s+mismatch/i,
        /wait,?\s+let's/i,
        /wait!/i,
        /let's\s+assume\s+the\s+question\s+is\s+correct/i,
        /let's\s+assume\s+there's\s+a\s+typo/i,
        /checking\s+(?:the\s+)?options/i
      ];

      // Split into sentences using a regex that handles abbreviations, math decimals like 2.5, etc.
      const sentences = val.split(/(?<!\d)(?<=\.|\?|\!)(?=\s+[A-Z\\{]|\n|$)/);
      
      const truncatedSentences: string[] = [];
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (truncatePatterns.some(regex => regex.test(trimmed))) {
          break; // Stop including anything from this sentence onward!
        }
        truncatedSentences.push(sentence);
      }

      const blacklistedPatterns = [
        /\bwait\b/i,
        /\bcheck\s+(?:the\s+)?options\b/i,
        /\bmismatch\b/i,
        /\bnone\s+of\s+the\s+options\b/i,
        /\bre-read\b/i,
        /\btypo\b/i,
        /\bmy\s+calculation\b/i,
        /\bmy\s+dr/i,
        /(?:my\s+)?(?:calculations?|answers?)\s+is\s+incorrect/i,
        /\bimpl(?:ies|y)\s+my\b/i,
        /\bdoes\s+not\s+match\s+(?:any\s+)?options?\b/i,
        /\bthis\s+is\s+not\s+an\s+option\b/i,
        /\bself-verification\b/i,
        /\bsolving\s+verification\b/i
      ];

      const cleanedSentences = truncatedSentences.filter(sentence => {
        const trimmed = sentence.trim();
        if (blacklistedPatterns.some(regex => regex.test(trimmed))) {
          return false;
        }
        return true;
      });

      return cleanedSentences.join("").trim();
    };

    questionText = stripInternalVerification(questionText);

    // Validate that we have a real question text and not just LaTeX artifacts or a placeholder block
    const cleanContentOnly = questionText
      .replace(/\\[a-zA-Z]+/g, "") // Remove LaTeX commands like \noindent or \textbf
      .replace(/[{}$[\]()\\:;./,=\-+\s]/g, "") // Remove brackets, math operators, separators, and spaces
      .trim();

    if (!cleanContentOnly || cleanContentOnly.length < 3) {
      continue; // Skip this block as it does not contain a real question text structure
    }

    // 3. Parse Answer (supports choices or numerical integer values)
    let rawAnswer = "";
    // Extremely robust pattern matching "Answer" with optional spaces, braces, colons, or "is" at start of any line
    const answerLineMatch = blockContent.match(/(?:^|\n)(?:\s*\\noindent\s*)?(?:\\textbf\{)?\s*Answer\s*\}?\s*[:\-is\s]\s*(.+)$/im);
    if (answerLineMatch) {
      rawAnswer = answerLineMatch[1].trim();
    } else {
      // Fallback: search any presence of "Answer" followed by a colon or separator
      const fallbackMatch = blockContent.match(/(?:Answer|\{Answer\})\s*\}?\s*[:\-is\s]\s*(.+)$/im);
      if (fallbackMatch) {
        rawAnswer = fallbackMatch[1].trim();
      }
    }

    if (rawAnswer) {
      // Split by newline and take the first line to isolate the answer line
      let cleanAns = rawAnswer.split('\n')[0].trim();
      // Remove any LaTeX trailing newline command \\
      cleanAns = cleanAns.replace(/\\\\$/, "").trim();
      // Remove inline math dollar signs like $b$ or $5$
      cleanAns = cleanAns.replace(/\$/g, "").trim();

      // Remove LaTeX formatting like \textbf{...} or \text{...} or \mathrm{...} or \mathit{...} but keep contents
      cleanAns = cleanAns.replace(/\\textbf\s*\{([^}]*)\}/gi, "$1");
      cleanAns = cleanAns.replace(/\\text\s*\{([^}]*)\}/gi, "$1");
      cleanAns = cleanAns.replace(/\\mathrm\s*\{([^}]*)\}/gi, "$1");
      cleanAns = cleanAns.replace(/\\mathnormal\s*\{([^}]*)\}/gi, "$1");

      // Strip remaining braces
      cleanAns = cleanAns.replace(/[\{\}]/g, "").trim();

      // Strip markdown bold/italic tags
      cleanAns = cleanAns.replace(/\*\*+/g, "").trim();
      cleanAns = cleanAns.replace(/\*+/g, "").trim();

      // Check if it's a multiple choice option in format (a), (b), (c), (d), or simply a, b, c, d
      const scqLetterMatch = cleanAns.match(/^\s*\(?([a-d])\)?(?:\s+|$|[^a-zA-Z0-9])/i);
      if (scqLetterMatch) {
        answer = scqLetterMatch[1].trim().toUpperCase();
      } else {
        // For numerical / integer-type answers, just take the clean text
        answer = cleanAns.trim().toUpperCase();
      }
    }

    // 4. Parse Solution / Explanation
    const solutionMatch = blockContent.match(/(?:Solution|Explanation):\s*([\s\S]*?)(?=Level:|$|Citation:|Question Type:)/i);
    if (solutionMatch) {
      solution = cleanConversationalAiThoughts(stripInternalVerification(solutionMatch[1].trim()));
    }

    // 5. Parse Level - match specifically "Easy", "Medium", or "Hard" (case-insensitive) to avoid false matches on occurrences of the word "level" in question/solution texts. Support capturing detailed LOD Index suffixes.
    const levelLineMatch = blockContent.match(/(?:Level|Difficulty):\s*\[?((?:Easy|Medium|Hard)[^\]\n]*)\]?/i);
    if (levelLineMatch) {
      level = levelLineMatch[1].trim();
    } else {
      const levelMatch = blockContent.match(/(?:Level|Difficulty):\s*\[?(Easy|Medium|Hard)\]?/i);
      if (levelMatch) {
        level = levelMatch[1].trim();
        // Capitalize first letter
        level = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
      }
    }

    // 6. Parse Citation
    const citationMatch = blockContent.match(/Citation:\s*(.+)$/im);
    if (citationMatch) {
      citation = citationMatch[1].replace(/\\vfill\\null\s*\\columnbreak/g, "").trim();
    }

    questions.push({
      id: `question_${questionNumber}_${qCount}_${Math.random().toString(36).substring(2, 9)}`,
      number: questionNumber,
      questionText: cleanLaTeXToHumanMarkdown(questionText),
      optionA: cleanLaTeXToHumanMarkdown(optionA),
      optionB: cleanLaTeXToHumanMarkdown(optionB),
      optionC: cleanLaTeXToHumanMarkdown(optionC),
      optionD: cleanLaTeXToHumanMarkdown(optionD),
      answer: answer,
      solution: cleanLaTeXToHumanMarkdown(solution),
      level,
      citation,
    });

    qCount++;
  }

  if (maxCount !== undefined && maxCount > 0) {
    return questions.slice(0, maxCount);
  }

  return questions;
}

export function formatQuestionsAsText(questions: QuestionItem[]): string {
  const scqs = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
  const numericals = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));

  let output = "";
  let overallIdx = 1;

  if (scqs.length > 0) {
    output += "SECTION I: SINGLE CHOICE QUESTIONS\n\n";
    scqs.forEach((q) => {
      output += `Question ${overallIdx}:\n${q.questionText}\n\n`;
      output += "Option:\n";
      if (q.optionA) output += `(a) ${q.optionA}\n`;
      if (q.optionB) output += `(b) ${q.optionB}\n`;
      if (q.optionC) output += `(c) ${q.optionC}\n`;
      if (q.optionD) output += `(d) ${q.optionD}\n`;
      output += "\n";
      output += `Answer:\n${q.answer || ""}\n\n`;
      output += `Solution:\n${q.solution || ""}\n\n`;
      output += `Question Type:\nSCQ\n\n`;
      output += `Level:\n${q.level || "Medium"}\n\n`;
      output += `Citation:\n${q.citation || ""}\n\n`;
      output += "--------------------------------------------------\n\n";
      overallIdx++;
    });
  }

  if (numericals.length > 0) {
    output += "SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS\n\n";
    numericals.forEach((q) => {
      output += `Question ${overallIdx}:\n${q.questionText}\n\n`;
      output += `Answer:\n${q.answer || ""}\n\n`;
      output += `Solution:\n${q.solution || ""}\n\n`;
      output += `Question Type:\nNumerical\n\n`;
      output += `Level:\n${q.level || "Medium"}\n\n`;
      output += `Citation:\n${q.citation || ""}\n\n`;
      output += "--------------------------------------------------\n\n";
      overallIdx++;
    });
  }

  return output.trim();
}

/**
 * Converts standard Markdown syntax (including lists, bold, italics, code snippet notation, 
 * and base64 markdown images) into clean, valid, styled print HTML elements.
 * Keeps KaTeX math delimiters ($ or $$) completely untouched.
 */
export function convertMarkdownToHtmlForPrinting(text: string | undefined): string {
  if (!text) return "";

  // 1. Extract and protect any KaTeX block or inline math segments
  const mathBlocks: string[] = [];
  const placeholderText = text.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
    mathBlocks.push(match);
    return `___MATH_BLOCK_PLACEHOLDER_${mathBlocks.length - 1}___`;
  });

  // 2. Perform markdown parsing on non-math portions
  let cleaned = placeholderText;

  // Convert markdown images: ![Figure](data:...) or any other URL into high-fidelity structured img tags
  // These are given custom styling to fit nicely inside human-readable printed teacher reference sheets
  cleaned = cleaned.replace(/!\[.*?\]\((.*?)\)/gi, (match, url) => {
    return `<div class="my-3 block"><img src="${url}" class="max-h-56 max-w-full my-1 rounded-lg border border-slate-200 shadow-sm block object-contain" /></div>`;
  });

  // Convert markdown bold (**word**) to <strong>
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Convert markdown italic (*word*) to <em>
  cleaned = cleaned.replace(/\*([^*]+)\*/gi, "<em>$1</em>");

  // Convert inline monospace code block formatting
  cleaned = cleaned.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs text-indigo-700">$1</code>');

  // Replace double slash (\\\\) carriage returns with standard line breaks
  cleaned = cleaned.replace(/\\\\\s*/g, "<br/>");

  // Format list items starting with standard list dots "- " or "* "
  const lines = cleaned.split("\n");
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.substring(2).trim();
      if (!inList) {
        lines[i] = `<ul class="list-disc pl-5 my-2"><li class="pl-1">${content}</li>`;
        inList = true;
      } else {
        lines[i] = `<li class="pl-1">${content}</li>`;
      }
    } else {
      if (inList) {
        lines[i] = `</ul>` + (line ? `<div class="mt-2 text-slate-800 leading-relaxed font-sans">${line}</div>` : "");
        inList = false;
      } else if (line) {
        if (i > 0 && lines[i - 1].trim()) {
          lines[i] = `<div class="mt-2 text-slate-800 leading-relaxed font-sans">${line}</div>`;
        }
      }
    }
  }
  if (inList) {
    lines[lines.length - 1] = lines[lines.length - 1] + "</ul>";
  }
  cleaned = lines.join("\n");

  // 3. Restore preserved pure math Blocks
  const restored = cleaned.replace(/___MATH_BLOCK_PLACEHOLDER_(\d+)___/g, (match, index) => {
    return mathBlocks[parseInt(index, 10)];
  });

  return restored.trim();
}

