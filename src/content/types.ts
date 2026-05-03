export type Difficulty = "Easy" | "Medium" | "Hard";

export interface CapturedData {
  problemTitle: string;
  problemUrl: string;
  capturedAt: string;

  problemNumber?: number;
  difficulty?: Difficulty;
  topics?: string[];
  constraints?: string[];
  summary?: string;
  language?: string;
  runtimeMs?: number;
  runtimePercentile?: number;
  memoryMb?: number;
  memoryPercentile?: number;
}

export type CaptureResult =
  | { kind: "ok"; data: CapturedData }
  | { kind: "failure"; missingSelectors: string[] };
