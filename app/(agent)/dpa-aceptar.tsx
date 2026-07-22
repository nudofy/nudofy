// Pantalla de aceptación del Acuerdo de Encargo de Tratamiento (DPA)
// Se muestra la primera vez que un agente invitado por admin inicia sesión.
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Screen, Text, Button, Icon } from '@/components/ui';
import { useAgentContext } from '@/contexts/AgentContext';
import { useToast } from '@/contexts/ToastContext';

const DPA_VERSION = '1.0';

export default function DpaAceptarScreen() {
  const router = useRouter();
  const { t } = useTranslation('agent');
  const toast = useToast();
  const { agent, refreshAgent } = useAgentContext();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    if (!agent) return;
    setSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({
        accepted_dpa_at: new Date().toISOString(),
        dpa_version: DPA_VERSION,
      })
      .eq('id', agent.id);
    setSaving(false);

    if (error) {
      toast.error(t('dpa.save_error'));
      return;
    }

    refreshAgent();
    router.replace('/(agent)/home');
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Icon name="FileText" size={24} color={colors.ink} />
          </View>
          <Text variant="heading" align="center" style={{ marginTop: space[3] }}>
            {t('dpa.heading')}
          </Text>
          <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
            {t('dpa.intro')}
          </Text>
        </View>

        {/* Puntos clave */}
        <View style={styles.card}>
          <Text variant="caption" color="ink3" style={styles.cardTitle}>
            {t('dpa.covers_title')}
          </Text>
          {[
            { icon: 'Shield', text: t('dpa.point1') },
            { icon: 'Lock', text: t('dpa.point2') },
            { icon: 'Trash2', text: t('dpa.point3') },
            { icon: 'Download', text: t('dpa.point4') },
          ].map(({ icon, text }, i) => (
            <View key={i} style={[styles.point, i < 3 && styles.pointBorder]}>
              <Icon name={icon as any} size={16} color={colors.ink2} />
              <Text variant="small" color="ink2" style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Enlace al texto completo */}
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL('https://nudofy.com/dpa')}
        >
          <Icon name="ExternalLink" size={16} color={colors.brand} />
          <Text variant="small" style={{ color: colors.brand }}>
            {t('dpa.read_full_text')}
          </Text>
        </Pressable>

        {/* Checkbox de aceptación */}
        <Pressable
          style={styles.checkRow}
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Icon name="Check" size={12} color={colors.white} />}
          </View>
          <Text variant="small" color="ink2" style={{ flex: 1, lineHeight: 18 }}>
            {t('dpa.accept_prefix')}{' '}
            <Text
              variant="small"
              style={{ color: colors.brand }}
              onPress={() => Linking.openURL('https://nudofy.com/terminos')}
            >
              {t('dpa.terms')}
            </Text>
            {' '}{t('dpa.and_the')}{' '}
            <Text
              variant="small"
              style={{ color: colors.brand }}
              onPress={() => Linking.openURL('https://nudofy.com/privacidad')}
            >
              {t('dpa.privacy_policy')}
            </Text>
            .
          </Text>
        </Pressable>

        {/* Botón */}
        <Button
          label={t('dpa.accept_button')}
          onPress={handleAccept}
          loading={saving}
          disabled={!accepted}
          fullWidth
          style={{ marginTop: space[2] }}
        />

        <Text variant="caption" color="ink4" align="center" style={{ marginTop: space[3] }}>
          {t('dpa.footer')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[8],
  },

  header: {
    alignItems: 'center',
    paddingTop: space[4],
    paddingBottom: space[2],
  },
  iconWrap: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface2 ?? '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardTitle: {
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: space[3], paddingVertical: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2 ?? colors.line,
  },
  point: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  pointBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.line2 ?? colors.line,
  },

  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: space[2],
    alignSelf: 'center',
  },

  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: space[3],
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
  },
  checkbox: {
    width: 20, height: 20,
    borderRadius: 4,
    borderWidth: 1.5, borderColor: colors.ink3,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
