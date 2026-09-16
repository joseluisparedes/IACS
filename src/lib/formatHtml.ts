import DOMPurify from 'dompurify';

/**
 * Parses and sanitizes text that may contain HTML tags (like <b>, <strong>)
 * or markdown bold (**text**), allowing bold and italic styling safely.
 */
export function formatHtmlText(rawText?: string, fallback = ""): string {
  if (!rawText) return fallback;
  let text = String(rawText).trim();

  // Transform markdown bold **text** to <strong>text</strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Clean up any stray or orphan leading/trailing asterisks (e.g. "** Implementar...")
  text = text.replace(/^\s*\*\*\s*/, '').replace(/\s*\*\*\s*$/, '');

  // Sanitize with DOMPurify allowing only safe inline formatting tags
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'span', 'u', 'sub', 'sup'],
    ALLOWED_ATTR: ['class', 'style']
  });
}

/**
 * Strips all HTML tags and markdown asterisks for plain-text contexts (e.g. tooltip title attributes).
 */
export function stripHtml(rawText?: string, fallback = ""): string {
  if (!rawText) return fallback;
  return String(rawText)
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*/g, '')
    .trim() || fallback;
}

/**
 * Pre-processes markdown strings (such as AI chat text) so that any raw HTML
 * bold/italic tags (<b>, <strong>, <i>, <em>) are converted to markdown syntax
 * before passing into <ReactMarkdown />.
 */
export function parseHtmlToMarkdown(text?: string): string {
  if (!text) return "";
  return text
    .replace(/<\s*b\s*>(.*?)<\s*\/\s*b\s*>/gi, '**$1**')
    .replace(/<\s*strong\s*>(.*?)<\s*\/\s*strong\s*>/gi, '**$1**')
    .replace(/<\s*i\s*>(.*?)<\s*\/\s*i\s*>/gi, '*$1*')
    .replace(/<\s*em\s*>(.*?)<\s*\/\s*em\s*>/gi, '*$1*');
}
