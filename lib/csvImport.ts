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

export function parseNubankCSV(content: string): ImportRow[] {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  if (!header.includes('date') && !header.includes('data')) return [];

  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Handle quoted fields
    const fields = splitCSVLine(line);
    if (fields.length < 3) continue;

    const [rawDate, rawTitle, rawAmount] = fields;

    const amount = parseFloat(rawAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) continue; // skip credits/payments

    // Normalize date: YYYY-MM-DD → ISO
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

export function importRowsToExpenses(rows: ImportRow[]): Expense[] {
  return rows
    .filter((r) => r.selected)
    .map((r, i) => ({
      id: `${Date.now()}_${i}`,
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: r.date,
      createdAt: new Date().toISOString(),
    }));
}
