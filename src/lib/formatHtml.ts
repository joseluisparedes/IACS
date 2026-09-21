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
 * tags (paragraphs, line breaks, headings, bold, italic, lists, codes, entities)
 * are converted into clean markdown syntax before passing into <ReactMarkdown />.
 */
export function parseHtmlToMarkdown(text?: string): string {
  if (!text) return "";
  let md = String(text);

  // Convert HTML line breaks
  md = md.replace(/<\s*br\s*\/?>/gi, '\n');

  // Convert paragraph endings and startings
  md = md.replace(/<\s*\/p\s*>/gi, '\n\n');
  md = md.replace(/<\s*p[^>]*>/gi, '');

  // Convert headings
  md = md.replace(/<\s*h1[^>]*>(.*?)<\s*\/h1\s*>/gi, '\n# $1\n\n');
  md = md.replace(/<\s*h2[^>]*>(.*?)<\s*\/h2\s*>/gi, '\n## $1\n\n');
  md = md.replace(/<\s*h3[^>]*>(.*?)<\s*\/h3\s*>/gi, '\n### $1\n\n');
  md = md.replace(/<\s*h4[^>]*>(.*?)<\s*\/h4\s*>/gi, '\n#### $1\n\n');
  md = md.replace(/<\s*h5[^>]*>(.*?)<\s*\/h5\s*>/gi, '\n##### $1\n\n');
  md = md.replace(/<\s*h6[^>]*>(.*?)<\s*\/h6\s*>/gi, '\n###### $1\n\n');

  // Convert bold and italics
  md = md.replace(/<\s*b\s*>(.*?)<\s*\/\s*b\s*>/gi, '**$1**');
  md = md.replace(/<\s*strong\s*>(.*?)<\s*\/\s*strong\s*>/gi, '**$1**');
  md = md.replace(/<\s*i\s*>(.*?)<\s*\/\s*i\s*>/gi, '*$1*');
  md = md.replace(/<\s*em\s*>(.*?)<\s*\/\s*em\s*>/gi, '*$1*');

  // Convert strike-through
  md = md.replace(/<\s*(?:s|strike|del)\s*>(.*?)<\s*\/(?:s|strike|del)\s*>/gi, '~~$1~~');

  // Convert lists
  md = md.replace(/<\s*li[^>]*>(.*?)<\s*\/li\s*>/gi, '\n- $1');
  md = md.replace(/<\s*\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Convert horizontal rules
  md = md.replace(/<\s*hr\s*\/?>/gi, '\n\n---\n\n');

  // Convert code blocks and inline code
  md = md.replace(/<\s*pre\s*>\s*<\s*code[^>]*>([\s\S]*?)<\s*\/code\s*>\s*<\s*\/pre\s*>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<\s*code[^>]*>(.*?)<\s*\/code\s*>/gi, '`$1`');

  // Convert blockquotes
  md = md.replace(/<\s*blockquote[^>]*>([\s\S]*?)<\s*\/blockquote\s*>/gi, '\n> $1\n');

  // Convert links
  md = md.replace(/<\s*a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\s*\/a\s*>/gi, '[$2]($1)');

  // Strip generic containers like <div>, <span>, <section> without losing inner content
  md = md.replace(/<\s*\/?(?:div|span|section|article)[^>]*>/gi, '');

  // Decode standard HTML entities
  md = md.replace(/&nbsp;/gi, ' ')
         .replace(/&amp;/gi, '&')
         .replace(/&lt;/gi, '<')
         .replace(/&gt;/gi, '>')
         .replace(/&quot;/gi, '"')
         .replace(/&#39;/gi, "'");

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * Formats chat message markdown for display in assistant and sandbox interfaces:
 * 1. Converts HTML tags into Markdown syntax via parseHtmlToMarkdown.
 * 2. Unpacks inline question sequences (e.g. ": (1) ...; y (2) ...") into clean paragraphs.
 * 3. Preserves single line breaks as Markdown line breaks (trailing double spaces)
 *    so text doesn't collapse into a single run-on block in CommonMark.
 */
export function formatChatMarkdown(text?: string): string {
  if (!text) return "";
  let md = parseHtmlToMarkdown(text);
  md = md.replace(/\r\n/g, '\n');

  // If text has inline numbered items like "puntos críticos: (1) ¿tienes...?; y (2) ¿cómo...?"
  // split them into clear paragraphs if they are not already on new lines
  md = md.replace(/([:.]|\bcríticos\b)\s+(\([1-9]\)|\b[1-9]\.)\s+/gi, '$1\n\n$2 ');
  md = md.replace(/([?;])\s+(?:y\s+)?(\([2-9]\)|\b[2-9]\.)\s+/gi, '$1\n\n$2 ');

  // Convert single line breaks between non-empty lines into markdown hard breaks (trailing 2 spaces)
  md = md.replace(/([^\n])\n([^\n])/g, '$1  \n$2');

  return md.trim();
}

