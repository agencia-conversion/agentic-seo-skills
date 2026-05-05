// Fixed E-E-A-T checklist. Mirrors skills/eeat/references/checklist.md.
// Edits here must be reflected in the reference doc.

export const CHECKLIST = {
  experience: [
    { id: "ex1", weight: 2 },
    { id: "ex2", weight: 2 },
    { id: "ex3", weight: 1 },
    { id: "ex4", weight: 1 },
    { id: "ex5", weight: 1 },
    { id: "ex6", weight: 1 },
    { id: "ex7", weight: 1 },
    { id: "ex8", weight: 1 },
  ],
  expertise: [
    { id: "eq1", weight: 2 },
    { id: "eq2", weight: 2 },
    { id: "eq3", weight: 1 },
    { id: "eq4", weight: 1 },
    { id: "eq5", weight: 1 },
    { id: "eq6", weight: 1 },
    { id: "eq7", weight: 1 },
    { id: "eq8", weight: 1 },
  ],
  authoritativeness: [
    { id: "au1", weight: 2 },
    { id: "au2", weight: 2 },
    { id: "au3", weight: 1 },
    { id: "au4", weight: 1 },
    { id: "au5", weight: 1 },
    { id: "au6", weight: 1 },
    { id: "au7", weight: 1 },
    { id: "au8", weight: 1 },
  ],
  trust: [
    { id: "tr1", weight: 2 },
    { id: "tr2", weight: 2 },
    { id: "tr3", weight: 2 },
    { id: "tr4", weight: 1 },
    { id: "tr5", weight: 1 },
    { id: "tr6", weight: 1 },
    { id: "tr7", weight: 1 },
    { id: "tr8", weight: 1 },
    { id: "tr9", weight: 1 },
    { id: "tr10", weight: 1 },
  ],
};

export const PILLARS = ["experience", "expertise", "authoritativeness", "trust"];

export const RATING_LABELS = ["Lowest", "Low", "Medium", "High", "Highest"];
export const RATING_POINTS = { Lowest: 0, Low: 25, Medium: 50, High: 75, Highest: 100 };
export const STATE_VALUES = { present: 1.0, partial: 0.5, absent: 0.0, unclear: 0.0 };

export function ratioToRating(ratio) {
  if (ratio >= 0.85) return "Highest";
  if (ratio >= 0.65) return "High";
  if (ratio >= 0.40) return "Medium";
  if (ratio >= 0.20) return "Low";
  return "Lowest";
}

export function scoreToPageQuality(score) {
  if (score >= 85) return "Highest";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Lowest";
}
