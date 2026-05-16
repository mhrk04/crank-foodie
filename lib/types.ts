export type ReportTypeKey =
  | "PestObject"
  | "FoodPoisoning"
  | "DirtyToilet"
  | "DirtyDiningArea"
  | "BadSmell"
  | "PositiveCleanliness";

export type Restaurant = {
  id: number;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  priceRange: number;
  metadataURI?: string;
  score: number;
  reportCount: number;
  cleaningCountToday: number;
  lastCleanedAt: string;
  tags: string[];
};

export type ReportDraft = {
  restaurantId: number;
  reportType: ReportTypeKey;
  severity: number;
  starRating: number;
  evidenceURIs: string[];
  detailsURI: string;
};

export type CleaningLogDraft = {
  restaurantId: number;
  cleanlinessScore: number;
  evidenceURI: string;
};
