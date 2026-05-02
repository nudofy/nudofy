import React from 'react';
import Badge from './ui/Badge';

type OrderStatus = 'draft' | 'confirmed' | 'sent_to_supplier' | 'cancelled' | 'proposal_sent';

const STATUS_MAP: Record<
  OrderStatus,
  { label: string; variant: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }
> = {
  draft:            { label: 'Borrador',          variant: 'neutral' },
  confirmed:        { label: 'Pendiente',          variant: 'warning' },
  sent_to_supplier: { label: 'Enviado',            variant: 'success' },
  cancelled:        { label: 'Cancelado',          variant: 'danger'  },
  proposal_sent:    { label: 'Propuesta enviada',  variant: 'brand'   },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return <Badge label={label} variant={variant} />;
}
