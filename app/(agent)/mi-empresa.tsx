// Mi empresa — gestión de agentes para company_admin
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { useCompanyAgents } from '@/hooks/useAdmin';
import type { AdminAgent } from '@/hooks/useAdmin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ModalInvitar({
  visible, onClose, onInvite,
}: { visible: boolean; onClose: () => void; onInvite: (d: { name: string; email: string; phone?: string }) => Promise<{ error?: string | null }> }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() { setName(''); setEmail(''); setPhone(''); }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error('Nombre y email son obligatorios.');
      return;
    }
    setSaving(true);
    const result = await onInvite({ name, email, phone });
    setSaving(false);
    if (result?.error) { toast.error(result.error); return; }
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text variant="title">Invitar agente</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <FormField label="Nombre *">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ana García" placeholderTextColor={colors.ink4} />
            </FormField>
            <FormField label="Email *">
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ana@empresa.com" placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
            </FormField>
            <FormField label="Teléfono (opcional)">
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+34 600 000 000" placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
            </FormField>
          </View>
          <View style={styles.modalFooter}>
            <Button label="Cancelar" variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label="Invitar" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space[3] }}>
      <Text variant="smallMedium" style={{ marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function MiEmpresaScreen() {
  const router = useRouter();
  const toast = useToast();
  const { agents, loading, toggleAgentActive, inviteAgent, planLimits } = useCompanyAgents();
  const [showInvite, setShowInvite] = useState(false);

  async function handleToggle(agent: AdminAgent) {
    Alert.alert(
      agent.active ? 'Desactivar agente' : 'Activar agente',
      `¿${agent.active ? 'Desactivar' : 'Activar'} a ${agent.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: agent.active ? 'Desactivar' : 'Activar',
          style: agent.active ? 'destructive' : 'default',
          onPress: () => toggleAgentActive(agent.id, !agent.active),
        },
      ]
    );
  }

  async function handleInvite(data: { name: string; email: string; phone?: string }) {
    const max = planLimits?.maxAgents ?? null;
    const priceExtra = planLimits?.priceExtraAgent ?? null;
    const isExtra = max !== null && agents.length >= max;

    if (isExtra && priceExtra && priceExtra > 0) {
      return new Promise<{ error?: string | null }>((resolve) => {
        Alert.alert(
          'Agente adicional',
          `Tu plan incluye ${max} agente${max === 1 ? '' : 's'}. Este agente extra tendrá un coste de ${priceExtra} €/mes adicionales.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve({ error: null }) },
            {
              text: 'Confirmar y invitar',
              onPress: async () => {
                const result = await inviteAgent(data);
                if (!result.error) toast.success('Invitación enviada por email');
                resolve(result);
              },
            },
          ]
        );
      });
    }

    const result = await inviteAgent(data);
    if (!result.error) toast.success('Invitación enviada por email');
    return result;
  }

  return (
    <Screen>
      <TopBar
        title="Mi empresa"
        onBack={() => router.back()}
        actions={[{ icon: 'UserPlus', onPress: () => setShowInvite(true), accessibilityLabel: 'Invitar agente' }]}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text variant="heading">{agents.length}</Text>
          <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
            {agents.length === 1 ? 'agente' : 'agentes'}
          </Text>
          {planLimits?.maxAgents != null && (
            <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>
              {agents.length <= planLimits.maxAgents
                ? `${agents.length} / ${planLimits.maxAgents} incluidos en el plan`
                : `${planLimits.maxAgents} incluidos · ${agents.length - planLimits.maxAgents} extra${planLimits.priceExtraAgent ? ` (+${(agents.length - planLimits.maxAgents) * planLimits.priceExtraAgent} €/mes)` : ''}`}
            </Text>
          )}
        </View>

        {loading ? (
          <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[6] }}>Cargando...</Text>
        ) : agents.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="Users" size={32} color={colors.ink4} />
            <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
              Aún no tienes agentes en tu empresa.
            </Text>
            <Button label="Invitar primer agente" onPress={() => setShowInvite(true)} style={{ marginTop: space[3] }} />
          </View>
        ) : (
          <View style={styles.list}>
            {agents.map(agent => (
              <View key={agent.id} style={styles.row}>
                <Avatar name={agent.name} size={40} fontSize={14} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{agent.name}</Text>
                  <Text variant="caption" color="ink3" numberOfLines={1}>{agent.email}</Text>
                  {agent.phone ? (
                    <Text variant="caption" color="ink3" numberOfLines={1}>{agent.phone}</Text>
                  ) : null}
                  <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>Alta {formatDate(agent.created_at)}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Badge label={agent.active ? 'Activo' : 'Inactivo'} variant={agent.active ? 'success' : 'neutral'} />
                  <Button
                    label={agent.active ? 'Desactivar' : 'Activar'}
                    variant="secondary"
                    size="sm"
                    onPress={() => handleToggle(agent)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ModalInvitar
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleInvite}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[3], gap: space[3] },

  summary: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[4],
    alignItems: 'center',
  },

  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[6],
    alignItems: 'center',
  },

  list: { gap: space[2] },

  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },

  rowActions: { alignItems: 'flex-end', gap: space[1] },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    padding: space[3],
  },
  modal: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    width: '100%', maxWidth: 420,
    borderWidth: 1, borderColor: colors.line,
  },
  modalHeader: {
    padding: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalBody: { padding: space[4] },
  modalFooter: {
    padding: space[3],
    borderTopWidth: 1, borderTopColor: colors.line,
    flexDirection: 'row', gap: space[2],
  },
  input: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
});
