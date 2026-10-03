import { Entry } from '../ledger/Entry';
import { Money } from '../money/Money';
import { BusinessCalendar } from '../time/BusinessCalendar';
import { LocalDate } from '../time/LocalDate';
import { YearMonth } from '../time/YearMonth';

export interface RecurrenceSuggestion {
  /** Chave estável do favorecido (descrição normalizada). */
  key: string;
  /** Descrição do pagamento mais recente. */
  description: string;
  account: string;
  category: string;
  /** Mediana dos pagamentos. */
  amount: Money;
  /** Valor muda de mês para mês: mostrar como estimado (~). */
  variable: boolean;
  dayOfMonth: number;
  /** Meses seguidos encontrados. */
  months: number;
  nextDue: LocalDate;
  /** Quando deve sair da conta (próximo dia útil). */
  nextCashDate: LocalDate;
}

export interface DetectorOptions {
  calendar: BusinessCalendar;
  /** Meses seguidos para sugerir (padrão 3). */
  minMonths?: number;
  /** Diferença máxima entre o menor e o maior dia do mês (padrão 5). */
  daySpread?: number;
  /** Variação máxima do valor em relação à mediana (padrão 0,5 = 50%). */
  maxVariation?: number;
}

/** Palavras que dizem o meio de pagamento, não quem recebe. */
const GENERIC = new Set(['pix', 'enviado', 'enviada', 'recebido', 'recebida', 'ted', 'doc', 'transferencia', 'transf', 'pagamento',
  'pgto', 'pag', 'boleto', 'debito', 'deb', 'automatico', 'aut', 'compra', 'qr', 'cod', 'codigo', 'para', 'de']);

/**
 * Chave do favorecido: sem acento, sem caixa, sem códigos curtos (datas, NSU) e sem as palavras do meio
 * de pagamento. Sequências longas de dígitos (CPF, CNPJ, conta) ficam: identificam quem recebe.
 * Vazia quando não sobra nada que identifique alguém.
 */
export function payeeKey(description: string): string {
  return description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b\d{1,6}\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !GENERIC.has(w))
    .join(' ');
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Dia do mês "médio" num círculo de 31 dias: 30, 31 e 1º ficam juntos. */
function circularDay(days: number[]): number {
  const step = (2 * Math.PI) / 31;
  const x = days.reduce((a, d) => a + Math.cos((d - 1) * step), 0);
  const y = days.reduce((a, d) => a + Math.sin((d - 1) * step), 0);
  const angle = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
  return (Math.round(angle / step) % 31) + 1;
}

interface Assigned { entry: Entry; month: YearMonth; offset: number }

/**
 * Acha pagamentos fora do cartão que se repetem todo mês (Pix, boleto, débito) para
 * sugerir que virem conta fixa. Só sugere; quem confirma é a pessoa.
 * Limitação conhecida: o mesmo favorecido pago de contas diferentes conta como dois.
 */
export class RecurrenceDetector {
  private constructor(private readonly options: Required<DetectorOptions>) {}

  static create(options: DetectorOptions): RecurrenceDetector {
    return new RecurrenceDetector({ minMonths: 3, daySpread: 5, maxVariation: 0.5, ...options });
  }

  /** `asOf` = hoje: só sugere o que foi pago neste mês ou no anterior (o que parou não vira conta fixa). */
  detect(entries: readonly Entry[], opts: { asOf: LocalDate; known?: readonly string[] }): RecurrenceSuggestion[] {
    const known = new Set(opts.known ?? []);
    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
      if (e.kind !== 'expense') continue;
      const payee = payeeKey(e.description);
      if (!payee) continue;
      const key = `${e.refs.account}:${payee}`;
      if (known.has(key)) continue;
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }

    const recent = YearMonth.of(opts.asOf).plus(-1);
    const out: RecurrenceSuggestion[] = [];
    for (const [key, list] of groups) {
      const run = this.monthlyRun(list);
      if (!run || run.length < this.options.minMonths) continue;
      const last = run[run.length - 1]!;
      if (last.month.compare(recent) < 0) continue;
      const offsets = run.map((r) => r.offset);
      if (Math.max(...offsets) - Math.min(...offsets) > this.options.daySpread) continue;
      const cents = run.map((r) => r.entry.amount.cents);
      const mid = median(cents);
      if (!cents.every((c) => Math.abs(c - mid) / mid <= this.options.maxVariation)) continue;
      const dayOfMonth = circularDay(run.map((r) => r.entry.date.day));
      const nextDue = last.month.plus(1).day(dayOfMonth);
      out.push({
        key,
        description: last.entry.description,
        account: last.entry.refs.account ?? '',
        category: last.entry.accrual()[0]?.category ?? 'outros',
        amount: Money.ofCents(Math.round(mid)),
        variable: new Set(cents).size > 1,
        dayOfMonth,
        months: run.length,
        nextDue,
        nextCashDate: this.options.calendar.nextBusinessDay(nextDue),
      });
    }
    return out.sort((a, b) => b.months - a.months || b.amount.cents - a.amount.cents);
  }

  /**
   * Cada pagamento vai para o mês do vencimento mais próximo (pago em 1º de junho conta para maio
   * se vence dia 30). Pagamento longe do dia típico fica de fora. Num mês com mais de um pagamento,
   * fica o mais perto do dia e do valor típicos.
   * Devolve a sequência de meses seguidos que termina no mais recente.
   */
  private monthlyRun(list: Entry[]): Assigned[] | null {
    const anchor = circularDay(list.map((e) => e.date.day));
    const typical = median(list.map((e) => e.amount.cents));
    const byMonth = new Map<string, Assigned>();
    for (const entry of list) {
      const own = YearMonth.of(entry.date);
      let best: Assigned | null = null;
      for (const month of [own.plus(-1), own, own.plus(1)]) {
        const offset = entry.date.epochDay - month.day(anchor).epochDay;
        if (!best || Math.abs(offset) < Math.abs(best.offset)) best = { entry, month, offset };
      }
      // Longe demais do dia típico: é outro pagamento ao mesmo favorecido, não a parcela do mês.
      if (Math.abs(best!.offset) > this.options.daySpread) continue;
      const k = best!.month.toString();
      const current = byMonth.get(k);
      const score = (a: Assigned) => Math.abs(a.offset) * 1000 + Math.abs(a.entry.amount.cents - typical) / Math.max(typical, 1);
      if (!current || score(best!) < score(current)) byMonth.set(k, best!);
    }
    const months = [...byMonth.keys()].sort();
    if (months.length === 0) return null;
    const run: Assigned[] = [];
    let cursor = YearMonth.parse(months[months.length - 1]!);
    while (byMonth.has(cursor.toString())) {
      run.unshift(byMonth.get(cursor.toString())!);
      cursor = cursor.plus(-1);
    }
    return run;
  }
}
