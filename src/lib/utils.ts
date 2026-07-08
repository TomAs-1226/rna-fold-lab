import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Map a value in [0,1] to a teal→amber→red color for accessibility bars. */
export function opennessColor(v: number): string {
  if (v >= 0.66) return "#2DD4BF"; // open = good (teal)
  if (v >= 0.4) return "#F5B056"; // middling (amber)
  return "#F87171"; // folded up = bad (red)
}
