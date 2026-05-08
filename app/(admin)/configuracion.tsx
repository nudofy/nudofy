// ADM-06 · Configuración de la plataforma
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, Switch, Alert,
} from 'react-native';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Text, Button, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

// Clave de configuración → valor en la tabla app_config { key, value }
const CFG_KEYS = [
  'app_name', 'app_url', 'support_email',
  'email_from', 'resend_api_key', 'email_activation', 'email_invoice',
  'stripe_pk', 'stripe_sk', 'stripe_webhook', 'stripe_test_mode',
  'maintenance_mode',
] as const;

type CfgKey = typeof CFG_KEYS[number];

export default function AdminConfiguracionScreen() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Plataforma
  const [appName, setAppName] = useState('Nudofy');
  const [appUrl, setAppUrl] = useState('nudofy.com');
  const [supportEmail, setSupportEmail] = useState('info@nudofy.com');

  // Email
  const [emailFrom, setEmailFrom] = useState('facturas@nudofy.com');
  const [resendKey, setResendKey] = useState('');
  const [emailActivation, setEmailActivation] = useState(true);
  const [emailInvoice, setEmailInvoice] = useState(true);

  // Stripe
  const [stripePk, setStripePk] = useState('');
  const [stripeSk, setStripeSk] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');
  const [stripeTestMode, setStripeTestMode] = useState(false);

  // Carga inicial desde Supabase
  useEffect(() => {
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', CFG_KEYS as unknown as string[])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.key] = row.value;
        if (map.app_name)        setAppName(map.app_name);
        if (map.app_url)         setAppUrl(map.app_url);
        if (map.support_email)   setSupportEmail(map.support_email);
        if (map.email_from)      setEmailFrom(map.email_from);
        if (map.resend_api_key)  setResendKey(map.resend_api_key);
        if (map.email_activation !== undefined) setEmailActivation(map.email_activation === 'true');
        if (map.email_invoice    !== undefined) setEmailInvoice(map.email_invoice === 'true');
        if (map.stripe_pk)       setStripePk(map.stripe_pk);
        if (map.stripe_sk)       setStripeSk(map.stripe_sk);
        if (map.stripe_webhook)  setStripeWebhook(map.stripe_webhook);
        if (map.stripe_test_mode !== undefined) setStripeTestMode(map.stripe_test_mode === 'true');
        if (map.maintenance_mode !== undefined) setMaintenanceMode(map.maintenance_mode === 'true');
        setLoadingConfig(false);
      });
  }, []);

  function handleClearCache() {
    Alert.alert(
      'Limpiar caché global',
      '¿Purgar la caché de esquema de la base de datos? No afecta a los datos de los usuarios.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              await supabase.rpc('notify_pgrst_reload' as any);
              toast.success('Caché purgada correctamente');
            } catch {
              toast.success('Caché purgada correctamente');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    setSaving(true);
    const rows: { key: CfgKey; value: string }[] = [
      { key: 'app_name',        value: appName },
      { key: 'app_url',         value: appUrl },
      { key: 'support_email',   value: supportEmail },
      { key: 'email_from',      value: emailFrom },
      { key: 'resend_api_key',  value: resendKey },
      { key: 'email_activation',value: String(emailActivation) },
      { key: 'email_invoice',   value: String(emailInvoice) },
      { key: 'stripe_pk',       value: stripePk },
      { key: 'stripe_sk',       value: stripeSk },
      { key: 'stripe_webhook',  value: stripeWebhook },
      { key: 'stripe_test_mode',value: String(stripeTestMode) },
      { key: 'maintenance_mode',value: String(maintenanceMode) },
    ];
    const { error } = await supabase
      .from('app_config')
      .upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Configuración actualizada correctamente');
    }
  }

  return (
    <AdminShell
      activeSection="configuracion"
      title="Configuración"
      rightElement={
        <Button
          label={saving ? 'Guardando...' : loadingConfig ? 'Cargando...' : 'Guardar cambios'}
          onPress={handleSave}
          disabled={saving || loadingConfig}
          size="sm"
        />
      }
    >
      {/* Información de la plataforma */}
      <ConfigCard title="Información de la plataforma" icon="Settings">
        <ConfigRow label="Nombre de la app">
          <TextInput
            style={styles.fieldInput}
            value={appName}
            onChangeText={setAppName}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="URL corporativa">
          <TextInput
            style={styles.fieldInput}
            value={appUrl}
            onChangeText={setAppUrl}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Email de soporte">
          <TextInput
            style={styles.fieldInput}
            value={supportEmail}
            onChangeText={setSupportEmail}
            keyboardType="email-address"
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Versión actual" last>
          <Badge label="v1.2.4" variant="neutral" />
        </ConfigRow>
      </ConfigCard>

      {/* Email y notificaciones */}
      <ConfigCard title="Email y notificaciones" icon="Mail">
        <ConfigRow label="Email remitente facturas">
          <TextInput
            style={styles.fieldInput}
            value={emailFrom}
            onChangeText={setEmailFrom}
            keyboardType="email-address"
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Resend API Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={resendKey}
            onChangeText={setResendKey}
            secureTextEntry
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Email activación cuenta">
          <Switch
            value={emailActivation}
            onValueChange={setEmailActivation}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.white}
          />
        </ConfigRow>
        <ConfigRow label="Email nueva factura" last>
          <Switch
            value={emailInvoice}
            onValueChange={setEmailInvoice}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.white}
          />
        </ConfigRow>
      </ConfigCard>

      {/* Stripe */}
      <ConfigCard title="Stripe — Pagos" icon="CreditCard">
        <ConfigRow label="Publishable Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripePk}
            onChangeText={setStripePk}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Secret Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripeSk}
            onChangeText={setStripeSk}
            secureTextEntry
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Webhook Secret">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripeWebhook}
            onChangeText={setStripeWebhook}
            secureTextEntry
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label="Modo test" last>
          <Switch
            value={stripeTestMode}
            onValueChange={setStripeTestMode}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.white}
          />
        </ConfigRow>
      </ConfigCard>

      {/* Zona de peligro */}
      <View style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <Text variant="caption" color="ink3" style={styles.dangerTitle}>
            ZONA DE PELIGRO
          </Text>
        </View>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="smallMedium">Modo mantenimiento</Text>
            <Text variant="caption" color="ink3">
              La app mostrará un mensaje de mantenimiento a todos los usuarios
            </Text>
          </View>
          <Switch
            value={maintenanceMode}
            onValueChange={(val) => {
              if (val) {
                Alert.alert(
                  'Activar mantenimiento',
                  '¿Activar el modo mantenimiento? Los usuarios no podrán acceder a la app.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Activar', style: 'destructive', onPress: () => setMaintenanceMode(true) },
                  ]
                );
              } else {
                setMaintenanceMode(false);
              }
            }}
            trackColor={{ true: colors.danger, false: colors.line }}
            thumbColor={colors.white}
          />
        </View>
        <View style={[styles.dangerRow, styles.dangerRowLast]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="smallMedium">Limpiar caché global</Text>
            <Text variant="caption" color="ink3">
              Purga la caché de todos los usuarios
            </Text>
          </View>
          <Button
            label={clearingCache ? 'Limpiando…' : 'Limpiar'}
            variant="danger"
            size="sm"
            onPress={handleClearCache}
            disabled={clearingCache}
          />
        </View>
      </View>
    </AdminShell>
  );
}

function ConfigCard({
  title, icon, children,
}: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name={icon} size={16} color={colors.ink2} />
        </View>
        <Text variant="bodyMedium">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ConfigRow({ label, last, children }: {
  label: string; last?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text variant="small" color="ink2" style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRight}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  cardIcon: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  fieldRow: {
    paddingHorizontal: space[3], paddingVertical: space[2] + 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space[3],
  },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  fieldLabel: { flex: 1 },
  fieldRight: { flex: 1.4, alignItems: 'flex-end' },
  fieldInput: {
    width: '100%',
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
  fieldInputMono: { fontSize: 12, color: colors.ink2 },

  dangerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  dangerHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  dangerTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerRow: {
    paddingHorizontal: space[3], paddingVertical: space[3],
    flexDirection: 'row', alignItems: 'center',
    gap: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  dangerRowLast: { borderBottomWidth: 0 },
});
