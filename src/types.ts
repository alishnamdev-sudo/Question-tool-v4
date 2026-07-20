import { TaxonomyNode } from "./services/taxonomyManager";

export interface SelectedBasketItem {
  id: string;
  node: TaxonomyNode;
  count: number;
  lodDistribution: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
}

export type { TaxonomyNode };
