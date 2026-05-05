// Trial vencido — pantalla bloqueante cuando el período de prueba ha expirado
import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Text, Button, Icon } from '@/components/ui';

export default function TrialVencidoScreen() {
  const router = useRouter();

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
          Tu período de prueba ha terminado
        </Text>
        <Text variant="small" color="ink3" align="center" style={styles.subtitle}>
          Tu acceso gratuito a Nudofy ha expirado.{'\n'}
          Para seguir gestionando tus pedidos y clientes, elige un plan de pago.
        </Text>

        {/* Planes resumen */}
        <View style={styles.plansRow}>
          <PlanChip name="Básico" price="9 €/mes" />
          <PlanChip name="Pro" price="19 €/mes" highlighted />
          <PlanChip name="Agencia" price="39 €/mes" />
        </View>

        {/* CTAs */}
        <Button
          label="Ver planes y precios"
          onPress={handleUpgrade}
          fullWidth
        />
        <Button
          label="Cerrar sesión"
          variant="secondary"
          onPress={handleSignOut}
          fullWidth
        />

        <Text variant="caption" color="ink4" align="center" style={{ marginTop: space[3] }}>
          ¿Tienes dudas? Escríbenos a{' '}
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
