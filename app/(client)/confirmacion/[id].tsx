// C-04 · Confirmación de pedido (éxito)
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import { useClientData } from '@/hooks/useClient';

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface OrderData {
  id: string;
  order_number?: string;
  total: number;
  notes?: string;
  created_at: string;
  supplier?: { name: string };
  catalog?: { name: string };
}

const TIMELINE = [
  { key: 'received', label: 'Pedido recibido', done: true },
  { key: 'sent', label: 'Enviado al proveedor', done: false },
  { key: 'preparation', label: 'En preparación', done: false },
];

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agent } = useClientData();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('orders')
      .select(`
        id, order_number, total, notes, created_at,
        supplier:suppliers(name),
        catalog:catalogs(name)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data as any));
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero de éxito */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroCheck}>✓</Text>
          </View>
          <Text style={styles.heroTitle}>¡Pedido enviado!</Text>
          {order?.order_number && (
            <View style={styles.orderNumBadge}>
              <Text style={styles.orderNum}>{order.order_number}</Text>
            </View>
          )}
          {order && (
            <Text style={styles.heroDate}>{formatDateTime(order.created_at)}</Text>
          )}
        </View>

        {/* Resumen del pedido */}
        {order && (
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryTitle}>Resumen</Text>
            <SummaryRow label="Proveedor" value={(order as any).supplier?.name ?? '—'} />
            <SummaryRow label="Catálogo" value={(order as any).catalog?.name ?? '—'} />
            <SummaryRow label="Total" value={formatEur(order.total)} bold />
            {order.notes && <SummaryRow label="Notas" value={order.notes} />}
          </View>
        )}

        {/* Agente lo ha recibido */}
        {agent && (
          <View style={styles.agentCard}>
            <Text style={styles.agentCardTitle}>✓ Pedido recibido por tu agente</Text>
            <Text style={styles.agentCardName}>{agent.name} ha recibido tu pedido y lo procesará en breve</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Estado del pedido</Text>
          {TIMELINE.map((step, i) => (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>
                  {step.done && <Text style={styles.timelineDotCheck}>✓</Text>}
                </View>
                {i < TIMELINE.length - 1 && (
                  <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                )}
              </View>
              <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => order && Share.share({ message: `Pedido ${order.order_number} · ${formatEur(order.total)}\nNudofy` })}
          >
            <Text style={styles.actionBtnText}>↗ Compartir pedido</Text>
          </TouchableOpacity>
          {agent?.phone && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => Linking.openURL(`https://wa.me/${agent.phone?.replace(/\D/g, '')}`)}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>💬 Contactar agente</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(client)/home')}
        >
          <Text style={styles.homeBtnText}>Volver al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  hero: {
    backgroundColor: colors.greenLight,
    borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 10,
    marginTop: 8 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center' },
  heroCheck: { color: colors.white, fontSize: 36, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1A3A0A', marginTop: 4 },
  orderNumBadge: {
    backgroundColor: colors.white,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  orderNum: { fontSize: 13, fontWeight: '600', color: colors.green },
  heroDate: { fontSize: 12, color: colors.green },
  summaryBlock: {
    backgroundColor: colors.white, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 0 },
  summaryTitle: {
    fontSize: 11, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: colors.borderLight },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  summaryValueBold: { color: colors.purple, fontSize: 15 },
  agentCard: {
    backgroundColor: '#E1F5EE',
    borderRadius: 14, padding: 14 },
  agentCardTitle: { fontSize: 13, fontWeight: '600', color: '#0B5E38', marginBottom: 4 },
  agentCardName: { fontSize: 12, color: '#0B5E38' },
  timelineCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, gap: 0 },
  timelineTitle: {
    fontSize: 11, fontWeight: '500', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 14 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  timelineDotCheck: { color: colors.white, fontSize: 10, fontWeight: '700' },
  timelineLine: { width: 2, height: 24, backgroundColor: colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: colors.green },
  timelineLabel: {
    fontSize: 13, color: colors.textMuted,
    paddingBottom: 28, paddingTop: 1 },
  timelineLabelDone: { color: colors.green, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: colors.purple,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  actionBtnSecondary: { backgroundColor: '#25D366' },
  actionBtnText: { color: colors.white, fontSize: 13, fontWeight: '500' },
  actionBtnTextSecondary: { color: colors.white },
  homeBtn: {
    backgroundColor: colors.white, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center' },
  homeBtnText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' } });
