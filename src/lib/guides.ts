// Finds CRISPR/Cas9 guide sites in a piece of DNA.
// SpCas9 cuts next to a PAM of the form NGG. A guide's 20-letter "spacer" sits right
// before the PAM. PAMs can be on either strand, so we scan both:
//   forward strand: 20-nt spacer, then N G G
//   reverse strand: on the given strand that shows up as C C N, then the spacer

const COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };

function revComp(s: string): string {
  let out = "";
  for (let i = s.length - 1; i >= 0; i -= 1) out += COMP[s[i]] || "N";
  return out;
}

export interface Candidate {
  spacer: string; // 20-nt protospacer (DNA letters)
  strand: "+" | "-";
  position: number; // 1-based start on the given sequence
  pam: string; // the 3-letter PAM (NGG)
}

export function findGuides(dnaInput: string, maxGuides = 300): Candidate[] {
  const dna = dnaInput.replace(/\s+/g, "").toUpperCase().replace(/U/g, "T");
  if (!/^[ACGT]*$/.test(dna)) throw new Error("Only A, C, G, T (or U) are allowed.");
  const out: Candidate[] = [];
  const n = dna.length;

  for (let i = 0; i + 23 <= n; i += 1) {
    // forward: spacer = i..i+19, PAM = i+20..i+22 must be N G G
    if (dna[i + 21] === "G" && dna[i + 22] === "G") {
      out.push({ spacer: dna.slice(i, i + 20), strand: "+", position: i + 1, pam: dna.slice(i + 20, i + 23) });
    }
    // reverse: given-strand C C N here means an NGG PAM on the other strand
    if (dna[i] === "C" && dna[i + 1] === "C") {
      out.push({ spacer: revComp(dna.slice(i + 3, i + 23)), strand: "-", position: i + 1, pam: revComp(dna.slice(i, i + 3)) });
    }
  }
  return out.slice(0, maxGuides);
}

// A short real example: part of the human EMX1 exon 1 (a classic CRISPR test locus).
export const EXAMPLE_TARGET =
  "GAGTCCGAGCAGAAGAAGAAGGGCTCCCATCACATCAACCGGTGGCGCATTGCCACGAAGCAGGCCAATGGGGAGGACATCGATGTCACCTCCAATGACTAGGGTGGGCAACCACAAACCCACGAGGGCAGAGTGCTGCTTGCTGCTGGCCAGGCCCCTGCGTGGGCCCAAGCTGGACTCTGGCCACTCCCTGGCCAGGCTTTGGGGAGGCCTGGAGTCATGGCCCCACAGGGCTTGAAGCCCGGGGCCGCCATTGACAGAG";
