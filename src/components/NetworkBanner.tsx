// ─── NetworkBanner — barra superior cuando no hay conexión ─────────────────
// Aparece animado desde arriba si isOnline === false. Pulsa para reintentar.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetwork } from '@/contexts/NetworkContext';
import { colors, radius, space } from '@/theme';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';

export default function NetworkBanner() {
  const { isOnline, retry } = useNetwork();
  const translateY = useRef(new Animated.Value(-120)).current;
  const [retrying, setRetrying] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isOnline, translateY]);

  if (!visible) return null;

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try { await retry(); } finally { setRetrying(false); }
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.layer, { transform: [{ translateY }] }]}
    >
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [styles.bar, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Sin conexión, pulsa para reintentar"
        >
          <Icon name="WifiOff" size={16} color={colors.white} />
          <Text variant="smallMedium" style={styles.text} numberOfLines={1}>
            {retrying ? 'Reintentando…' : 'Sin conexión · pulsa para reintentar'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9998,
    elevation: 9998,
  },
  bar: {
    backgroundColor: colors.danger,
    marginHorizontal: space[3],
    marginTop: space[1],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  text: { color: colors.white },
});
