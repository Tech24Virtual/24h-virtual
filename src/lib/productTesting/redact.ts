/**
 * PII / secret redaction helpers used by Capture-for-chat.
 * Scrubs strings, deep objects, and DOM text nodes before screenshot/export.
 */

// Order matters: longer/more-specific patterns first.
const PATTERNS: Array<{ name: string; re: RegExp; replace: string }> = [
  // JWT (three base64url segments)
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replace: '[REDACTED_JWT]' },
  // OpenAI / generic sk- / pk_ / rk_ keys
  { name: 'openai', re: /\bsk-[A-Za-z0-9_-]{16,}\b/g, replace: '[REDACTED_KEY]' },
  { name: 'stripe', re: /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g, replace: '[REDACTED_KEY]' },
  // GitHub tokens
  { name: 'github', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, replace: '[REDACTED_KEY]' },
  // AWS access key id
  { name: 'aws', re: /\bAKIA[0-9A-Z]{16}\b/g, replace: '[REDACTED_KEY]' },
  // Generic Bearer tokens
  { name: 'bearer', re: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/g, replace: 'Bearer [REDACTED]' },
  // Long hex/base64 secrets (40+ chars) — conservative
  { name: 'hex', re: /\b[A-Fa-f0-9]{40,}\b/g, replace: '[REDACTED_HEX]' },
  // Email
  { name: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replace: '[REDACTED_EMAIL]' },
  // Phone numbers (international + NANP-style). Conservative to avoid IDs.
  {
    name: 'phone',
    re: /(?<!\w)(\+?\d[\d\s().-]{8,}\d)(?!\w)/g,
    replace: '[REDACTED_PHONE]',
  },
];

export function redactString(input: string): string {
  if (!input) return input;
  let out = input;
  for (const { re, replace } of PATTERNS) {
    out = out.replace(re, replace);
  }
  return out;
}

export function redactDeep<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (Array.isArray(value)) return value.map(redactDeep) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Mask whole values for sensitive keys
      if (/token|secret|api[_-]?key|authorization|cookie|password/i.test(k) && typeof v === 'string') {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

/**
 * Walk all visible text nodes under `root`, redacting their content in place.
 * Returns a restore() function that puts the original text back.
 */
export function redactDomTextNodes(root: HTMLElement): () => void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const changes: Array<{ node: Text; original: string }> = [];
  let n: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((n = walker.nextNode())) {
    const t = n as Text;
    const original = t.nodeValue ?? '';
    const redacted = redactString(original);
    if (redacted !== original) {
      changes.push({ node: t, original });
      t.nodeValue = redacted;
    }
  }
  // Also redact common attribute values (input values, alt, title, placeholder, aria-label)
  const attrChanges: Array<{ el: Element; attr: string; original: string }> = [];
  const attrs = ['value', 'placeholder', 'title', 'alt', 'aria-label'];
  root.querySelectorAll<HTMLElement>('input,textarea,[title],[alt],[aria-label],[placeholder]').forEach((el) => {
    for (const a of attrs) {
      const v = (el as HTMLInputElement).getAttribute?.(a);
      if (typeof v === 'string' && v) {
        const r = redactString(v);
        if (r !== v) {
          attrChanges.push({ el, attr: a, original: v });
          el.setAttribute(a, r);
          if (a === 'value' && (el as HTMLInputElement).value !== undefined) {
            (el as HTMLInputElement).value = r;
          }
        }
      }
    }
  });

  return () => {
    for (const { node, original } of changes) node.nodeValue = original;
    for (const { el, attr, original } of attrChanges) {
      el.setAttribute(attr, original);
      if (attr === 'value' && (el as HTMLInputElement).value !== undefined) {
        (el as HTMLInputElement).value = original;
      }
    }
  };
}
