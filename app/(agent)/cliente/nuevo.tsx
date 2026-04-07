// Alta de nuevo cliente
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { useClients } from '@/hooks/useAgent';

export default function NuevoClienteScreen() {
  const router = useRouter();
  const { createClient } = useClients();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    fiscal_name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    client_type: '',
    payment_method: '',
    iban: '',
  });

  function set(key: string) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleCreate() {
    if (!form.name.trim()) { Alert.alert('Falta el nombre', 'El nombre del establecimiento es obligatorio'); return; }
    setLoading(true);
    const { error } = await createClient(form as any);
    setLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo cliente</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.purple} /> : <Text style={styles.save}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Datos del establecimiento">
          <FormField label="Nombre *" value={form.name} onChangeText={set('name')} placeholder="Juguetería El Globo" />
          <FormField label="Tipo de establecimiento" value={form.client_type} onChangeText={set('client_type')} placeholder="Juguetería, Farmacia..." />
          <FormField label="Dirección" value={form.address} onChangeText={set('address')} placeholder="C/ Mayor 14, Madrid" />
        </Section>

        <Section title="Datos fiscales">
          <FormField label="Nombre fiscal" value={form.fiscal_name} onChangeText={set('fiscal_name')} placeholder="El Globo S.L." />
          <FormField label="NIF / CIF" value={form.nif} onChangeText={set('nif')} placeholder="B-28456123" />
        </Section>

        <Section title="Contacto">
          <FormField label="Teléfono" value={form.phone} onChangeText={set('phone')} placeholder="+34 91 234 56 78" keyboardType="phone-pad" />
          <FormField label="Email" value={form.email} onChangeText={set('email')} placeholder="contacto@establecimiento.com" keyboardType="email-address" />
        </Section>

        <Section title="Condiciones comerciales">
          <FormField label="Forma de pago" value={form.payment_method} onChangeText={set('payment_method')} placeholder="30 días factura" />
          <FormField label="IBAN" value={form.iban} onChangeText={set('iban')} placeholder="ES76 2100 0418 ..." />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  back: { fontSize: 14, color: colors.purple },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  save: { fontSize: 14, color: colors.purple, fontWeight: '500' },
  content: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4,
  },
  sectionBody: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  field: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  input: { fontSize: 15, color: colors.text },
});
