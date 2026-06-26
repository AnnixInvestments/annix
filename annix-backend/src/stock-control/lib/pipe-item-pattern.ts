export const PIPE_ITEM_PATTERN =
  /(?:\d+\s*NB|NB\s*\d+|^\d{2,4}\s*x\s*\d{2,4}\b|\bPIPE\b|\bBEND\b|\bELBOW\b|\bTEE\b|\bT[- ]?PIECE\b|\bREDUCER\b|\bLATERAL\b|\bFLANGE\b|\bOFFSET\b|\bVALVE\b|\bSCH(?:EDULE)?\s*\d+|\d+\s*LG\b|\d+(?:\.\d+)?\s*m\s*(?:²|2))/i;

export function isPipeLineItem(value: string | null | undefined): boolean {
  return value ? PIPE_ITEM_PATTERN.test(value) : false;
}
