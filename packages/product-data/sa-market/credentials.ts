export const CREDENTIAL_TYPES = [
  "medical",
  "mine_induction",
  "blasting",
  "eye_test",
  "lift_driver",
  "working_at_heights",
  "h2s_awareness",
  "first_aid",
  "fire_fighting",
  "other",
] as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  medical: "Medical Certificate",
  mine_induction: "Mine Induction",
  blasting: "Blasting Ticket",
  eye_test: "Eye Test",
  lift_driver: "Lift Driver Licence",
  working_at_heights: "Working at Heights",
  h2s_awareness: "H2S Awareness",
  first_aid: "First Aid",
  fire_fighting: "Fire Fighting",
  other: "Other",
};
