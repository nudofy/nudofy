// Pantalla de aceptación del Acuerdo de Encargo de Tratamiento (DPA)
// Se muestra la primera vez que un agente invitado por admin inicia sesión.
import React, { useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, space, radius } from '@/theme';
import { Screen, Text, Button, Icon } from '@/components/ui';
import { useAgentContext } from '@/contexts/AgentContext';
import { useToast } from '@/contexts/ToastContext';

const DPA_VERSION = '1.0';

export default function DpaAceptarScreen() {
  const router = useRouter();
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
      toast.error('No se pudo guardar la aceptación. Inténtalo de nuevo.');
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
            <Icon name="FileText" size={28} color={colors.ink} />
          </View>
          <Text variant="heading" align="center" style={{ marginTop: space[3] }}>
            Antes de empezar
          </Text>
          <Text variant="body" color="ink3" align="center" style={{ marginTop: space[2] }}>
            Como agente, tratas datos personales de tus clientes a través de Nudofy.
            El RGPD exige que formalicemos este Acuerdo de Encargo de Tratamiento.
          </Text>
        </View>

        {/* Puntos clave */}
        <View style={styles.card}>
          <Text variant="caption" color="ink3" style={styles.cardTitle}>
            QUÉ CUBRE ESTE ACUERDO
          </Text>
          {[
            { icon: 'Shield', text: 'Nudofy solo trata tus datos de clientes para prestarte el servicio.' },
            { icon: 'Lock', text: 'Tus datos se almacenan cifrados en servidores de la UE.' },
            { icon: 'Trash2', text: 'Al cancelar tu cuenta, tus datos se eliminan en 30 días.' },
            { icon: 'Download', text: 'Puedes exportar tus datos en cualquier momento desde tu perfil.' },
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
            Leer el texto completo del acuerdo
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
            He leído y acepto el Acuerdo de Encargo de Tratamiento, los{' '}
            <Text
              variant="small"
              style={{ color: colors.brand }}
              onPress={() => Linking.openURL('https://nudofy.com/terminos')}
            >
              Términos de uso
            </Text>
            {' '}y la{' '}
            <Text
              variant="small"
              style={{ color: colors.brand }}
              onPress={() => Linking.openURL('https://nudofy.com/privacidad')}
            >
              Política de privacidad
            </Text>
            .
          </Text>
        </Pressable>

        {/* Botón */}
        <Button
          label="Acepto y entrar a Nudofy"
          onPress={handleAccept}
          loading={saving}
          disabled={!accepted}
          fullWidth
          style={{ marginTop: space[2] }}
        />

        <Text variant="caption" color="ink4" align="center" style={{ marginTop: space[3] }}>
          Si no aceptas no podrás usar la aplicación.{'\n'}
          Escríbenos a hola@nudofy.com si tienes dudas.
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
