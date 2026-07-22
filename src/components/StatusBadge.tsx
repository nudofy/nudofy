import React from 'react';
import { useTranslation } from 'react-i18next';
import Badge from './ui/Badge';

type OrderStatus = 'draft' | 'confirmed' | 'sent_to_supplier' | 'cancelled' | 'proposal_sent';

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  draft:            'neutral',
  confirmed:        'warning',
  sent_to_supplier: 'success',
  cancelled:        'danger',
  proposal_sent:    'brand',
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation('orders');
  const variant = STATUS_VARIANT[status] ?? STATUS_VARIANT.draft;
  return <Badge label={t(`status.${status}`)} variant={variant} />;
}
