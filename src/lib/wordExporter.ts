import { parseQuestions, QuestionItem } from "./questionParser";

/**
 * Strips standard LaTeX command wrappers and symbols, while keeping content within them.
 */
function stripLatexFormattingInner(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\noindent\s*/gi, "")
    .replace(/\\textbf\{([^}]+)\}/gi, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/gi, "<em>$1</em>")
    .replace(/\\mathrm\{([^}]+)\}/gi, "$1")
    .replace(/\\text\{([^}]+)\}/gi, "$1")
    .replace(/\\bold\{([^}]+)\}/gi, "<strong>$1</strong>")
    .replace(/\\mathrm/gi, "")
    .replace(/\\text/gi, "")
    .replace(/\\times\s*/gi, " × ")
    .replace(/\\div\s*/gi, " ÷ ")
    .replace(/\\pm\s*/gi, " ± ")
    .replace(/\\le\s*/gi, " ≤ ")
    .replace(/\\ge\s*/gi, " ≥ ")
    .replace(/\\ne\s*/gi, " ≠ ")
    .replace(/\\approx\s*/gi, " ≈ ")
    .replace(/\\infty\s*/gi, " ∞ ")
    .replace(/\\alpha\s*/gi, "α")
    .replace(/\\beta\s*/gi, "β")
    .replace(/\\gamma\s*/gi, "γ")
    .replace(/\\theta\s*/gi, "θ")
    .replace(/\\pi\s*/gi, "π")
    .replace(/\\mu\s*/gi, "μ")
    .replace(/\\lambda\s*/gi, "λ")
    .replace(/\\phi\s*/gi, "φ")
    .replace(/\\omega\s*/gi, "ω")
    .replace(/\\Delta\s*/gi, "Δ")
    .replace(/\\sigma\s*/gi, "σ")
    .replace(/\\epsilon\s*/gi, "ε")
    .replace(/\\rho\s*/gi, "ρ")
    .replace(/\\eta\s*/gi, "η")
    .replace(/\\tau\s*/gi, "τ")
    .replace(/\\degree\s*/gi, "°")
    .replace(/\\\^\s*\{\\circ\}/gi, "°")
    .replace(/\^\\circ\b/gi, "°")
    .replace(/\\hat\{([^}]+)\}/gi, "<strong>$1̂</strong>")
    .replace(/\\vec\{([^}]+)\}/gi, "<strong>$1⃑</strong>")
    .replace(/\\sqrt\{([^}]+)\}/gi, "√($1)")
    .replace(/\\item/gi, "")
    .replace(/\\begin\{itemize\}/gi, "")
    .replace(/\\end\{itemize\}/gi, "")
    .replace(/\\begin\{enumerate\}/gi, "")
    .replace(/\\end\{enumerate\}/gi, "");
}

/**
 * Automatically converts block systems of aligning columns (e.g., \begin{align} ... \end{align})
 * into native Microsoft Word responsive HTML tables.
 */
function convertLatexAlign(text: string): string {
  const alignRegex = /\\begin\s*\{\s*(align\*?|split|gather\*?)\s*\}([\s\S]*?)\\end\s*\{\s*\1\s*\}/gi;
  
  return text.replace(alignRegex, (match, type, content) => {
    const rows = content.split(/\\\\|\\cr/);
    let tableHtml = `<table cellpadding="2" cellspacing="0" style="display: table; margin: 10px auto; text-align: left; border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13.5px; line-height: 1.4; width: auto;">`;
    
    rows.forEach((row: string) => {
      const trimmedRow = row.trim();
      if (!trimmedRow) return;
      
      tableHtml += `<tr>`;
      if (trimmedRow.includes('&')) {
        const parts = trimmedRow.split('&');
        // Fit each side cleanly, left side aligns right, right side aligns left
        const part1 = parts[0].trim();
        const part2 = parts.slice(1).join('&').trim();
        tableHtml += `<td style="text-align: right; padding-right: 6px; color: #1e293b; white-space: nowrap;">${part1}</td>`;
        tableHtml += `<td style="text-align: left; padding-left: 6px; color: #1e293b;">${part2}</td>`;
      } else {
        tableHtml += `<td colspan="2" style="text-align: center; color: #1e293b;">${trimmedRow}</td>`;
      }
      tableHtml += `</tr>`;
    });
    
    tableHtml += `</table>`;
    return tableHtml;
  });
}

