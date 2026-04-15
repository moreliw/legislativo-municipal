/**
 * Centralised status display configuration.
 * Uses Tailwind CSS-variable-backed classes (theme-aware).
 */

export interface StatusStyle {
  label: string
  /** Tailwind classes for a badge (bg + text) */
  badge: string
  /** Tailwind text class only */
  text: string
  /** Hex colour for dot indicators */
  dot: string
}

export const STATUS_CONFIG: Record<string, StatusStyle> = {
  RASCUNHO:    { label: 'Rascunho',     badge: 'bg-surface-2 text-fg-3',                dot: 'var(--text-3)',  text: 'text-fg-3' },
  EM_ELABORACAO:{ label: 'Em elaboração',badge: 'bg-surface-2 text-fg-2',               dot: 'var(--text-2)',  text: 'text-fg-2' },
  PROTOCOLADO: { label: 'Protocolado',  badge: 'bg-brand-blue-soft text-brand-blue',    dot: 'var(--blue)',    text: 'text-brand-blue' },
  EM_ANALISE:  { label: 'Em análise',   badge: 'bg-brand-purple-soft text-brand-purple',dot: 'var(--purple)',  text: 'text-brand-purple' },
  EM_COMISSAO: { label: 'Em comissão',  badge: 'bg-brand-purple-soft text-brand-purple',dot: 'var(--purple)',  text: 'text-brand-purple' },
  AGUARDANDO_PARECER_JURIDICO: {
    label: 'Ag. Jurídico',
    badge: 'bg-brand-amber-soft text-brand-amber',
    dot:   'var(--amber)',
    text:  'text-brand-amber',
  },
  EM_PAUTA:    { label: 'Em pauta',     badge: 'bg-brand-amber-soft text-brand-amber',  dot: 'var(--amber)',   text: 'text-brand-amber' },
  EM_VOTACAO:  { label: 'Em votação',   badge: 'bg-brand-amber-soft text-brand-amber',  dot: 'var(--amber)',   text: 'text-brand-amber' },
  APROVADO:    { label: 'Aprovado',     badge: 'bg-brand-green-soft text-brand-green',  dot: 'var(--green)',   text: 'text-brand-green' },
  REJEITADO:   { label: 'Rejeitado',    badge: 'bg-brand-red-soft text-brand-red',      dot: 'var(--red)',     text: 'text-brand-red' },
  DEVOLVIDO:   { label: 'Devolvido',    badge: 'bg-brand-red-soft text-brand-red',      dot: 'var(--red)',     text: 'text-brand-red' },
  SUSPENSO:    { label: 'Suspenso',     badge: 'bg-brand-red-soft text-brand-red',      dot: 'var(--red)',     text: 'text-brand-red' },
  PUBLICADO:   { label: 'Publicado',    badge: 'bg-brand-green-soft text-brand-green',  dot: 'var(--green)',   text: 'text-brand-green' },
  ARQUIVADO:   { label: 'Arquivado',    badge: 'bg-surface-2 text-fg-3',               dot: 'var(--text-3)',  text: 'text-fg-3' },
  RETIRADO:    { label: 'Retirado',     badge: 'bg-surface-2 text-fg-3',               dot: 'var(--text-3)',  text: 'text-fg-3' },
}

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_CONFIG[status] ?? {
    label: status,
    badge: 'bg-surface-2 text-fg-3',
    dot:   'var(--text-3)',
    text:  'text-fg-3',
  }
}
