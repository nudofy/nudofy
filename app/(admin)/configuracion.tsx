// ADM-06 · Configuración de la plataforma
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Switch, Alert, ScrollView,
} from 'react-native';
import AdminShell from '@/components/AdminShell';

interface ConfigField {
  label: string;
  value: string;
  placeholder?: string;
  secret?: boolean;
}

export default function AdminConfiguracionScreen() {
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Plataforma
  const [appName, setAppName] = useState('Nudofy');
  const [appUrl, setAppUrl] = useState('nudofy.app');
  const [supportEmail, setSupportEmail] = useState('info@nudofy.app');

  // Email
  const [emailFrom, setEmailFrom] = useState('facturas@nudofy.app');
  const [resendKey, setResendKey] = useState('re_••••••••••••••••');

  // Stripe
  const [stripePk, setStripePk] = useState('pk_live_••••••••••••••••');
  const [stripeSk, setStripeSk] = useState('sk_live_••••••••••••••••');
  const [stripeWebhook, setStripeWebhook] = useState('whsec_••••••••••••••••');

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Guardado', 'Configuración actualizada correctamente');
    }, 800);
  }

  return (
    <AdminShell
      activeSection="configuracion"
      title="Configuración"
      rightElement={
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      }
    >
      {/* Información de la plataforma */}
      <ConfigCard
        title="Información de la plataforma"
        iconBg="#EEEDFE"
      >
        <ConfigRow label="Nombre de la app">
          <TextInput style={styles.fieldInput} value={appName} onChangeText={setAppName} />
        </ConfigRow>
        <ConfigRow label="URL corporativa">
          <TextInput style={styles.fieldInput} value={appUrl} onChangeText={setAppUrl} />
        </ConfigRow>
        <ConfigRow label="Email de soporte">
          <TextInput
            style={styles.fieldInput} value={supportEmail}
            onChangeText={setSupportEmail} keyboardType="email-address"
          />
        </ConfigRow>
        <ConfigRow label="Versión actual">
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.2.4</Text>
          </View>
        </ConfigRow>
      </ConfigCard>

      {/* Email y notificaciones */}
      <ConfigCard title="Email y notificaciones" iconBg="#E6F1FB">
        <ConfigRow label="Email remitente facturas">
          <TextInput
            style={styles.fieldInput} value={emailFrom}
            onChangeText={setEmailFrom} keyboardType="email-address"
          />
        </ConfigRow>
        <ConfigRow label="Resend API Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={resendKey} onChangeText={setResendKey}
            secureTextEntry
          />
        </ConfigRow>
        <ConfigRow label="Email activación cuenta">
          <View style={styles.switchSmall}>
            <Switch value trackColor={{ true: '#534AB7' }} thumbColor="#fff" />
          </View>
        </ConfigRow>
        <ConfigRow label="Email nueva factura">
          <View style={styles.switchSmall}>
            <Switch value trackColor={{ true: '#534AB7' }} thumbColor="#fff" />
          </View>
        </ConfigRow>
      </ConfigCard>

      {/* Stripe */}
      <ConfigCard title="Stripe — Pagos" iconBg="#EAF3DE">
        <ConfigRow label="Publishable Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripePk} onChangeText={setStripePk}
          />
        </ConfigRow>
        <ConfigRow label="Secret Key">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripeSk} onChangeText={setStripeSk}
            secureTextEntry
          />
        </ConfigRow>
        <ConfigRow label="Webhook Secret">
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMono]}
            value={stripeWebhook} onChangeText={setStripeWebhook}
            secureTextEntry
          />
        </ConfigRow>
        <ConfigRow label="Modo test">
          <Switch value={false} trackColor={{ true: '#534AB7' }} thumbColor="#fff" />
        </ConfigRow>
      </ConfigCard>

      {/* Zona de peligro */}
      <View style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <Text style={styles.dangerTitle}>Zona de peligro</Text>
        </View>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Modo mantenimiento</Text>
            <Text style={styles.dangerSub}>La app mostrará un mensaje de mantenimiento a todos los usuarios</Text>
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
            trackColor={{ true: '#A32D2D' }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Limpiar caché global</Text>
            <Text style={styles.dangerSub}>Purga la caché de todos los usuarios</Text>
          </View>
          <TouchableOpacity style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AdminShell>
  );
}

function ConfigCard({
  title, iconBg, children,
}: { title: string; iconBg: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: iconBg }]} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRight}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 9, backgroundColor: '#534AB7',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  cardHeader: {
    padding: 13, paddingHorizontal: 18,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  cardIcon: { width: 22, height: 22, borderRadius: 6 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  fieldRow: {
    paddingHorizontal: 18, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 16,
  },
  fieldLabel: { fontSize: 13, color: '#555', flex: 1 },
  fieldRight: { flex: 1.5, alignItems: 'flex-end' },
  fieldInput: {
    width: '100%',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: '#e8e8e8',
    fontSize: 13, color: '#1a1a1a', backgroundColor: '#fff',
  },
  fieldInputMono: { fontSize: 11, color: '#666' },
  versionBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, backgroundColor: '#f0f0f0',
  },
  versionText: { fontSize: 12, fontWeight: '500', color: '#555' },
  switchSmall: {},
  dangerCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#F09595', overflow: 'hidden',
  },
  dangerHeader: {
    padding: 13, paddingHorizontal: 18,
    borderBottomWidth: 0.5, borderBottomColor: '#FCE8E8',
    backgroundColor: '#FFF5F5',
  },
  dangerTitle: { fontSize: 13, fontWeight: '500', color: '#A32D2D' },
  dangerRow: {
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#FFF0F0', gap: 14,
  },
  dangerLabel: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  dangerSub: { fontSize: 11, color: '#999', marginTop: 2 },
  dangerBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: '#F09595',
  },
  dangerBtnText: { fontSize: 12, fontWeight: '500', color: '#A32D2D' },
});
