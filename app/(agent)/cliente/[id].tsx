// A-03 · Ficha de cliente (4 pestañas: Ficha / Pedidos / Notas / Portal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { Client, Order } from '@/hooks/useAgent';

type Tab = 'ficha' | 'pedidos' | 'notas' | 'portal';

export default function ClienteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('ficha');
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data }) => {
      setClient(data);
      setForm(data ?? {});
      setLoading(false);
    });
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, supplier:suppliers(id,name)')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data as any[]) ?? []));
  }, [id]);

  async function saveChanges() {
    if (!id) return;
    const { error } = await supabase.from('clients').update(form).eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    setClient({ ...client, ...form } as Client);
    setEditing(false);
  }

  if (loading || !client) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Clientes</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Ficha de cliente</Text>
        <TouchableOpacity onPress={() => editing ? saveChanges() : setEditing(true)}>
          <Text style={styles.editBtn}>{editing ? 'Guardar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Cabecera del cliente */}
      <View style={styles.clientHeader}>
        <Avatar name={client.name} size={52} fontSize={17} />
        <View>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.client_type && <Text style={styles.clientType}>{client.client_type}</Text>}
        </View>
      </View>

      {/* Pestañas */}
      <View style={styles.tabBar}>
        {(['ficha', 'pedidos', 'notas', 'portal'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(agent)/pedido/nuevo?clientId=${id}` as any)}>
          <Text style={styles.actionIcon}>＋</Text>
          <Text style={styles.actionText}>Nuevo pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setTab('pedidos')}>
          <Text style={styles.actionIcon}>≡</Text>
          <Text style={styles.actionText}>Ver pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setTab('portal')}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionText}>Portal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* TAB: FICHA */}
        {tab === 'ficha' && (
          <View style={styles.blocks}>
            <DataBlock title="Datos fiscales" iconBg="#EEEDFE">
              <Field label="Nombre fiscal" value={form.fiscal_name} onChangeText={v => setForm(f => ({ ...f, fiscal_name: v }))} editing={editing} />
              <Field label="Dirección facturación" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} editing={editing} />
              <Field label="NIF / CIF" value={form.nif} onChangeText={v => setForm(f => ({ ...f, nif: v }))} editing={editing} />
            </DataBlock>
            <DataBlock title="Contacto" iconBg="#E6F1FB">
              <Field label="Teléfono" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} editing={editing} keyboardType="phone-pad" />
              <Field label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} editing={editing} keyboardType="email-address" />
            </DataBlock>
            <DataBlock title="Perfil comercial" iconBg="#FAEEDA">
              <Field label="Tipo establecimiento" value={form.client_type} onChangeText={v => setForm(f => ({ ...f, client_type: v }))} editing={editing} />
            </DataBlock>
            <DataBlock title="Condiciones comerciales" iconBg="#EAF3DE">
              <Field label="Forma de pago" value={form.payment_method} onChangeText={v => setForm(f => ({ ...f, payment_method: v }))} editing={editing} />
              <Field label="IBAN" value={form.iban} onChangeText={v => setForm(f => ({ ...f, iban: v }))} editing={editing} />
            </DataBlock>
          </View>
        )}

        {/* TAB: PEDIDOS */}
        {tab === 'pedidos' && (
          <View style={styles.blocks}>
            {orders.length === 0 && (
              <Text style={styles.emptyText}>Sin pedidos aún</Text>
            )}
            {orders.map(o => (
              <TouchableOpacity
                key={o.id}
                style={styles.orderRow}
                onPress={() => router.push(`/(agent)/pedido/${o.id}` as any)}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNum}>{o.order_number ?? '—'}</Text>
                  <Text style={styles.orderMeta}>{(o as any).supplier?.name} · {new Date(o.created_at).toLocaleDateString('es-ES')}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{o.total.toFixed(2)} €</Text>
                  <StatusBadge status={o.status} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB: NOTAS */}
        {tab === 'notas' && (
          <View style={styles.blocks}>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Añade notas sobre este cliente..."
              placeholderTextColor={colors.textMuted}
              value={form.notes ?? ''}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
            />
            <TouchableOpacity style={styles.saveNotesBtn} onPress={saveChanges}>
              <Text style={styles.saveNotesBtnText}>Guardar notas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB: PORTAL */}
        {tab === 'portal' && (
          <View style={styles.blocks}>
            <View style={styles.portalCard}>
              <Text style={styles.portalTitle}>Acceso al portal del cliente</Text>
              <Text style={styles.portalSub}>Gestiona qué catálogos puede ver este cliente</Text>
              <TouchableOpacity style={styles.inviteBtn}>
                <Text style={styles.inviteBtnText}>Enviar invitación</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DataBlock({ title, iconBg, children }: { title: string; iconBg: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <View style={[styles.blockIcon, { backgroundColor: iconBg }]} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({ label, value, onChangeText, editing, keyboardType }: {
  label: string;
  value?: string;
  onChangeText: (v: string) => void;
  editing: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.fieldInput}
          value={value ?? ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>{value || '—'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  topbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  back: { fontSize: 14, color: colors.purple, marginRight: 12 },
  topbarTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  editBtn: { fontSize: 13, color: colors.purple, fontWeight: '500' },
  clientHeader: {
    backgroundColor: colors.white,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  clientName: { fontSize: 16, fontWeight: '500', color: colors.text },
  clientType: { fontSize: 12, color: colors.purple, marginTop: 3 },
  tabBar: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  tabActive: { color: colors.purple },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.purple },
  actionRow: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef',
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: { fontSize: 16, color: colors.purple },
  actionText: { fontSize: 12, fontWeight: '500', color: colors.purple },
  blocks: { padding: 14, gap: 10 },
  block: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  blockHeader: {
    padding: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockIcon: { width: 24, height: 24, borderRadius: 7 },
  blockTitle: { fontSize: 12, fontWeight: '500', color: '#555' },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f8f8f8',
    gap: 12,
  },
  fieldLabel: { fontSize: 12, color: colors.textMuted, minWidth: 110 },
  fieldValue: { fontSize: 12, color: colors.text, textAlign: 'right', flex: 1 },
  fieldEmpty: { color: '#ccc', fontStyle: 'italic' },
  fieldInput: {
    fontSize: 12, color: colors.text,
    borderBottomWidth: 1, borderBottomColor: colors.purple,
    flex: 1, textAlign: 'right', paddingVertical: 2,
  },
  orderRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderInfo: { flex: 1 },
  orderNum: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  orderMeta: { fontSize: 11, color: colors.textMuted },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, paddingVertical: 24 },
  notesInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  saveNotesBtn: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveNotesBtnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  portalCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  portalTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  portalSub: { fontSize: 13, color: colors.textMuted },
  inviteBtn: {
    marginTop: 8,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inviteBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
});
