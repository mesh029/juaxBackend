export const PILOT_COUNTIES = [
  { value: "kisumu", label: "Kisumu" },
  { value: "nairobi", label: "Nairobi" },
  { value: "mombasa", label: "Mombasa" },
  { value: "nyamira", label: "Nyamira" },
] as const;

export type PilotCounty = (typeof PILOT_COUNTIES)[number]["value"];
