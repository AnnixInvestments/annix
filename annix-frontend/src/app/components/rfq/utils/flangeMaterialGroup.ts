export const getFlangeMaterialGroup = (steelSpecName?: string): string => {
  if (!steelSpecName) {
    return 'Carbon Steel A105 (Group 1.1)';
  }

  const specUpper = steelSpecName.toUpperCase();

  if (specUpper.includes('316') || specUpper.includes('TP316')) {
    return 'Stainless Steel 316 (Group 2.2)';
  }

  if (specUpper.includes('304') || specUpper.includes('TP304')) {
    return 'Stainless Steel 304 (Group 2.1)';
  }

  return 'Carbon Steel A105 (Group 1.1)';
};
