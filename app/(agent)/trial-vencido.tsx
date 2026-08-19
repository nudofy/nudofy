// Trial vencido — pantalla bloqueante cuando el período de prueba ha expirado
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Linking, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getPlanConfigs } from '@/lib/planConfig';
import { openMailto } from '@/lib/mailto';
import { colors, space, radius } from '@/theme';
import { Text, Button, Icon } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const PAID_PLANS = ['basic', 'pro', 'agency'];

export default function TrialVencidoScreen() {
  const router = useRouter();
  const { t } = useTranslation('agent');
  const { session } = useAuth();
  const toast = useToast();
  const [plans, setPlans] = useState<{ id: string; name: string; price_monthly: number }[]>([]);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

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

  // Mismo flujo que perfil.tsx:handleChangePlan — abre el checkout de Stripe
  // directamente, sin salir a la web (antes mandaba a nudofy.com/precios, que
  // solo ofrece dar de alta una cuenta NUEVA, así que un trial vencido no
  // tenía ninguna forma real de pagar y reactivar su cuenta).
  async function handleUpgrade(targetPlan: string) {
    if (!session) return;
    setLoadingCheckout(targetPlan);
    const successUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/?checkout=success`
      : 'nudofy://perfil?checkout=success';
    const cancelUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/?checkout=cancel`
      : 'nudofy://perfil';
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-billing-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ targetPlan, successUrl, cancelUrl }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { toast.error(json.error ?? 'Error al iniciar el pago'); return; }
      await Linking.openURL(json.url);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoadingCheckout(null);
    }
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

        {/* Planes — cada uno abre el checkout de Stripe directamente */}
        <View style={styles.plansRow}>
          {plans.map((p, i) => (
            <PlanChip
              key={p.id}
              name={p.name}
              price={t('trial.price_suffix', { price: p.price_monthly })}
              highlighted={i === 1}
              loading={loadingCheckout === p.id}
              disabled={loadingCheckout != null}
              onPress={() => handleUpgrade(p.id)}
            />
          ))}
        </View>

        {/* CTAs */}
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
            onPress={() => openMailto('nudofyapp@gmail.com')}
          >
            nudofyapp@gmail.com
          </Text>
        </Text>
      </View>
    </View>
  );
}

function PlanChip({ name, price, highlighted, loading, disabled, onPress }: {
  name: string; price: string; highlighted?: boolean; loading?: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.planChip,
        highlighted && styles.planChipHighlighted,
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={highlighted ? colors.white : colors.ink} />
      ) : (
        <>
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
        </>
      )}
    </Pressable>
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
