export type Discipline =
  | "belly"
  | "freefly"
  | "swoop"
  | "wingsuit"
  | "tracking"
  | "hop-pop"
  | "student"
  | "coach"
  | "aff"
  | "tandem";

export interface Jump {
  id: string;
  date: string; // ISO (yyyy-mm-dd)
  discipline: Discipline;
  exitAltitude: number; // ft
  deploymentAltitude: number; // ft
  dropzone: string;
  notes?: string;
}

export interface TreeStats {
  jumps: number;
  years: number;
  disciplines: number;
  freefallFeet: number;
}

export type Season = "spring" | "summer" | "autumn" | "winter";
