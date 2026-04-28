
export function getWeldName(weld: any, index: number) {
  return weld.weld_number || `L-${index + 1}`;
}