/**
 * Transforms system determinants and bracket matrices (e.g. \begin{vmatrix} ... \end{vmatrix}) 
 * into clear structured HTML vector layout tables that open cleanly in Word/Docs.
 */
function convertLatexMatrices(text: string): string {
  const matrixRegex = /\\begin\s*\{\s*(vmatrix|bmatrix|pmatrix|matrix|array)\s*\}([\s\S]*?)\\end\s*\{\s*\1\s*\}/gi;
  
  return text.replace(matrixRegex, (match, type, content) => {
    const rows = content.split(/\\\\|\\cr/);
    let tableHtml = `<table cellpadding="4" cellspacing="0" style="display: inline-table; vertical-align: middle; margin: 8px 6px; text-align: center; border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.2;`;
    
    if (type.toLowerCase() === 'vmatrix') {
      tableHtml += ` border-left: 1.5px solid #111827; border-right: 1.5px solid #111827; padding-left: 4px; padding-right: 4px;`;
    } else if (type.toLowerCase() === 'bmatrix') {
      tableHtml += ` border-left: 2px solid #111827; border-right: 2px solid #111827; border-radius: 4px; padding-left: 4px; padding-right: 4px;`;
    } else if (type.toLowerCase() === 'pmatrix') {
      tableHtml += ` border-left: 1px solid #111827; border-right: 1px solid #111827; border-radius: 12px; padding-left: 4px; padding-right: 4px;`;
    } else {
      tableHtml += ` padding-left: 2px; padding-right: 2px;`;
    }
    
    tableHtml += `">`;
    
    rows.forEach((row: string) => {
      const trimmedRow = row.trim();
      if (!trimmedRow) return;
      
      tableHtml += `<tr>`;
      const cols = trimmedRow.split('&');
      cols.forEach((col) => {
        tableHtml += `<td style="padding: 4px 10px; text-align: center; vertical-align: middle; white-space: nowrap; color: #1e293b; font-weight: 500;">${col.trim()}</td>`;
      });
      tableHtml += `</tr>`;
    });
    
    tableHtml += `</table>`;
    return tableHtml;
  });
}

/**
 * Solves and replaces fractional blocks in LaTeX iteratively to support multi-level division nesting.
 */
function convertLatexFractions(text: string): string {
  if (!text) return "";
  
  let prevText = "";
  let loopCount = 0;
  // Iterate up to 5 levels of nesting to handle complex fraction trees perfectly
  while (text !== prevText && loopCount < 5) {
    prevText = text;
    loopCount++;
    text = text.replace(/\\(?:d)?frac\s*\{((?:[^{}]+|\{[^{}]*\})*)\}\s*\{((?:[^{}]+|\{[^{}]*\})*)\}/gi, (match, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      
      const hasOperatorNum = /[\s+-=×÷≠≤≥]/.test(cleanNum) || cleanNum.includes('&');
      const hasOperatorDen = /[\s+-=×÷≠≤≥]/.test(cleanDen) || cleanDen.includes('&');
      
      const formattedNum = hasOperatorNum ? `(${cleanNum})` : cleanNum;
      const formattedDen = hasOperatorDen ? `(${cleanDen})` : cleanDen;
      
      return `<span style="white-space: nowrap; font-family: 'Segoe UI', Arial, sans-serif;"><sup>${formattedNum}</sup>&frasl;<sub>${formattedDen}</sub></span>`;
    });
  }
  return text;
}

/**
 * Removes standard LaTeX markdown decorations, raw symbols, dollar signs, and internal verifications.
 * Converts chemical/math sub/superscripts to high-fidelity Word-readable <sub> and <sup> tags.
 */
