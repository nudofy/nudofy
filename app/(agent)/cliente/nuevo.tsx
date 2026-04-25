// Alta de nuevo cliente
import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button } from '@/components/ui';
import { useClients } from '@/hooks/useAgent';
import { useToast } from '@/contexts/ToastContext';
import { ClientSchema, validate } from '@/lib/validation';

export default function NuevoClienteScreen() {
  const router = useRouter();
  const { createClient } = useClients();
  const toast = useToast();
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
    iban: '',
  });

  function set(key: string) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleCreate() {
    const v = validate(ClientSchema, form);
    if (!v.ok) { toast.error(v.firstError); return; }
    setLoading(true);
    const { error } = await createClient(v.data as any);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success('Cliente creado');
    router.back();
  }

  return (
    <Screen>
      <TopBar
        title="Nuevo cliente"
        onBack={() => router.back()}
        actions={[{ icon: 'Check', onPress: handleCreate, accessibilityLabel: 'Guardar' }]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Datos del establecimiento">
            <FormField label="Nombre *" value={form.name} onChangeText={set('name')} placeholder="Nombre del establecimiento" />
            <FormField label="Tipo de establecimiento" value={form.client_type} onChangeText={set('client_type')} placeholder="Tipo de negocio" />
            <FormField label="Dirección" value={form.address} onChangeText={set('address')} placeholder="Dirección" last />
          </Section>

          <Section title="Datos fiscales">
            <FormField label="Nombre fiscal" value={form.fiscal_name} onChangeText={set('fiscal_name')} placeholder="Nombre fiscal o razón social" />
            <FormField label="NIF / CIF" value={form.nif} onChangeText={set('nif')} placeholder="NIF o CIF" last />
          </Section>

          <Section title="Contacto">
            <FormField label="Persona de contacto" value={form.contact_name} onChangeText={set('contact_name')} placeholder="Nombre del contacto" />
            <FormField label="Teléfono" value={form.phone} onChangeText={set('phone')} placeholder="+34 91 234 56 78" keyboardType="phone-pad" />
            <FormField label="Email" value={form.email} onChangeText={set('email')} placeholder="contacto@establecimiento.com" keyboardType="email-address" last />
          </Section>

          <Section title="Condiciones comerciales">
            <FormField label="Forma de pago" value={form.payment_method} onChangeText={set('payment_method')} placeholder="30 días factura" />
            <FormField label="IBAN" value={form.iban} onChangeText={set('iban')} placeholder="ES76 2100 0418 ..." last />
          </Section>

          <Button
            label="Guardar cliente"
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
