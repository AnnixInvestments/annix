export interface B16RatingInput {
  materialGroup: string;
  pressureClass: string;
  temperatureC: number;
  pressureBar?: number;
}

export const referenceKeys = {
  all: ["reference"] as const,
  pipeSpecs: () => [...referenceKeys.all, "pipe-specs"] as const,
  b16Rating: (input: B16RatingInput) => [...referenceKeys.all, "b16-rating", input] as const,
} as const;