export function stripLatexFormatting(text: string): string {
  if (!text) return "";

  // 1. Remove internal backend solving/verification blocks that clutter student-facing questions
  const pattern = /(?:\\textbf\{|\*\*|\*)?(?:Internal\s+)?Solving\s+Verification:?[*}\s]*[\s\S]*$/i;
  text = text.replace(pattern, "");

  // 2. Convert and systemize aligning blocks like matrices, determinants, and multi-line split alignments
  text = convertLatexAlign(text);
  text = convertLatexMatrices(text);
  text = convertLatexFractions(text);

  // 3. Clean up left/right modifiers and LaTeX vector caps/bars
  text = text.replace(/\\left/g, " ").replace(/\\right/g, " ");
  text = text.replace(/\\langle\s*/g, "⟨").replace(/\\rangle\s*/g, "⟩");
  text = text.replace(/\\overline\{([^}]+)\}/gi, '<span style="text-decoration: overline;">$1</span>');
  text = text.replace(/\\underline\{([^}]+)\}/gi, '<span style="text-decoration: underline;">$1</span>');
  text = text.replace(/\\bar\{([^}]+)\}/gi, "$1̄");

  // 4. Format braced subscripts/superscripts (e.g. C_{10}H_{22})
  text = text.replace(/_\{([^}]+)\}/gi, "<sub>$1</sub>");
  text = text.replace(/\^\{([^}]+)\}/gi, "<sup>$1</sup>");

  // 5. Format reaction arrows with conditions (e.g. \xrightarrow[\text{dry ether}]{\text{Mg}})
  // First match brackets and braces:
  text = text.replace(/\\x?rightarrow\s*(?:\[([^\]]+)\])?\s*\{([^}]+)\}/gi, (match, below, above) => {
    const rawAbove = stripLatexFormattingInner(above || "");
    const rawBelow = below ? stripLatexFormattingInner(below) : "";
    const cleanAbove = rawAbove.replace(/\\text|\\mathrm/g, "").replace(/[{}]/g, "").trim();
    const cleanBelow = rawBelow.replace(/\\text|\\mathrm/g, "").replace(/[{}]/g, "").trim();
    const cond = [cleanAbove, cleanBelow].filter(Boolean).join(", ");
    return cond ? ` ──(${cond})──> ` : " ──> ";
  });

  // Then match braces only:
  text = text.replace(/\\x?rightarrow\s*\{([^}]+)\}/gi, (match, above) => {
    const rawAbove = stripLatexFormattingInner(above || "");
    const cleanAbove = rawAbove.replace(/\\text|\\mathrm/g, "").replace(/[{}]/g, "").trim();
    return cleanAbove ? ` ──(${cleanAbove})──> ` : " ──> ";
  });

  // Then match concatenated typos/artifacts from LLM (e.g. \xrightarrowHI, \xrightarrowheat, \xrightarrowdry ether, \xrightarrowwheat)
  text = text.replace(/\\x?right(a|ar)?row([a-zA-Z0-9\s/+-]+)/gi, (match, prefix, cond) => {
    let cleanCond = cond.trim();
    // Adjust common LLM typo "wheat" -> "heat"
    if (cleanCond.toLowerCase() === "wheat") {
      cleanCond = "heat";
    }
    return ` ──(${cleanCond})──> `;
  });

  // Direct conversions for standard arrows
  text = text.replace(/\\right(a|ar)?row/gi, " → ");
  text = text.replace(/\\to\b/gi, " → ");
  text = text.replace(/\\left(a|ar)?row/gi, " ← ");

  // 6. Do the rest of general latex character & formatting conversions
  text = stripLatexFormattingInner(text);

  // 7. Format unbraced single/double-character subscripts & superscripts (e.g., C_4H_10O, D_2O)
  text = text.replace(/_([0-9a-zA-Z+-]{1,3})\b/g, "<sub>$1</sub>");
  text = text.replace(/\^([0-9a-zA-Z+-]{1,3})\b/g, "<sup>$1</sup>");

  // 8. Clean up markdown bold (**bold**) and italics (*italics*) so Word renders them beautifully
  text = text.replace(/\*\*([^*]+)\*\s*/g, "<strong>$1</strong> ");
  text = text.replace(/\*\*([^*]+)\**/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*\s*/g, "<em>$1</em> ");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // 9. Format markdown backticks to code tags with a nice background style
  text = text.replace(/`([^`]+)`/g, '<code style="font-family: Consolas, monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 3px;">$1</code>');

  // 10. Completely remove LaTeX math fences (dollar signs '$')
  text = text.replace(/\$/g, "");

  // 10.5. Strip leftover LaTeX layout and style commands (prevents words like 'textbf' or 'textit' showing up in Word docs)
  text = text.replace(/\\(?:textbf|textit|texttt|underline|mathrm|text|mathbf|mathit|mathsf|mathtt|bold|emph|noindent|columnbreak|vfill|null|centering|pagebreak|newpage|small|large|Large|normalsize|tiny|huge|Huge|item|begin|end|section|subsection|subsubsection|label|ref|cite)\b\s*\{?\s*\}?/gi, "");

  // 11. Clean up any lingering escaped braces or command artifacts
  text = text.replace(/\\{/g, "{").replace(/\\}/g, "}");
  text = text.replace(/\{([^}]+)\}/g, "$1");
  text = text.replace(/\\/g, ""); // Strip any remaining backslashes

  // 12. Collapse extra spaces
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

/**
 * Generates an HTML string formatted as a standard Word Document (.doc) in modern clean typography.
 * Microsoft Word and Google Docs read this HTML format seamlessly when opened, rendering it as a fully-rich, beautifully spaced file.
 */
export function generateReadableWordDocument(
  generatedContentOrQuestions: string | QuestionItem[],
  examPattern: string = "JEE",
  subject: string = "Physics",
  chapter: string = "",
  topic: string = "",
  includeSolutions: boolean = true,
  maxCount?: number
): string {
  const questions = Array.isArray(generatedContentOrQuestions)
    ? generatedContentOrQuestions
    : parseQuestions(generatedContentOrQuestions, maxCount);

  const displaySubject = subject || "Academic Practice";
  const displayChapter = chapter || topic || "Practice Worksheet";
  const suffix = includeSolutions ? "(Questions & Solutions)" : "(Questions Only)";

  let bodyHtml = "";

  if (questions.length === 0) {
    // Fallback if parsing fails - render a beautiful clean rendering of the raw text with simplified HTML formatting
    const rawContent = typeof generatedContentOrQuestions === "string" ? generatedContentOrQuestions : "";
    const cleanedRawLines = rawContent
      .split("\n")
      .map(line => `<p style="margin: 0 0 10px 0; font-size: 13.5px; color: #334155; line-height: 1.6;">${stripLatexFormatting(line)}</p>`)
      .join("");

    bodyHtml = `
      <div class="Section2">
        ${cleanedRawLines}
      </div>
    `;
  } else {
    const scqs = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
    const numericals = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
    let unifiedIndex = 1;

    let sectionsHtml = "";

    // 1. Single Choice Section
    if (scqs.length > 0) {
      sectionsHtml += `
        <div style="border-bottom: 1.5px solid #0f172a; margin-top: 15px; margin-bottom: 20px; text-align: center; padding-bottom: 4px; page-break-inside: auto; break-inside: auto; -webkit-column-break-inside: auto;">
          <h2 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">SECTION I: MULTIPLE CHOICE QUESTIONS</h2>
        </div>
      `;

      scqs.forEach((q) => {
        const currentNum = unifiedIndex++;
        const cleanedQuestion = stripLatexFormatting(q.questionText);

        let optionsMarkup = "";
        if (q.optionA || q.optionB || q.optionC || q.optionD) {
          optionsMarkup += `<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 8px; margin-bottom: 12px; margin-left: 15px; font-family: 'Segoe UI', Arial, sans-serif;">`;
          if (q.optionA) optionsMarkup += `<tr><td style="width: 30px; font-weight: bold; color: #334155; font-size: 13.5px; vertical-align: top; padding: 4px 0;">(a)</td><td style="color: #0f172a; font-size: 13.5px; padding: 4px 0; vertical-align: top;">${stripLatexFormatting(q.optionA)}</td></tr>`;
          if (q.optionB) optionsMarkup += `<tr><td style="width: 30px; font-weight: bold; color: #334155; font-size: 13.5px; vertical-align: top; padding: 4px 0;">(b)</td><td style="color: #0f172a; font-size: 13.5px; padding: 4px 0; vertical-align: top;">${stripLatexFormatting(q.optionB)}</td></tr>`;
          if (q.optionC) optionsMarkup += `<tr><td style="width: 30px; font-weight: bold; color: #334155; font-size: 13.5px; vertical-align: top; padding: 4px 0;">(c)</td><td style="color: #0f172a; font-size: 13.5px; padding: 4px 0; vertical-align: top;">${stripLatexFormatting(q.optionC)}</td></tr>`;
          if (q.optionD) optionsMarkup += `<tr><td style="width: 30px; font-weight: bold; color: #334155; font-size: 13.5px; vertical-align: top; padding: 4px 0;">(d)</td><td style="color: #0f172a; font-size: 13.5px; padding: 4px 0; vertical-align: top;">${stripLatexFormatting(q.optionD)}</td></tr>`;
          optionsMarkup += `</table>`;
        }

        let solutionBox = "";
        if (includeSolutions) {
          solutionBox = `
            <div style="margin-top: 8px; margin-left: 15px; margin-bottom: 20px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.5; border-left: 2px solid #94a3b8; padding-left: 12px; page-break-inside: auto; break-inside: auto;">
              <p style="margin: 0 0 4px 0;">
                <strong>Correct Answer:</strong> 
                <span style="color: #0f172a; font-weight: bold;">${q.answer || "N/A"}</span>
              </p>
              ${q.solution ? `
                <p style="margin: 4px 0 0 0;">
                  <strong>Explanation:</strong> ${stripLatexFormatting(q.solution)}
                </p>
              ` : ""}
              <p style="margin: 6px 0 0 0; font-size: 10.5px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                Difficulty: ${q.level || "Medium"} | Reference: ${q.citation || "N/A"}
              </p>
            </div>
          `;
        } else {
          solutionBox = `<div style="margin-bottom: 20px;"></div>`;
        }

        sectionsHtml += `
          <div class="question-container" style="page-break-inside: auto; break-inside: auto; -webkit-column-break-inside: auto; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; line-height: 1.5;">
              <span style="color: #0f172a; font-weight: 850;">Question ${currentNum}:</span> ${cleanedQuestion}
            </p>
            ${optionsMarkup}
            ${solutionBox}
          </div>
        `;
      });
    }

    // 2. Numerical Intelligence Section
    if (numericals.length > 0) {
      sectionsHtml += `
        <div style="border-bottom: 1.5px solid #0f172a; margin-top: 25px; margin-bottom: 20px; text-align: center; padding-bottom: 4px; page-break-inside: auto; break-inside: auto; -webkit-column-break-inside: auto;">
          <h2 style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: bold; color: #0f172a; margin: 0; letter-spacing: 1px; text-transform: uppercase;">SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS</h2>
        </div>
      `;

      numericals.forEach((q) => {
        const currentNum = unifiedIndex++;
        const cleanedQuestion = stripLatexFormatting(q.questionText);

        let solutionBox = "";
        if (includeSolutions) {
          solutionBox = `
            <div style="margin-top: 8px; margin-left: 15px; margin-bottom: 20px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.5; border-left: 2px solid #94a3b8; padding-left: 12px; page-break-inside: auto; break-inside: auto;">
              <p style="margin: 0 0 4px 0;">
                <strong>Correct Answer:</strong> 
                <span style="color: #0f172a; font-weight: bold;">${q.answer || "N/A"}</span>
              </p>
              ${q.solution ? `
                <p style="margin: 4px 0 0 0;">
                  <strong>Explanation:</strong> ${stripLatexFormatting(q.solution)}
                </p>
              ` : ""}
              <p style="margin: 6px 0 0 0; font-size: 10.5px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">
                Difficulty: ${q.level || "Medium"} | Reference: ${q.citation || "N/A"}
              </p>
            </div>
          `;
        } else {
          solutionBox = `<div style="margin-bottom: 20px;"></div>`;
        }

        sectionsHtml += `
          <div class="question-container" style="page-break-inside: auto; break-inside: auto; -webkit-column-break-inside: auto; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; line-height: 1.5;">
              <span style="color: #0f172a; font-weight: 850;">Question ${currentNum}:</span> ${cleanedQuestion}
            </p>
            ${solutionBox}
          </div>
        `;
      });
    }

    bodyHtml = `
      <div class="Section2">
        ${sectionsHtml}
      </div>
    `;
  }

  // Combine headers and body to make standard Microsoft Word compliant HTML document markup
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${displaySubject} Practice Worksheet ${suffix}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 8.5in 11in;
          margin: 0.75in 0.75in 0.75in 0.75in;
          mso-header-margin: .5in;
          mso-footer-margin: .5in;
          mso-paper-source: 0;
        }
        @page Section2 {
          size: 8.5in 11in;
          margin: 0.75in 0.75in 0.75in 0.75in;
          mso-header-margin: .5in;
          mso-footer-margin: .5in;
          mso-paper-source: 0;
          mso-columns: 2 18.0pt;
        }
        div.Section1 {
          page: Section1;
        }
        div.Section2 {
          page: Section2;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.5;
          color: #334155;
        }
        .diacolumn-flow {
          column-count: 2;
          -webkit-column-count: 2;
          -moz-column-count: 2;
          column-gap: 24px;
          column-rule: 0.5px solid #cbd5e1;
        }
        .question-container {
          page-break-inside: auto;
          break-inside: auto;
          -webkit-column-break-inside: auto;
          margin-bottom: 24px;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `.trim();
}
