import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

type OrderStatus = 'draft' | 'confirmed' | 'sent_to_supplier' | 'cancelled';

const STATUS_MAP: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  draft: { label: 'Borrador', bg: colors.borderLight, color: colors.textLight },
  confirmed: { label: 'Pendiente', bg: colors.amberLight, color: colors.amber },
  sent_to_supplier: { label: 'Enviado', bg: colors.greenLight, color: colors.green },
  cancelled: { label: 'Cancelado', bg: colors.redLight, color: colors.red },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, bg, color } = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: '500',
  },
});
