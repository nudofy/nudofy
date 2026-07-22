// Trial vencido — pantalla bloqueante cuando el período de prueba ha expirado
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getPlanConfigs } from '@/lib/planConfig';
import { colors, space, radius } from '@/theme';
import { Text, Button, Icon } from '@/components/ui';

const PAID_PLANS = ['basic', 'pro', 'agency'];

export default function TrialVencidoScreen() {
  const router = useRouter();
  const { t } = useTranslation('agent');
  const [plans, setPlans] = useState<{ id: string; name: string; price_monthly: number }[]>([]);

  useEffect(() => {
    getPlanConfigs().then(all => {
      const visible = all
        .filter(p => PAID_PLANS.includes(p.id))
        .sort((a, b) => a.price_monthly - b.price_monthly);
      setPlans(visible);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login' as any);
  }

  function handleUpgrade() {
    Linking.openURL('https://nudofy.app/precios');
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Icono */}
        <View style={styles.iconWrap}>
          <Icon name="Clock" size={32} color={colors.warning} />
        </View>

        {/* Título */}
        <Text variant="heading" align="center" style={styles.title}>
          {t('trial.title')}
        </Text>
        <Text variant="small" color="ink3" align="center" style={styles.subtitle}>
          {t('trial.subtitle')}
        </Text>

        {/* Planes resumen */}
        <View style={styles.plansRow}>
          {plans.map((p, i) => (
            <PlanChip
              key={p.id}
              name={p.name}
              price={t('trial.price_suffix', { price: p.price_monthly })}
              highlighted={i === 1}
            />
          ))}
        </View>

        {/* CTAs */}
        <Button
          label={t('trial.view_plans')}
          onPress={handleUpgrade}
          fullWidth
        />
        <Button
          label={t('trial.sign_out')}
          variant="secondary"
          onPress={handleSignOut}
          fullWidth
        />

        <Text variant="caption" color="ink4" align="center" style={{ marginTop: space[3] }}>
          {t('trial.questions')}{' '}
          <Text
            variant="caption"
            color="ink2"
            onPress={() => Linking.openURL('mailto:nudofyapp@gmail.com')}
          >
            nudofyapp@gmail.com
          </Text>
        </Text>
      </View>
    </View>
  );
}

function PlanChip({ name, price, highlighted }: { name: string; price: string; highlighted?: boolean }) {
  return (
    <View style={[styles.planChip, highlighted && styles.planChipHighlighted]}>
      <Text
        variant="smallMedium"
        style={{ color: highlighted ? colors.white : colors.ink }}
      >
        {name}
      </Text>
      <Text
        variant="caption"
        style={{ color: highlighted ? colors.white : colors.ink3, marginTop: 2 }}
      >
        {price}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[5],
    gap: space[3],
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.warning + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[1],
  },
  title: { marginBottom: space[1] },
  subtitle: { lineHeight: 20 },
  plansRow: {
    flexDirection: 'row',
    gap: space[2],
    width: '100%',
  },
  planChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space[2] + 2,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  planChipHighlighted: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
