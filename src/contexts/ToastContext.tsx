// ─── ToastContext — sistema de notificaciones no bloqueantes ────────────────
// Sustituye Alert.alert para errores y feedback no destructivos.
//
// Uso:
//   const toast = useToast();
//   toast.success('Pedido confirmado');
//   toast.error('No se pudo conectar');
//   toast.info('Borrador guardado');

import React, {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme';
import Icon, { IconName } from '@/components/ui/Icon';
import Text from '@/components/ui/Text';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastConfig = {
  message: string;
  variant: ToastVariant;
  duration?: number; // ms — 0 = manual close
  action?: { label: string; onPress: () => void };
};

type ToastApi = {
  show: (cfg: ToastConfig) => void;
  success: (message: string, opts?: Partial<ToastConfig>) => void;
  error: (message: string, opts?: Partial<ToastConfig>) => void;
  info: (message: string, opts?: Partial<ToastConfig>) => void;
  warning: (message: string, opts?: Partial<ToastConfig>) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const VARIANT_META: Record<ToastVariant, { icon: IconName; color: string; bg: string; border: string }> = {
  success: { icon: 'CircleCheck', color: colors.success, bg: colors.successSoft, border: colors.success },
  error:   { icon: 'CircleAlert', color: colors.danger,  bg: colors.dangerSoft,  border: colors.danger },
  info:    { icon: 'Info',         color: colors.ink2,    bg: colors.surface2,    border: colors.line },
  warning: { icon: 'TriangleAlert',color: colors.warning, bg: colors.warningSoft, border: colors.warning },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback((cfg: ToastConfig) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast(cfg);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const duration = cfg.duration ?? 4000;
    if (duration > 0) {
      hideTimer.current = setTimeout(dismiss, duration);
    }
  }, [translateY, opacity, dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    dismiss,
    success: (message, opts) => show({ message, variant: 'success', ...opts }),
    error:   (message, opts) => show({ message, variant: 'error',   ...opts }),
    info:    (message, opts) => show({ message, variant: 'info',    ...opts }),
    warning: (message, opts) => show({ message, variant: 'warning', ...opts }),
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.layer, { opacity, transform: [{ translateY }] }]}
        >
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <Pressable onPress={dismiss} style={styles.pressable}>
              <View style={[
                styles.toast,
                { backgroundColor: VARIANT_META[toast.variant].bg, borderColor: VARIANT_META[toast.variant].border },
              ]}>
                <Icon
                  name={VARIANT_META[toast.variant].icon}
                  size={20}
                  color={VARIANT_META[toast.variant].color}
                />
                <Text variant="bodyMedium" style={[styles.message, { color: colors.ink }]} numberOfLines={3}>
                  {toast.message}
                </Text>
                {toast.action && (
                  <Pressable
                    onPress={() => { toast.action!.onPress(); dismiss(); }}
                    hitSlop={6}
                    style={styles.actionBtn}
                  >
                    <Text variant="smallMedium" style={{ color: VARIANT_META[toast.variant].color }}>
                      {toast.action.label}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  pressable: {
    paddingHorizontal: space[3],
    paddingTop: Platform.OS === 'android' ? space[3] : space[1],
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius.md,
    borderLeftWidth: 4,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  message: { flex: 1 },
  actionBtn: {
    paddingHorizontal: space[2],
    paddingVertical: 4,
  },
});
