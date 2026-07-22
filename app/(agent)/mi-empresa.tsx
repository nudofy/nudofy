// Mi empresa — gestión de agentes para company_admin
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirmDestructive } from '@/lib/confirm';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button, Badge } from '@/components/ui';
import Avatar from '@/components/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { useCompanyAgents } from '@/hooks/useAdmin';
import type { AdminAgent } from '@/hooks/useAdmin';

function ModalInvitar({
  visible, onClose, onInvite,
}: { visible: boolean; onClose: () => void; onInvite: (d: { name: string; email: string; phone?: string }) => Promise<{ error?: string | null }> }) {
  const { t } = useTranslation('agent');
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() { setName(''); setEmail(''); setPhone(''); }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast.error(t('my_company.name_email_required'));
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
            <Text variant="title">{t('my_company.invite_agent')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="X" size={20} color={colors.ink2} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <FormField label={t('my_company.name')}>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('my_company.name_example')} placeholderTextColor={colors.ink4} />
            </FormField>
            <FormField label={t('my_company.email')}>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('my_company.email_example')} placeholderTextColor={colors.ink4} keyboardType="email-address" autoCapitalize="none" />
            </FormField>
            <FormField label={t('my_company.phone_optional')}>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('my_company.phone_example')} placeholderTextColor={colors.ink4} keyboardType="phone-pad" />
            </FormField>
          </View>
          <View style={styles.modalFooter}>
            <Button label={t('my_company.cancel')} variant="secondary" onPress={() => { reset(); onClose(); }} style={{ flex: 1 }} />
            <Button label={t('my_company.invite')} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
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
  const { t, i18n } = useTranslation('agent');
  const toast = useToast();
  const { agents, loading, toggleAgentActive, inviteAgent, planLimits } = useCompanyAgents();
  const [showInvite, setShowInvite] = useState(false);

  function formatDate(iso: string) {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'en' ? 'en-GB' : 'es-ES';
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function handleToggle(agent: AdminAgent) {
    confirmDestructive(
      agent.active ? t('my_company.deactivate_agent') : t('my_company.activate_agent'),
      t('my_company.confirm_toggle', { action: agent.active ? t('my_company.deactivate') : t('my_company.activate'), name: agent.name }),
      () => toggleAgentActive(agent.id, !agent.active),
      agent.active ? t('my_company.deactivate') : t('my_company.activate')
    );
  }

  async function handleInvite(data: { name: string; email: string; phone?: string }) {
    const max = planLimits?.maxAgents ?? null;
    const priceExtra = planLimits?.priceExtraAgent ?? null;
    const isExtra = max !== null && agents.length >= max;

    if (isExtra && priceExtra && priceExtra > 0) {
      const agentWord = max === 1 ? t('my_company.agent_count_one') : t('my_company.agent_count_other');
      const msg = t('my_company.extra_agent_msg', { max, agentWord, price: priceExtra });
      if (Platform.OS === 'web') {
        if (!window.confirm(`${t('my_company.extra_agent_title')}\n\n${msg}`)) return { error: null };
        const result = await inviteAgent(data);
        if (!result.error) toast.success(t('my_company.invite_sent'));
        return result;
      }
      return new Promise<{ error?: string | null }>((resolve) => {
        Alert.alert(t('my_company.extra_agent_title'), msg, [
          { text: t('my_company.cancel'), style: 'cancel', onPress: () => resolve({ error: null }) },
          {
            text: t('my_company.confirm_and_invite'),
            onPress: async () => {
              const result = await inviteAgent(data);
              if (!result.error) toast.success(t('my_company.invite_sent'));
              resolve(result);
            },
          },
        ]);
      });
    }

    const result = await inviteAgent(data);
    if (!result.error) toast.success(t('my_company.invite_sent'));
    return result;
  }

  return (
    <Screen>
      <TopBar
        title={t('my_company.title')}
        onBack={() => router.back()}
        actions={[{ icon: 'UserPlus', onPress: () => setShowInvite(true), accessibilityLabel: t('my_company.invite_agent') }]}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text variant="heading">{agents.length}</Text>
          <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
            {agents.length === 1 ? t('my_company.agent_count_one') : t('my_company.agent_count_other')}
          </Text>
          {planLimits?.maxAgents != null && (
            <Text variant="caption" color="ink3" style={{ marginTop: 4 }}>
              {agents.length <= planLimits.maxAgents
                ? t('my_company.included_in_plan', { count: agents.length, max: planLimits.maxAgents })
                : t('my_company.extra_summary', {
                    max: planLimits.maxAgents,
                    extra: agents.length - planLimits.maxAgents,
                    priceExtra: planLimits.priceExtraAgent
                      ? t('my_company.extra_price_suffix', { amount: (agents.length - planLimits.maxAgents) * planLimits.priceExtraAgent })
                      : '',
                  })}
            </Text>
          )}
        </View>

        {loading ? (
          <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[6] }}>{t('my_company.loading')}</Text>
        ) : agents.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="Users" size={32} color={colors.ink4} />
            <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
              {t('my_company.no_agents')}
            </Text>
            <Button label={t('my_company.invite_first')} onPress={() => setShowInvite(true)} style={{ marginTop: space[3] }} />
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
                  <Text variant="caption" color="ink4" style={{ marginTop: 2 }}>{t('my_company.created_label', { date: formatDate(agent.created_at) })}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Badge label={agent.active ? t('my_company.active_badge') : t('my_company.inactive_badge')} variant={agent.active ? 'success' : 'neutral'} />
                  <Button
                    label={agent.active ? t('my_company.deactivate') : t('my_company.activate')}
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
