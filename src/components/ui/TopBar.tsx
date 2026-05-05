// ─── Nudofy Design System v2 · TopBar ───────────────────────────────────────
// Barra superior blanca con borde sutil. Sin fondo oscuro, sin rojos.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import Text from './Text';
import Icon, { IconName } from './Icon';

type Action = {
  icon: IconName;
  onPress: () => void;
  badge?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: Action[];
  /** Contenido libre a la izquierda (ej. greeting multilínea) */
  left?: React.ReactNode;
  /** Ocultar el botón de home aunque haya onBack (ej. pantallas raíz de tab) */
  hideHome?: boolean;
};

export default function TopBar({ title, subtitle, onBack, actions, left, hideHome }: Props) {
  const router = useRouter();

  const showHome = !!onBack && !hideHome;

  function goHome() {
    router.dismissAll();
  }

  return (
    <View style={styles.bar}>
      <View style={styles.leftBlock}>
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="ChevronLeft" size={24} color={colors.ink} />
          </Pressable>
        )}
        {left ? (
          left
        ) : (
          <View style={{ flex: 1 }}>
            {title && <Text variant="heading">{title}</Text>}
            {subtitle && <Text variant="small" color="ink3">{subtitle}</Text>}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {showHome && (
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Ir al inicio"
            hitSlop={8}
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="Home" size={18} color={colors.white} />
          </Pressable>
        )}
        {actions && actions.map((a, i) => (
          <Pressable
            key={i}
            onPress={a.onPress}
            disabled={a.disabled}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel}
            hitSlop={8}
            style={({ pressed }) => [styles.actionBtn, (pressed || a.disabled) && { opacity: 0.6 }]}
          >
            <Icon name={a.icon} size={20} color={a.disabled ? colors.ink3 : colors.ink} />
            {a.badge && <View style={styles.badge} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  leftBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  backBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    marginLeft: -8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  homeBtn: {
    width: 32, height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
    marginRight: space[1],
  },
  actionBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.brand,
    borderWidth: 2, borderColor: colors.white,
  },
});
