// Datas relativas em pt-BR, com singular e plural certos ("há 1 mês", "há 3 meses").
export function relativo(data: string | number | Date): string {
  const d = new Date(data);
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  const min = Math.floor(seg / 60);
  const h = Math.floor(min / 60);
  const dias = Math.floor(h / 24);
  const p = (n: number, um: string, varios: string) => `há ${n} ${n === 1 ? um : varios}`;
  if (min < 1) return 'agora';
  if (h < 1) return p(min, 'minuto', 'minutos');
  if (dias < 1) return p(h, 'hora', 'horas');
  if (dias === 1) return 'ontem';
  if (dias < 30) return p(dias, 'dia', 'dias');
  if (dias < 365) return p(Math.floor(dias / 30), 'mês', 'meses');
  return p(Math.floor(dias / 365), 'ano', 'anos');
}

/** Rótulo do dia para agrupar listas: Hoje, Ontem, ou a data por extenso. */
export function rotuloDoDia(data: string): string {
  const d = new Date(data);
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86400000);
  const mesmo = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmo(d, hoje)) return 'Hoje';
  if (mesmo(d, ontem)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' });
}

/** 5000 vira "5 000", como no resto do Cerne. */
export const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
