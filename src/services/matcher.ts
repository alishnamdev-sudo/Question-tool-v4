import stringSimilarity from 'string-similarity';
import { TaxonomyNode } from './taxonomyManager';

export interface SelectionRequest {
  grade: string;
  subject: string;
  chapterName: string;
  topicName: string;
  subTopic01?: string;
}

export function validateAndResolveSelection(
  request: SelectionRequest,
  taxonomy: TaxonomyNode[]
): { resolvedNode: TaxonomyNode; isFallback: boolean } {
  console.log("Validating selection request:", request);
  
  if (!taxonomy || taxonomy.length === 0) {
    console.warn("Taxonomy is empty, cannot resolve selection. Returning fallback node of empty string values.");
    return {
      resolvedNode: {
        grade: request.grade || "",
        subject: request.subject || "",
        chapterName: request.chapterName || "",
        topicName: request.topicName || "",
        subTopic01: request.subTopic01 || ""
      },
      isFallback: true
    };
  }

  // 1. Exact Match Check
  const exact = taxonomy.find(row => 
    row.grade.toLowerCase() === (request.grade || "").toLowerCase() &&
    row.subject.toLowerCase() === (request.subject || "").toLowerCase() &&
    row.chapterName.toLowerCase() === (request.chapterName || "").toLowerCase() &&
    row.topicName.toLowerCase() === (request.topicName || "").toLowerCase() &&
    (row.subTopic01 || "").toLowerCase() === (request.subTopic01 || "").toLowerCase()
  );

  if (exact) {
    console.log("Exact taxonomy match found:", exact);
    return { resolvedNode: exact, isFallback: false };
  }

  // 2. Filter taxonomy to match grade and chapter
  const potentialChapters = taxonomy.filter(row => 
    row.grade.toLowerCase() === (request.grade || "").toLowerCase() &&
    row.chapterName.toLowerCase() === (request.chapterName || "").toLowerCase()
  );

  if (potentialChapters.length > 0) {
    const topicsInChapter = potentialChapters.map(row => row.topicName);
    const matches = stringSimilarity.findBestMatch(request.topicName || "", topicsInChapter);
    
    if (matches.bestMatch.rating > 0.6) {
      const bestMatchNode = potentialChapters[matches.bestMatchIndex];
      console.log(`Soft match found with rating ${matches.bestMatch.rating}:`, bestMatchNode);
      return { resolvedNode: bestMatchNode, isFallback: true };
    }
    
    // Fallback to the first topic found in this chapter
    console.log("No high rating match in chapter; falling back to first topic in chapter:", potentialChapters[0]);
    return { resolvedNode: potentialChapters[0], isFallback: true };
  }

  // 3. Absolute Fallback to avoid crashes (Default back to the first available node in that grade)
  const gradeQuery = (request.grade || "").toLowerCase();
  const absoluteFallback = taxonomy.find(row => row.grade.toLowerCase() === gradeQuery) || taxonomy[0];
  console.log("No matched chapter found; using absolute grade fallback node:", absoluteFallback);
  return { resolvedNode: absoluteFallback, isFallback: true };
}
