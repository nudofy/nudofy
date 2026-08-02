// ─── Nudofy Design System v2 · TopBar ───────────────────────────────────────
// Barra superior blanca con borde sutil. Sin fondo oscuro, sin rojos.

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import Text from './Text';
import Icon, { IconName } from './Icon';

// react-native-web descarta el prop `title` en View/Pressable (no esta en su
// lista de props permitidas) - por eso accessibilityLabel no basta para que
// aparezca un tooltip nativo al pasar el raton en web. `display: contents`
// para que el <span> no afecte el layout flex del Pressable que envuelve.
function WebTitle({ label, children }: { label?: string; children: React.ReactNode }) {
  if (Platform.OS !== 'web' || !label) return <>{children}</>;
  return React.createElement('span', { title: label, style: { display: 'contents' } }, children);
}

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
          <WebTitle label="Volver">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Icon name="ChevronLeft" size={24} color={colors.ink} />
            </Pressable>
          </WebTitle>
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
          <WebTitle label="Ir al inicio">
            <Pressable
              onPress={goHome}
              accessibilityRole="button"
              accessibilityLabel="Ir al inicio"
              hitSlop={8}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            >
              <Icon name="LayoutGrid" size={20} color={colors.ink} />
            </Pressable>
          </WebTitle>
        )}
        {actions && actions.map((a, i) => (
          <WebTitle key={i} label={a.accessibilityLabel}>
            <Pressable
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
          </WebTitle>
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
