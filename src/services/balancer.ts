import { TaxonomyNode } from './taxonomyManager';

export interface BasketItem {
  node: TaxonomyNode;
  count: number;
  lodDistribution: { Easy: number; Medium: number; Hard: number };
}

export interface QuestionSlot {
  section: "SECTION_A_SCQ" | "SECTION_B_NUMERICAL";
  type: "SCQ" | "NUMERICAL";
  node: TaxonomyNode;
  lod: "Easy" | "Medium" | "Hard";
}

export function generateQuestionMatrix(
  basket: BasketItem[],
  typeMix: { SCQ: number; NUMERICAL: number }
): QuestionSlot[] {
  if (!basket || basket.length === 0) {
    return [];
  }

  const scqSection: QuestionSlot[] = [];
  const numericalSection: QuestionSlot[] = [];

  const scqNeeded = typeMix.SCQ;
  const numericalNeeded = typeMix.NUMERICAL;

  // Pre-build interleaved pools of difficulties for each basket item/topic
  const pools = basket.map(item => {
    const list: ("Easy" | "Medium" | "Hard")[] = [];
    const counts = {
      Easy: item.lodDistribution?.Easy ?? 0,
      Medium: item.lodDistribution?.Medium ?? 0,
      Hard: item.lodDistribution?.Hard ?? 0,
    };
    
    // Distribute them evenly by round-robin selection
    while (counts.Easy > 0 || counts.Medium > 0 || counts.Hard > 0) {
      if (counts.Easy > 0) { list.push("Easy"); counts.Easy--; }
      if (counts.Medium > 0) { list.push("Medium"); counts.Medium--; }
      if (counts.Hard > 0) { list.push("Hard"); counts.Hard--; }
    }
    return list;
  });

  // Track how many questions have been pulled from each pool
  const poolPointers = new Array(basket.length).fill(0);

  const getDifficulty = (topicIndex: number, isNumerical: boolean): "Easy" | "Medium" | "Hard" => {
    const pool = pools[topicIndex];
    const pointer = poolPointers[topicIndex];
    if (pool && pointer < pool.length) {
      const difficulty = pool[pointer];
      poolPointers[topicIndex] = pointer + 1;
      return difficulty;
    }
    // Fallback if the pool is somehow exhausted
    return isNumerical ? "Hard" : "Easy";
  };

  // 1. Build SCQ Section
  for (let i = 0; i < scqNeeded; i++) {
    const basketIndex = i % basket.length;
    const item = basket[basketIndex];
    const lod = getDifficulty(basketIndex, false);
    scqSection.push({
      section: "SECTION_A_SCQ",
      type: "SCQ",
      node: item.node,
      lod
    });
  }

  // 2. Build Numerical Section
  for (let i = 0; i < numericalNeeded; i++) {
    const basketIndex = (i + scqNeeded) % basket.length;
    const item = basket[basketIndex];
    const lod = getDifficulty(basketIndex, true);
    numericalSection.push({
      section: "SECTION_B_NUMERICAL",
      type: "NUMERICAL",
      node: item.node,
      lod
    });
  }

  return [...scqSection, ...numericalSection];
}
