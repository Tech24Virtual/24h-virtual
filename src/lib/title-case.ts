/**
 * Title case utility for headings and dynamic titles.
 *
 * Capitalizes the first letter of each significant word. Keeps the following
 * lowercase unless they appear at the start of the string:
 *   a, an, the, and, but, or, for, nor, at, by, from, in, of, on, to, up, with,
 *   as, into, over, onto, per, vs.
 *
 * Preserves punctuation, spacing, and hyphenation. Acronyms (all uppercase
 * tokens of length 2 or more, e.g. API, AML, USA) are kept as is.
 */

const STOP_WORDS = new Set([
  "a", "an", "the",
  "and", "but", "or", "nor", "for", "so", "yet",
  "at", "by", "from", "in", "of", "on", "to", "up", "with",
  "as", "into", "over", "onto", "per", "vs",
]);

const isAcronym = (word: string) =>
  word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word);

const capitalizeWord = (word: string) => {
  if (!word) return word;
  if (isAcronym(word)) return word;
  // Handle hyphenated compounds: capitalize each segment.
  if (word.includes("-")) {
    return word
      .split("-")
      .map((seg) => capitalizeWord(seg))
      .join("-");
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

export function toTitleCase(input: string): string {
  if (!input) return "";
  // Split on spaces while preserving punctuation attached to words.
  const words = input.trim().split(/\s+/);
  return words
    .map((word, idx) => {
      const lower = word.toLowerCase();
      // Strip trailing punctuation for stop-word check.
      const bare = lower.replace(/[^\p{L}]+$/u, "");
      const isStop = STOP_WORDS.has(bare);
      if (isStop && idx !== 0 && idx !== words.length - 1) {
        return lower;
      }
      return capitalizeWord(word);
    })
    .join(" ");
}
