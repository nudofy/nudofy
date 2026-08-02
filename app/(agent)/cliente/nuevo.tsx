// Alta de nuevo cliente
import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button } from '@/components/ui';
import { useClients } from '@/hooks/useAgent';
import { useToast } from '@/contexts/ToastContext';
import { ClientSchema, validate } from '@/lib/validation';
import { usePlanLimits } from '@/hooks/usePlanLimits';

export default function NuevoClienteScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t } = useTranslation('agent');
  const { t: tv } = useTranslation('validation');
  const { createClient } = useClients();
  const toast = useToast();
  const { canAddClient, clientCount, clientLimit } = usePlanLimits();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    fiscal_name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    contact_name: '',
    client_type: '',
    payment_method: '',

  });

  function set(key: string) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleCreate() {
    if (!canAddClient) {
      toast.error(t('client_form.limit_reached', { limit: clientLimit }));
      return;
    }
    const v = validate(ClientSchema(tv), form);
    if (!v.ok) { toast.error(v.firstError); return; }
    setLoading(true);
    const { error } = await createClient(v.data as any);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(t('client_form.created_toast'));
    goBack();
  }

  return (
    <Screen>
      <TopBar
        title={t('client_form.title_new')}
        onBack={() => goBack()}
        actions={[{ icon: 'Check', onPress: handleCreate, accessibilityLabel: t('client_form.save') }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title={t('client_form.section_establishment')}>
            <FormField label={t('client_form.name')} value={form.name} onChangeText={set('name')} placeholder={t('client_form.name_placeholder')} />
            <FormField label={t('client_form.business_type')} value={form.client_type} onChangeText={set('client_type')} placeholder={t('client_form.business_type_placeholder')} />
            <FormField label={t('client_form.address')} value={form.address} onChangeText={set('address')} placeholder={t('client_form.address_placeholder')} last />
          </Section>

          <Section title={t('client_form.section_fiscal')}>
            <FormField label={t('client_form.fiscal_name')} value={form.fiscal_name} onChangeText={set('fiscal_name')} placeholder={t('client_form.fiscal_name_placeholder')} />
            <FormField label={t('client_form.nif')} value={form.nif} onChangeText={set('nif')} placeholder={t('client_form.nif_placeholder')} last />
          </Section>

          <Section title={t('client_form.section_contact')}>
            <FormField label={t('client_form.contact_name')} value={form.contact_name} onChangeText={set('contact_name')} placeholder={t('client_form.contact_name_placeholder')} />
            <FormField label={t('client_form.phone')} value={form.phone} onChangeText={set('phone')} placeholder={t('client_form.phone_placeholder')} keyboardType="phone-pad" />
            <FormField label={t('client_form.email')} value={form.email} onChangeText={set('email')} placeholder={t('client_form.email_placeholder')} keyboardType="email-address" last />
          </Section>

          <Section title={t('client_form.section_commercial')}>
            <FormField label={t('client_form.payment_method')} value={form.payment_method} onChangeText={set('payment_method')} placeholder={t('client_form.payment_method_placeholder')} last />
          </Section>

          <Button
            label={t('client_form.save_client')}
            onPress={handleCreate}
            loading={loading}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="ink3" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, last }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <Text variant="caption" color="ink3" style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink4}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4] },
  section: { gap: space[2] },
  sectionTitle: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginLeft: space[1],
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  field: {
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  input: { fontSize: 15, color: colors.ink, padding: 0 },
});
