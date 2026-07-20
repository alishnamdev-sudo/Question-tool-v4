import { QuestionItem } from "../lib/questionParser";

export interface SheetExportConfig {
  title: string;
  topic: string;
  pattern: string;
}

// Extract Spreadsheet ID from a sheet URL
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

/**
 * Creates a new Google Spreadsheet and populates it with generated questions.
 */
export async function createAndPopulateSpreadsheet(
  accessToken: string,
  config: SheetExportConfig,
  questions: QuestionItem[]
): Promise<string> {
  const title = config.title || `${config.topic} (${config.pattern}) Problem Set`;

  // 1. Create a spreadsheet
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title,
      },
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const sheetId = spreadsheet.sheets?.[0]?.properties?.sheetId ?? 0;

  // 2. Populate values
  await populateSheetValues(accessToken, spreadsheetId, "Sheet1", config, questions);

  // 3. Apply professional layout formatting (emerald/white header, bold columns, frozen row)
  try {
    await applySheetFormatting(accessToken, spreadsheetId, sheetId);
  } catch (fmtError) {
    console.warn("Formatting step skipped or failed:", fmtError);
  }

  return spreadsheetId;
}

/**
 * Appends a new sheet section to an existing Google Spreadsheet and populates it.
 */
export async function appendToExistingSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  config: SheetExportConfig,
  questions: QuestionItem[]
): Promise<{ spreadsheetId: string; sheetTitle: string }> {
  // Create a sheet title based on the topic & exam pattern (e.g., "JEE - Kinematics")
  const rawTitle = `${config.pattern} - ${config.topic}`;
  // Sheet names cannot contain special characters like * ? : \ / or be duplicates, so let's sanitize it
  const sanitizedTitle = rawTitle.replace(/[\*\?\:\\\/]/g, "").substring(0, 31);
  const sheetTitle = `${sanitizedTitle} (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;

  // 1. Add a new sheet tab to the existing spreadsheet
  const addSheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        },
      ],
    }),
  });

  let activeSheetTitle = sheetTitle;
  let activeSheetId: number | null = null;

  if (addSheetResponse.ok) {
    const result = await addSheetResponse.json();
    activeSheetId = result.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
  } else {
    // If the sheet already exists or it failed to add, fallback to standard range appending on "Sheet1"
    console.warn("Could not create new sheet tab, appending to raw sheet");
    activeSheetTitle = "Sheet1";
  }

  // 2. Populate values
  await populateSheetValues(accessToken, spreadsheetId, activeSheetTitle, config, questions);

  // 3. Apply formatting if we successfully added the sheet and got its ID
  if (activeSheetId !== null) {
    try {
      await applySheetFormatting(accessToken, spreadsheetId, activeSheetId);
    } catch (fmtError) {
      console.warn("Formatting step skipped or failed:", fmtError);
    }
  }

  return { spreadsheetId, sheetTitle: activeSheetTitle };
}

/**
 * Appends generated questions into a specific target range.
 */
async function populateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  rangeName: string,
  config: SheetExportConfig,
  questions: QuestionItem[]
): Promise<void> {
  const headers = [
    "Question No.",
    "Exam Pattern",
    "Topic",
    "Difficulty Level",
    "Question Content",
    "Option (A)",
    "Option (B)",
    "Option (C)",
    "Option (D)",
    "Correct Answer",
    "Detailed Explanation / Solution",
    "Source Citations",
  ];

  const rows = questions.map((q) => [
    q.number,
    config.pattern,
    config.topic,
    q.level,
    q.questionText,
    q.optionA,
    q.optionB,
    q.optionC,
    q.optionD,
    q.answer,
    q.solution,
    q.citation,
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      rangeName
    )}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [headers, ...rows],
        majorDimension: "ROWS",
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to append values to sheet: ${errText}`);
  }
}

/**
 * Formats a Google Sheets sheet (Frozen Header, Bold titles, custom BG colors)
 */
async function applySheetFormatting(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        // 1. Repeat Cell: Make the header emerald green, white text, bold, centered
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 12,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.12,  // #1f2937 or high-contrast emerald #059669
                  green: 0.16,
                  blue: 0.22,
                },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                  fontFamily: "Arial",
                },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // 2. Set grid properties: Freeze the first row
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // 3. Set text wrapping for the content columns (Columns 4, 10, 11 - text content, solution, citation) so it wraps nicely
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 12,
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP",
                verticalAlignment: "TOP",
                textFormat: {
                  fontSize: 10,
                  fontFamily: "Arial",
                },
              },
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)",
          },
        },
        // 4. Update column widths to reasonable layouts
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0, // Question No.
              endIndex: 1,
            },
            properties: {
              pixelSize: 90,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 1, // Exam Pattern
              endIndex: 4,   // Topic, Difficulty
            },
            properties: {
              pixelSize: 110,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 4, // Question Content
              endIndex: 5,
            },
            properties: {
              pixelSize: 320,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 5, // Options A-D
              endIndex: 9,
            },
            properties: {
              pixelSize: 140,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 9, // Answer
              endIndex: 10,
            },
            properties: {
              pixelSize: 100,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 10, // Detailed Explanation
              endIndex: 11,
            },
            properties: {
              pixelSize: 350,
            },
            fields: "pixelSize",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 11, // Citation
              endIndex: 12,
            },
            properties: {
              pixelSize: 180,
            },
            fields: "pixelSize",
          },
        },
      ],
    }),
  });
}
