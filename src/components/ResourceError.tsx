// ─── ResourceError — pantalla cuando un recurso no carga ──────────────────
// Útil cuando un .single() devuelve null (RLS denegado, id inválido, etc.)
// o cuando hay un error de red. Reemplaza el clásico "Cargando…" infinito.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, space } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';

type Props = {
  topBarTitle?: string;
  title?: string;
  message?: string;
  detail?: string | null;
  onBack: () => void;
  onRetry?: () => void;
};

export default function ResourceError({
  topBarTitle = 'Recurso',
  title = 'No se pudo cargar',
  message = 'No existe o no tienes permisos para verlo.',
  detail,
  onBack,
  onRetry,
}: Props) {
  return (
    <Screen>
      <TopBar title={topBarTitle} onBack={onBack} />
      <View style={styles.wrap}>
        <Icon name="CircleAlert" size={32} color={colors.ink3} />
        <Text variant="heading" align="center">{title}</Text>
        <Text variant="small" color="ink3" align="center">{message}</Text>
        {detail ? (
          <Text variant="caption" color="ink4" align="center">{detail}</Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="Volver" variant="secondary" onPress={onBack} />
          {onRetry ? <Button label="Reintentar" onPress={onRetry} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[3] },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[4] },
});
