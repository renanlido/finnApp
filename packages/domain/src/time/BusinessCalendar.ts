import { LocalDate } from './LocalDate';

export interface BrazilCalendarOptions {
  /**
   * Inclui Carnaval (segunda e terça), Corpus Christi e 31 de dezembro, que não são feriados nacionais
   * mas são dias sem compensação bancária. Padrão true: o app fala de quando o dinheiro sai da conta.
   */
  bank?: boolean;
  /** Feriados locais por 'MM-DD' (todo ano) ou 'AAAA-MM-DD' (só naquele ano). */
  local?: Record<string, string>;
}

const FIXED: Record<string, string> = {
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Consciência Negra',
  '12-25': 'Natal',
};

/** Domingo de Páscoa (algoritmo gregoriano anônimo, Meeus/Jones/Butcher). */
function easter(year: number): LocalDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return LocalDate.of(year, month, day);
}

/** Dias úteis para saber quando um pagamento realmente sai ou entra na conta. */
export class BusinessCalendar {
  private readonly cache = new Map<number, Map<string, string>>();

  private constructor(
    private readonly bank: boolean,
    private readonly local: Record<string, string>,
  ) {}

  static brazil(options: BrazilCalendarOptions = {}): BusinessCalendar {
    return new BusinessCalendar(options.bank !== false, options.local ?? {});
  }

  holidays(year: number): Map<string, string> {
    const cached = this.cache.get(year);
    if (cached) return cached;
    const out = new Map<string, string>();
    const add = (date: LocalDate, name: string) => out.set(date.toString(), name);
    for (const [md, name] of Object.entries(FIXED)) add(LocalDate.parse(`${year}-${md}`), name);
    const e = easter(year);
    add(e.plusDays(-2), 'Paixão de Cristo');
    if (this.bank) {
      add(e.plusDays(-48), 'Carnaval');
      add(e.plusDays(-47), 'Carnaval');
      add(e.plusDays(60), 'Corpus Christi');
      add(LocalDate.of(year, 12, 31), 'Último dia do ano (sem expediente bancário)');
    }
    for (const [key, name] of Object.entries(this.local)) {
      if (/^\d{2}-\d{2}$/.test(key)) {
        if (key === '02-29' && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) continue;
        add(LocalDate.parse(`${year}-${key}`), name);
      }
      else if (key.startsWith(`${year}-`)) add(LocalDate.parse(key), name);
    }
    this.cache.set(year, out);
    return out;
  }

  holidayName(date: LocalDate): string | undefined {
    return this.holidays(date.year).get(date.toString());
  }

  isHoliday(date: LocalDate): boolean {
    return this.holidayName(date) !== undefined;
  }

  isWeekend(date: LocalDate): boolean {
    return date.dayOfWeek === 0 || date.dayOfWeek === 6;
  }

  isBusinessDay(date: LocalDate): boolean {
    return !this.isWeekend(date) && !this.isHoliday(date);
  }

  /** A própria data se for dia útil; senão, o próximo dia útil. */
  nextBusinessDay(date: LocalDate): LocalDate {
    let d = date;
    while (!this.isBusinessDay(d)) d = d.plusDays(1);
    return d;
  }
}
