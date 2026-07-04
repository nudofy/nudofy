import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import Text from './Text';
import Icon from './Icon';
import Button from './Button';

type Props = {
  requiredPlan: string;
  title?: string;
  description?: string;
};

export default function FeatureLock({
  requiredPlan,
  title = `Función disponible desde el plan ${requiredPlan}`,
  description = 'Mejora tu plan para desbloquear esta funcionalidad.',
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name="Lock" size={24} color={colors.ink4} />
      </View>
      <Text variant="heading" align="center">{title}</Text>
      <Text variant="body" color="ink3" align="center" style={{ maxWidth: 280 }}>
        {description}
      </Text>
      <Button
        label="Ver planes y precios"
        onPress={() => Linking.openURL('https://nudofy.app/precios')}
        style={{ marginTop: space[2] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: space[10],
    paddingHorizontal: space[5],
    alignItems: 'center',
    gap: space[3],
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space[1],
  },
});
