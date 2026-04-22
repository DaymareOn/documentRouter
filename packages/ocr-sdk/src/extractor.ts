import type { DocumentMetadata } from '@vibe-router/shared-types';

const DATE_PATTERNS = [
  /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/,
  /\b(\d{2}[-/]\d{2}[-/]\d{4})\b/,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
];

const AMOUNT_PATTERN = /(?:USD|EUR|GBP|[\$€£])\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/i;
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
};

// Non-backtracking patterns: capture up to 80 non-newline chars then stop at a clear delimiter.
const SENDER_PATTERNS = [
  /(?:from|sender|issued by)[:\s]+([^\n,]{1,80})(?:,|\n|$)/i,
  /^([A-Z][^\n]{1,79})\n/m,
];

const RECIPIENT_PATTERNS = [
  /(?:to|recipient|bill to|ship to)[:\s]+([^\n,]{1,80})(?:,|\n|$)/i,
  /(?:attn|attention)[:\s]+([^\n,]{1,80})(?:,|\n|$)/i,
];

const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  en: /\b(?:the|and|invoice|payment|amount)\b/i,
  de: /\b(?:und|Rechnung|Betrag|Zahlung)\b/,
  fr: /\b(?:et|facture|montant|paiement)\b/i,
  es: /\b(?:factura|pago|importe|cantidad)\b/i,
};

export function extractMetadata(text: string): Partial<DocumentMetadata> {
  const metadata: Partial<DocumentMetadata> = {
    keywords: extractKeywords(text),
    isEncrypted: false,
  };

  const date = extractDate(text);
  if (date) metadata.date = date;

  const amountResult = extractAmount(text);
  if (amountResult) {
    metadata.amount = amountResult.amount;
    metadata.currency = amountResult.currency;
  }

  const sender = extractWithPatterns(text, SENDER_PATTERNS);
  if (sender) metadata.sender = sender.trim();

  const recipient = extractWithPatterns(text, RECIPIENT_PATTERNS);
  if (recipient) metadata.recipient = recipient.trim();

  const language = detectLanguage(text);
  if (language) metadata.language = language;

  return metadata;
}

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

function extractAmount(text: string): { amount: number; currency: string } | undefined {
  const match = text.match(AMOUNT_PATTERN);
  if (!match) return undefined;

  const rawSymbol = match[0].match(/USD|EUR|GBP|[\$€£]/i)?.[0] || '';
  const currency = CURRENCY_SYMBOLS[rawSymbol.toUpperCase()] || CURRENCY_SYMBOLS[rawSymbol] || 'USD';
  const amount = parseFloat(match[1].replace(/[,\s]/g, ''));

  if (isNaN(amount)) return undefined;
  return { amount, currency };
}

function extractWithPatterns(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'may', 'now', 'say', 'she', 'too', 'use', 'was', 'way',
    'who', 'did', 'its', 'let', 'put', 'see', 'set', 'of', 'to', 'in',
    'is', 'it', 'be', 'as', 'at', 'so', 'if', 'or', 'an', 'a',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function detectLanguage(text: string): string | undefined {
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(text)) return lang;
  }
  return undefined;
}
