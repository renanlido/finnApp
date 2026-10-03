import { LocalDate } from '../time/LocalDate';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "1º out", "12 out": a data curta da interface. */
export function shortDate(date: LocalDate): string {
  return `${date.day === 1 ? '1º' : date.day} ${MONTHS[date.month - 1]}`;
}
