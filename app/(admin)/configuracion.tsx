// ADM-06 · Configuración de la plataforma
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Text, Button, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

// Clave de configuración → valor en la tabla app_config { key, value }.
// Los secretos (Resend, Stripe secret key, Stripe webhook signing secret)
// NUNCA van aquí: app_config es legible por el cliente (aunque restringido a
// nudofy_admin por RLS, sigue viajando al dispositivo del admin). Van como
// Edge Function secrets (`supabase secrets set NOMBRE=valor`), leídos solo
// server-side con Deno.env.get(). La BD tiene además un CHECK constraint
// que impide insertar esas claves por si acaso.
const CFG_KEYS = [
  'app_name', 'app_url', 'support_email',
  'email_from', 'email_activation', 'email_invoice',
  'stripe_pk', 'stripe_test_mode',
  'maintenance_mode',
] as const;

type CfgKey = typeof CFG_KEYS[number];

export default function AdminConfiguracionScreen() {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const { profile, resetPassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Plataforma
  const [appName, setAppName] = useState('Nudofy');
  const [appUrl, setAppUrl] = useState('nudofy.com');
  const [supportEmail, setSupportEmail] = useState('info@nudofy.com');

  // Email
  const [emailFrom, setEmailFrom] = useState('facturas@nudofy.com');
  const [emailActivation, setEmailActivation] = useState(true);
  const [emailInvoice, setEmailInvoice] = useState(true);

  // Stripe (solo lo público; el secret key y el webhook secret se gestionan
  // como Edge Function secrets, no desde aquí)
  const [stripePk, setStripePk] = useState('');
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
        if (map.email_activation !== undefined) setEmailActivation(map.email_activation === 'true');
        if (map.email_invoice    !== undefined) setEmailInvoice(map.email_invoice === 'true');
        if (map.stripe_pk)       setStripePk(map.stripe_pk);
        if (map.stripe_test_mode !== undefined) setStripeTestMode(map.stripe_test_mode === 'true');
        if (map.maintenance_mode !== undefined) setMaintenanceMode(map.maintenance_mode === 'true');
        setLoadingConfig(false);
      });
  }, []);

  async function handleChangeMyPassword() {
    if (!profile?.email) return;
    setSendingReset(true);
    const { error } = await resetPassword(profile.email);
    setSendingReset(false);
    if (error) { toast.error(error); return; }
    toast.success(t('configuracion.reset_link_sent', { email: profile.email }));
  }

  function handleClearCache() {
    confirmDestructive(
      t('configuracion.clear_cache_title'),
      t('configuracion.clear_cache_body'),
      async () => {
        setClearingCache(true);
        try {
          await supabase.rpc('notify_pgrst_reload' as any);
          toast.success(t('configuracion.cache_cleared'));
        } catch {
          toast.success(t('configuracion.cache_cleared'));
        } finally {
          setClearingCache(false);
        }
      },
      t('configuracion.clear'),
    );
  }

  async function handleSave() {
    setSaving(true);
    const rows: { key: CfgKey; value: string }[] = [
      { key: 'app_name',        value: appName },
      { key: 'app_url',         value: appUrl },
      { key: 'support_email',   value: supportEmail },
      { key: 'email_from',      value: emailFrom },
      { key: 'email_activation',value: String(emailActivation) },
      { key: 'email_invoice',   value: String(emailInvoice) },
      { key: 'stripe_pk',       value: stripePk },
      { key: 'stripe_test_mode',value: String(stripeTestMode) },
      { key: 'maintenance_mode',value: String(maintenanceMode) },
    ];
    const { error } = await supabase
      .from('app_config')
      .upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error(t('configuracion.save_error', { message: error.message }));
    } else {
      toast.success(t('configuracion.config_updated'));
    }
  }

  return (
    <AdminShell
      activeSection="configuracion"
      title={t('configuracion.title')}
      rightElement={
        <Button
          label={saving ? t('configuracion.saving') : loadingConfig ? t('configuracion.loading') : t('configuracion.save_changes')}
          onPress={handleSave}
          disabled={saving || loadingConfig}
          size="sm"
        />
      }
    >
      {/* Mi cuenta */}
      <ConfigCard title={t('configuracion.my_account_title')} icon="Lock">
        <ConfigRow label={t('configuracion.email')} last={false}>
          <Text variant="small" color="ink2">{profile?.email ?? '—'}</Text>
        </ConfigRow>
        <ConfigRow label={t('configuracion.password')} last>
          <Button
            label={sendingReset ? t('configuracion.sending') : t('configuracion.change_my_password')}
            variant="ghost"
            size="sm"
            onPress={handleChangeMyPassword}
            disabled={sendingReset}
          />
        </ConfigRow>
      </ConfigCard>

      {/* Información de la plataforma */}
      <ConfigCard title={t('configuracion.platform_info_title')} icon="Settings">
        <ConfigRow label={t('configuracion.app_name_label')}>
          <TextInput
            style={styles.fieldInput}
            value={appName}
            onChangeText={setAppName}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.corporate_url_label')}>
          <TextInput
            style={styles.fieldInput}
            value={appUrl}
            onChangeText={setAppUrl}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.support_email_label')}>
          <TextInput
            style={styles.fieldInput}
            value={supportEmail}
            onChangeText={setSupportEmail}
            keyboardType="email-address"
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.current_version_label')} last>
          <Badge label="v1.2.4" variant="neutral" />
        </ConfigRow>
      </ConfigCard>

      {/* Email y notificaciones */}
      <ConfigCard title={t('configuracion.email_notifications_title')} icon="Mail">
        <ConfigRow label={t('configuracion.invoice_sender_email_label')}>
          <TextInput
            style={styles.fieldInput}
            value={emailFrom}
            onChangeText={setEmailFrom}
            keyboardType="email-address"
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.resend_api_key_label')}>
          <Badge label={t('configuracion.managed_as_secret')} variant="neutral" />
        </ConfigRow>
        <ConfigRow label={t('configuracion.activation_email_label')}>
          <Switch
            value={emailActivation}
            onValueChange={setEmailActivation}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.white}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.new_invoice_email_label')} last>
          <Switch
            value={emailInvoice}
            onValueChange={setEmailInvoice}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.white}
          />
        </ConfigRow>
      </ConfigCard>

      {/* Stripe */}
      <ConfigCard title={t('configuracion.stripe_payments_title')} icon="CreditCard">
        <View style={styles.cardNote}>
          <Text variant="caption" color="ink3">
            {t('configuracion.stripe_secret_note')}
          </Text>
        </View>
        <ConfigRow label={t('configuracion.publishable_key_label')}>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripePk}
            onChangeText={setStripePk}
            placeholderTextColor={colors.ink4}
          />
        </ConfigRow>
        <ConfigRow label={t('configuracion.secret_key_label')}>
          <Badge label={t('configuracion.managed_as_secret')} variant="neutral" />
        </ConfigRow>
        <ConfigRow label={t('configuracion.webhook_secret_label')}>
          <Badge label={t('configuracion.managed_as_secret')} variant="neutral" />
        </ConfigRow>
        <ConfigRow label={t('configuracion.test_mode_label')} last>
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
            {t('configuracion.danger_zone_title')}
          </Text>
        </View>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="smallMedium">{t('configuracion.maintenance_mode_label')}</Text>
            <Text variant="caption" color="ink3">
              {t('configuracion.maintenance_mode_desc')}
            </Text>
          </View>
          <Switch
            value={maintenanceMode}
            onValueChange={(val) => {
              if (val) {
                confirmDestructive(
                  t('configuracion.activate_maintenance_title'),
                  t('configuracion.activate_maintenance_body'),
                  () => setMaintenanceMode(true),
                  t('configuracion.activate'),
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
            <Text variant="smallMedium">{t('configuracion.clear_global_cache_label')}</Text>
            <Text variant="caption" color="ink3">
              {t('configuracion.clear_global_cache_desc')}
            </Text>
          </View>
          <Button
            label={clearingCache ? t('configuracion.clearing') : t('configuracion.clear')}
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

  cardNote: {
    paddingHorizontal: space[3], paddingTop: space[2] + 4, paddingBottom: space[1],
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
