import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import Text from './Text';
import Icon, { IconName } from './Icon';
import Button from './Button';

type Props = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({
  icon = 'Inbox',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={24} color={colors.ink4} />
      </View>
      <Text variant="heading" align="center">{title}</Text>
      {description && (
        <Text variant="body" color="ink3" align="center" style={{ maxWidth: 280 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: space[2] }} />
      )}
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
