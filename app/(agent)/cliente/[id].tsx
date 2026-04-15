// A-03 · Ficha de cliente (4 pestañas: Ficha / Pedidos / Notas / Portal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
  KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import type { Client, Order } from '@/hooks/useAgent';

type Tab = 'ficha' | 'pedidos' | 'notas' | 'portal';

type ClientAddress = {
  id: string;
  label: string;
  address?: string;
  city?: string;
  postal_code?: string;
  notes?: string;
  is_default: boolean;
};

export default function ClienteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('ficha');
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<ClientAddress[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<ClientAddress>>({});

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

    supabase
      .from('client_addresses')
      .select('*')
      .eq('client_id', id)
      .order('is_default', { ascending: false })
      .then(({ data }) => setAddresses((data as ClientAddress[]) ?? []));
  }, [id]);

  async function saveAddress() {
    if (!newAddress.label?.trim()) { Alert.alert('El nombre de la dirección es obligatorio'); return; }
    const { error } = await supabase.from('client_addresses').insert({
      client_id: id,
      label: newAddress.label.trim(),
      address: newAddress.address?.trim() || null,
      city: newAddress.city?.trim() || null,
      postal_code: newAddress.postal_code?.trim() || null,
      notes: newAddress.notes?.trim() || null,
      is_default: addresses.length === 0 });
    if (error) { Alert.alert('Error', error.message); return; }
    const { data } = await supabase.from('client_addresses').select('*').eq('client_id', id).order('is_default', { ascending: false });
    setAddresses((data as ClientAddress[]) ?? []);
    setAddingAddress(false);
    setNewAddress({});
  }

  async function deleteAddress(addrId: string) {
    Alert.alert('Eliminar dirección', '¿Eliminar esta dirección?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await supabase.from('client_addresses').delete().eq('id', addrId);
        setAddresses(prev => prev.filter(a => a.id !== addrId));
      }},
    ]);
  }

  async function saveChanges() {
    if (!id) return;
    const { error } = await supabase.from('clients').update(form).eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    setClient({ ...client, ...form } as Client);
    setEditing(false);
  }

  function handleDeleteClient() {
    Alert.alert(
      'Eliminar cliente',
      `¿Eliminar a ${client?.name}? Se eliminarán también sus pedidos y direcciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('clients').delete().eq('id', id);
          router.back();
        }},
      ]
    );
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
        <View style={styles.topbarActions}>
          <TouchableOpacity onPress={() => editing ? saveChanges() : setEditing(true)}>
            <Text style={styles.editBtn}>{editing ? 'Guardar' : 'Editar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteClient}>
            <Text style={styles.deleteBtn}>Eliminar</Text>
          </TouchableOpacity>
        </View>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* TAB: FICHA */}
        {tab === 'ficha' && (
          <View style={styles.blocks}>
            <DataBlock title="Datos fiscales" iconBg="#EEEDFE">
              <Field label="Nombre fiscal" value={form.fiscal_name} onChangeText={v => setForm(f => ({ ...f, fiscal_name: v }))} editing={editing} />
              <Field label="Dirección facturación" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} editing={editing} />
              <Field label="NIF / CIF" value={form.nif} onChangeText={v => setForm(f => ({ ...f, nif: v }))} editing={editing} />
            </DataBlock>
            <DataBlock title="Contacto" iconBg="#E6F1FB">
              <Field label="Persona de contacto" value={form.contact_name} onChangeText={v => setForm(f => ({ ...f, contact_name: v }))} editing={editing} />
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

            {/* Direcciones de envío */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockIcon, { backgroundColor: '#E1F5EE' }]} />
                <Text style={styles.blockTitle}>Direcciones de envío</Text>
                <TouchableOpacity onPress={() => setAddingAddress(true)} style={styles.addAddrBtn}>
                  <Text style={styles.addAddrBtnText}>+ Añadir</Text>
                </TouchableOpacity>
              </View>

              {addresses.length === 0 && !addingAddress && (
                <Text style={styles.emptyText}>Sin direcciones añadidas</Text>
              )}

              {addresses.map(addr => (
                <View key={addr.id} style={styles.addrRow}>
                  <View style={styles.addrBody}>
                    <View style={styles.addrLabelRow}>
                      <Text style={styles.addrLabel}>{addr.label}</Text>
                      {addr.is_default && <Text style={styles.addrDefault}>Principal</Text>}
                    </View>
                    {addr.address && <Text style={styles.addrText}>{addr.address}</Text>}
                    {(addr.city || addr.postal_code) && (
                      <Text style={styles.addrText}>{[addr.postal_code, addr.city].filter(Boolean).join(' ')}</Text>
                    )}
                    {addr.notes && <Text style={styles.addrNotes}>{addr.notes}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => deleteAddress(addr.id)}>
                    <Text style={styles.addrDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {addingAddress && (
                <View style={styles.addrForm}>
                  <TextInput style={styles.addrInput} placeholder="Nombre (ej: Tienda Central) *" placeholderTextColor={colors.textMuted} value={newAddress.label ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, label: v }))} />
                  <TextInput style={styles.addrInput} placeholder="Dirección" placeholderTextColor={colors.textMuted} value={newAddress.address ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, address: v }))} />
                  <View style={styles.addrRow2}>
                    <TextInput style={[styles.addrInput, { flex: 1 }]} placeholder="C.P." placeholderTextColor={colors.textMuted} value={newAddress.postal_code ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, postal_code: v }))} keyboardType="numeric" />
                    <TextInput style={[styles.addrInput, { flex: 2 }]} placeholder="Ciudad" placeholderTextColor={colors.textMuted} value={newAddress.city ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, city: v }))} />
                  </View>
                  <TextInput style={styles.addrInput} placeholder="Notas (horario, acceso...)" placeholderTextColor={colors.textMuted} value={newAddress.notes ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, notes: v }))} />
                  <View style={styles.addrFormActions}>
                    <TouchableOpacity style={styles.addrCancelBtn} onPress={() => { setAddingAddress(false); setNewAddress({}); }}>
                      <Text style={styles.addrCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addrSaveBtn} onPress={saveAddress}>
                      <Text style={styles.addrSaveText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
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
          <PortalTab client={client} />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'Nf';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function PortalTab({ client }: { client: Client }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  async function sendInvite() {
    if (!client.email?.trim()) {
      Alert.alert('Sin email', 'Este cliente no tiene email registrado. Añádelo en la ficha antes de invitarlo.');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: { email: client.email, clientName: client.name },
      });
      if (error) {
        const msg = error.message ?? '';
        if (msg.toLowerCase().includes('already')) {
          Alert.alert('Ya registrado', 'Este cliente ya tiene acceso al portal.');
        } else {
          Alert.alert('Error', msg || 'Error al crear el acceso');
        }
        return;
      }
      setSent(true);
      Alert.alert('Acceso creado', `Se ha enviado un email a ${client.email} con sus credenciales de acceso.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  }

  function handleInvite() {
    sendInvite();
  }

  return (
    <View style={styles.blocks}>
      <View style={styles.portalCard}>
        <Text style={styles.portalTitle}>Acceso al portal del cliente</Text>
        <Text style={styles.portalSub}>
          {client.email
            ? `El cliente recibirá un enlace en ${client.email} para acceder al portal y ver sus catálogos.`
            : 'Añade un email al cliente para poder enviarle la invitación.'}
        </Text>

        {sent && (
          <View style={styles.inviteSentBox}>
            <Text style={styles.inviteSentText}>✓ Invitación enviada a {client.email}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            sent ? styles.inviteResendBtn : styles.inviteBtn,
            (!client.email || sending) && styles.inviteBtnDisabled,
          ]}
          onPress={handleInvite}
          disabled={sending || !client.email}
        >
          {sending
            ? <ActivityIndicator color={sent ? colors.purple : '#fff'} />
            : <Text style={sent ? styles.inviteResendText : styles.inviteBtnText}>
                {sent ? 'Reenviar invitación' : 'Enviar invitación'}
              </Text>}
        </TouchableOpacity>
      </View>
    </View>
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
    borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, marginRight: 12 },
  topbarTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  topbarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  editBtn: { fontSize: 13, color: colors.purple, fontWeight: '500' },
  deleteBtn: { fontSize: 13, color: '#C0392B', fontWeight: '500' },
  clientHeader: {
    backgroundColor: colors.white,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
  clientName: { fontSize: 16, fontWeight: '500', color: colors.text },
  clientType: { fontSize: 12, color: colors.purple, marginTop: 3 },
  tabBar: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#efefef' },
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
    borderBottomColor: '#efefef' },
  actionBtn: {
    flex: 1,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
    gap: 4 },
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
    gap: 8 },
  addAddrBtn: { marginLeft: 'auto' as any },
  addAddrBtnText: { fontSize: 12, color: colors.purple, fontWeight: '500' },
  addrRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f8f8f8', gap: 10 },
  addrBody: { flex: 1 },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  addrDefault: { fontSize: 10, color: colors.purple, backgroundColor: colors.purpleLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  addrText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addrNotes: { fontSize: 11, color: '#bbb', marginTop: 2, fontStyle: 'italic' },
  addrDelete: { fontSize: 14, color: '#ccc', padding: 4 },
  addrForm: { padding: 12, gap: 8 },
  addrInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: colors.text, backgroundColor: colors.bg },
  addrRow2: { flexDirection: 'row', gap: 8 },
  addrFormActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addrCancelBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  addrCancelText: { fontSize: 13, color: colors.textMuted },
  addrSaveBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.purple, alignItems: 'center' },
  addrSaveText: { fontSize: 13, fontWeight: '600', color: colors.white },
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
    gap: 12 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, minWidth: 110 },
  fieldValue: { fontSize: 12, color: colors.text, textAlign: 'right', flex: 1 },
  fieldEmpty: { color: '#ccc', fontStyle: 'italic' },
  fieldInput: {
    fontSize: 12, color: colors.text,
    borderBottomWidth: 1, borderBottomColor: colors.purple,
    flex: 1, textAlign: 'right', paddingVertical: 2 },
  orderRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
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
    textAlignVertical: 'top' },
  saveNotesBtn: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' },
  saveNotesBtnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  portalCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    gap: 8 },
  portalTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  portalSub: { fontSize: 13, color: colors.textMuted },
  inviteBtn: {
    marginTop: 8,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' },
  inviteBtnDisabled: { opacity: 0.45 },
  inviteBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  inviteSentBox: {
    backgroundColor: '#EAF6ED',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8 },
  inviteSentText: { color: '#2E7D4F', fontSize: 13, fontWeight: '500' },
  inviteResendBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center' },
  inviteResendText: { color: colors.purple, fontSize: 14, fontWeight: '500' } });
