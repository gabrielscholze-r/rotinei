import { Expense, ExpenseCategory } from './types';

export interface ImportRow {
  date: string;       // ISO date
  description: string;
  amount: number;
  category: ExpenseCategory;
  selected: boolean;
}

const CATEGORY_RULES: { keywords: string[]; category: ExpenseCategory }[] = [
  {
    keywords: [
      'padaria', 'mercado', 'supermercado', 'restaurante', 'lanchon', 'pizza',
      'burguer', 'burger', 'ifood', 'rappi', 'sushi', 'alimenta', 'cafe',
      'cafeteria', 'bistro', 'churrasco', 'acougue', 'hortifruti', 'pao',
      'bom jesus', 'teixeira', 'mp *padaria', 'padariateixeira', 'mp *padariateixei',
    ],
    category: 'food',
  },
  {
    keywords: [
      'uber', '99app', 'cabify', 'combustivel', 'gasolina', 'posto',
      'estacionamento', 'onibus', 'metro', 'shell', 'ipiranga', 'petrobrás',
      'petrobras', 'br rede', 'zul', 'semparar', 'autopass', 'recarga',
    ],
    category: 'transport',
  },
  {
    keywords: [
      'farmacia', 'droga', 'laboratorio', 'clinica', 'hospital', 'medico',
      'exame', 'saude', 'nissei', 'raia', 'ultrafarma', 'drogasil',
      'wellhub', 'smartfit', 'academia', 'biofast', 'fleury',
    ],
    category: 'health',
  },
  {
    keywords: [
      'steam', 'netflix', 'spotify', 'youtube', 'cinema', 'theater',
      'gaming', 'nuuvem', 'amazon prime', 'hbo', 'disney', 'apple tv',
      'max ', 'twitch', 'playstation', 'xbox', 'nintendo', 'epicgames',
      'epic games', 'primevideo', 'telecine', 'mambembe', 'jogos',
      'pag*steam',
    ],
    category: 'entertainment',
  },
  {
    keywords: [
      'aluguel', 'condominio', 'energia', 'conta de luz', 'agua ', 'internet',
      'claro ', 'vivo ', 'tim ', 'oi ', 'net ', 'saneamento', 'copel',
      'cemig', 'nacional adm', 'administradora', 'iptu',
    ],
    category: 'housing',
  },
  {
    keywords: [
      'zara', 'renner', 'hering', 'riachuelo', 'c&a', 'cea ', 'calvinkle',
      'reserva', 'centauro', 'nike', 'adidas', 'forum ', 'aramis',
      'lupo ', 'colcci', 'roupas', 'vestuario',
    ],
    category: 'clothing',
  },
  {
    keywords: [
      'escola', 'faculdade', 'curso', 'livro', 'educacao', 'alura',
      'udemy', 'coursera', 'hotmart', 'domestika', 'descomplica',
      'livraria', 'cultura ', 'saraiva',
    ],
    category: 'education',
  },
];

export function detectCategory(title: string): ExpenseCategory {
  const lower = title.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return 'other';
}

function parseAmountBR(raw: string): number {
  const normalized = raw
    .replace(/\u00A0/g, ' ')
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  return parseFloat(normalized);
}

function parseDateBR(raw: string): string {
  // DD/MM/YYYY → YYYY-MM-DDT12:00:00Z
  const parts = raw.trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`;
  }
  return raw.trim() + 'T12:00:00Z';
}

type DetectedFormat =
  | { format: 'nubank'; sep: ',' }
  | { format: 'xp'; sep: ',' | ';' };

function detectFormat(headerRaw: string): DetectedFormat | null {
  const sep: ',' | ';' = headerRaw.includes(';') ? ';' : ',';
  const fields = sep === ';'
    ? headerRaw.split(';').map((f) => f.trim().toLowerCase())
    : splitCSVLine(headerRaw).map((f) => f.trim().toLowerCase());
  const h = fields.join(' ');

  if (h.includes('valor') || h.includes('estabelecimento') || h.includes('portador')) {
    return { format: 'xp', sep };
  }
  if (h.includes('date') || h.includes('title') || h.includes('amount')) {
    return { format: 'nubank', sep: ',' };
  }
  // Nubank fallback: 3 columns with data/date
  if (fields.length === 3 && (h.includes('data') || h.includes('date'))) {
    return { format: 'nubank', sep: ',' };
  }
  return null;
}

export function parseNubankCSV(content: string): ImportRow[] {
  const clean = content.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const detected = detectFormat(lines[0]);
  if (!detected) return [];

  const rows: ImportRow[] = [];

  if (detected.format === 'xp') {
    const { sep } = detected;
    const splitLine = (l: string) =>
      sep === ';' ? l.split(';').map((f) => f.trim()) : splitCSVLine(l).map((f) => f.trim());

    const headerFields = splitLine(lines[0]).map((f) => f.toLowerCase());
    const di = Math.max(0, headerFields.findIndex((f) => f.includes('data') || f.includes('date')));
    const ti = headerFields.findIndex((f) =>
      f.includes('estabelecimento') || f.includes('descri') || f.includes('lancamento')
    );
    const ai = headerFields.findIndex((f) => f.includes('valor') || f.includes('amount'));

    const descCol = ti >= 0 ? ti : 1;
    const amtCol  = ai >= 0 ? ai : 3;

    for (let i = 1; i < lines.length; i++) {
      const fields = splitLine(lines[i]);
      if (fields.length <= Math.max(di, descCol, amtCol)) continue;

      const rawDate   = fields[di];
      const rawTitle  = fields[descCol];
      const rawAmount = fields[amtCol];

      const amount = parseAmountBR(rawAmount);
      if (isNaN(amount) || amount <= 0) continue;
      if (!rawTitle) continue;

      rows.push({
        date: parseDateBR(rawDate),
        description: rawTitle,
        amount,
        category: detectCategory(rawTitle),
        selected: true,
      });
    }
    return rows;
  }

  // Nubank format
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const fields = splitCSVLine(line);
    if (fields.length < 3) continue;

    const [rawDate, rawTitle, rawAmount] = fields;

    const amount = parseFloat(rawAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) continue;

    const isoDate = rawDate.trim() + 'T12:00:00Z';
    const description = rawTitle.trim();
    if (!description) continue;

    rows.push({
      date: isoDate,
      description,
      amount,
      category: detectCategory(description),
      selected: true,
    });
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function importRowsToExpenses(rows: ImportRow[], sectionId?: string): Expense[] {
  return rows
    .filter((r) => r.selected)
    .map((r, i) => ({
      id: `${Date.now()}_${i}`,
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: r.date,
      createdAt: new Date().toISOString(),
      ...(sectionId ? { sectionId } : {}),
    }));
}
