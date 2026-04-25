// A-03 · Ficha de cliente (4 pestañas: Ficha / Pedidos / Notas / Portal)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import ResourceError from '@/components/ResourceError';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ClientSchema, validate } from '@/lib/validation';
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
  const toast = useToast();
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchClient = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    supabase.from('clients').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setLoadError(error.message);
      const row = (data as Client | null) ?? null;
      setClient(row);
      setForm(row ?? {});
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

  useEffect(() => { fetchClient(); }, [fetchClient]);

  async function saveAddress() {
    if (!newAddress.label?.trim()) { toast.error('El nombre de la dirección es obligatorio'); return; }
    const { error } = await supabase.from('client_addresses').insert({
      client_id: id,
      label: newAddress.label.trim(),
      address: newAddress.address?.trim() || null,
      city: newAddress.city?.trim() || null,
      postal_code: newAddress.postal_code?.trim() || null,
      notes: newAddress.notes?.trim() || null,
      is_default: addresses.length === 0,
    });
    if (error) { toast.error(error.message); return; }
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
    const v = validate(ClientSchema, form);
    if (!v.ok) { toast.error(v.firstError); return; }
    const { error } = await supabase.from('clients').update(v.data).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setClient({ ...client, ...v.data } as Client);
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

  if (!loading && !client) {
    return (
      <ResourceError
        topBarTitle="Cliente"
        title={loadError ? 'Error de conexión' : 'Cliente no encontrado'}
        message={loadError ? 'No se pudo cargar el cliente.' : 'No existe o no tienes permisos para verlo.'}
        detail={loadError}
        onBack={() => router.back()}
        onRetry={fetchClient}
      />
    );
  }

  if (loading || !client) {
    return (
      <Screen>
        <TopBar title="Cliente" onBack={() => router.back()} />
        <View style={styles.loadingWrap}>
          <Text variant="small" color="ink3">Cargando...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title="Ficha de cliente"
        onBack={() => router.back()}
        actions={[
          { icon: editing ? 'Check' : 'Pencil', onPress: () => editing ? saveChanges() : setEditing(true), accessibilityLabel: editing ? 'Guardar' : 'Editar' },
          { icon: 'Trash2', onPress: handleDeleteClient, accessibilityLabel: 'Eliminar cliente' },
        ]}
      />

      {/* Cabecera del cliente */}
      <View style={styles.clientHeader}>
        <Avatar name={client.name} size={52} fontSize={17} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{client.name}</Text>
          {client.client_type && (
            <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
              <Badge label={client.client_type} variant="neutral" />
            </View>
          )}
        </View>
      </View>

      {/* Pestañas */}
      <View style={styles.tabBar}>
        {(['ficha', 'pedidos', 'notas', 'portal'] as Tab[]).map(t => (
          <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text variant="smallMedium" color={tab === t ? 'ink' : 'ink3'}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionRow}>
        <QuickAction icon="Plus" label="Nuevo pedido" onPress={() => router.push(`/(agent)/pedido/nuevo?clientId=${id}` as any)} />
        <QuickAction icon="ClipboardList" label="Ver pedidos" onPress={() => setTab('pedidos')} />
        <QuickAction icon="ExternalLink" label="Portal" onPress={() => setTab('portal')} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* TAB: FICHA */}
        {tab === 'ficha' && (
          <View style={styles.blocks}>
            <DataBlock title="Datos fiscales" icon="FileText">
              <Field label="Nombre fiscal" value={form.fiscal_name} onChangeText={v => setForm(f => ({ ...f, fiscal_name: v }))} editing={editing} />
              <Field label="Dirección facturación" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} editing={editing} />
              <Field label="NIF / CIF" value={form.nif} onChangeText={v => setForm(f => ({ ...f, nif: v }))} editing={editing} last />
            </DataBlock>
            <DataBlock title="Contacto" icon="Phone">
              <Field label="Persona de contacto" value={form.contact_name} onChangeText={v => setForm(f => ({ ...f, contact_name: v }))} editing={editing} />
              <Field label="Teléfono" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} editing={editing} keyboardType="phone-pad" />
              <Field label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} editing={editing} keyboardType="email-address" last />
            </DataBlock>
            <DataBlock title="Perfil comercial" icon="Briefcase">
              <Field label="Tipo establecimiento" value={form.client_type} onChangeText={v => setForm(f => ({ ...f, client_type: v }))} editing={editing} last />
            </DataBlock>
            <DataBlock title="Condiciones comerciales" icon="CreditCard">
              <Field label="Forma de pago" value={form.payment_method} onChangeText={v => setForm(f => ({ ...f, payment_method: v }))} editing={editing} />
              <Field label="IBAN" value={form.iban} onChangeText={v => setForm(f => ({ ...f, iban: v }))} editing={editing} last />
            </DataBlock>

            {/* Direcciones de envío */}
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Icon name="MapPin" size={16} color={colors.ink3} />
                <Text variant="caption" color="ink3" style={styles.blockTitle}>Direcciones de envío</Text>
                <Pressable onPress={() => setAddingAddress(true)} style={{ marginLeft: 'auto' }} hitSlop={8}>
                  <Text variant="smallMedium" color="brand">+ Añadir</Text>
                </Pressable>
              </View>

              {addresses.length === 0 && !addingAddress && (
                <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[5] }}>Sin direcciones añadidas</Text>
              )}

              {addresses.map((addr, idx) => (
                <View key={addr.id} style={[styles.addrRow, idx !== addresses.length - 1 && styles.rowBorder]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.addrLabelRow}>
                      <Text variant="bodyMedium">{addr.label}</Text>
                      {addr.is_default && <Badge label="Principal" variant="brand" />}
                    </View>
                    {addr.address && <Text variant="small" color="ink3">{addr.address}</Text>}
                    {(addr.city || addr.postal_code) && (
                      <Text variant="small" color="ink3">{[addr.postal_code, addr.city].filter(Boolean).join(' ')}</Text>
                    )}
                    {addr.notes && <Text variant="caption" color="ink4" style={{ fontStyle: 'italic' }}>{addr.notes}</Text>}
                  </View>
                  <Pressable onPress={() => deleteAddress(addr.id)} hitSlop={8} style={{ padding: 4 }}>
                    <Icon name="X" size={16} color={colors.ink4} />
                  </Pressable>
                </View>
              ))}

              {addingAddress && (
                <View style={styles.addrForm}>
                  <TextInput style={styles.input} placeholder="Nombre (ej: Tienda Central) *" placeholderTextColor={colors.ink4} value={newAddress.label ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, label: v }))} />
                  <TextInput style={styles.input} placeholder="Dirección" placeholderTextColor={colors.ink4} value={newAddress.address ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, address: v }))} />
                  <View style={{ flexDirection: 'row', gap: space[2] }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="C.P." placeholderTextColor={colors.ink4} value={newAddress.postal_code ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, postal_code: v }))} keyboardType="numeric" />
                    <TextInput style={[styles.input, { flex: 2 }]} placeholder="Ciudad" placeholderTextColor={colors.ink4} value={newAddress.city ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, city: v }))} />
                  </View>
                  <TextInput style={styles.input} placeholder="Notas (horario, acceso...)" placeholderTextColor={colors.ink4} value={newAddress.notes ?? ''} onChangeText={v => setNewAddress(p => ({ ...p, notes: v }))} />
                  <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[1] }}>
                    <Button label="Cancelar" variant="secondary" size="sm" onPress={() => { setAddingAddress(false); setNewAddress({}); }} style={{ flex: 1 }} />
                    <Button label="Guardar" size="sm" onPress={saveAddress} style={{ flex: 1 }} />
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
              <Text variant="small" color="ink3" align="center" style={{ paddingVertical: space[6] }}>Sin pedidos aún</Text>
            )}
            {orders.map(o => (
              <Pressable
                key={o.id}
                style={({ pressed }) => [styles.orderRow, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/(agent)/pedido/${o.id}` as any)}
              >
                <View style={{ flex: 1, gap: 1 }}>
                  {o.order_number && <Text variant="caption" color="ink3">{o.order_number}</Text>}
                  <Text variant="small" color="ink3">{(o as any).supplier?.name} · {new Date(o.created_at).toLocaleDateString('es-ES')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: space[1] }}>
                  <Text variant="bodyMedium">{o.total.toFixed(2)} €</Text>
                  <StatusBadge status={o.status} />
                </View>
              </Pressable>
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
              placeholderTextColor={colors.ink4}
              value={form.notes ?? ''}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
            />
            <Button label="Guardar notas" onPress={saveChanges} fullWidth />
          </View>
        )}

        {/* TAB: PORTAL */}
        {tab === 'portal' && <PortalTab client={client} />}
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PortalTab({ client }: { client: Client }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendInvite() {
    if (!client.email?.trim()) {
      toast.error('Este cliente no tiene email registrado. Añádelo en la ficha antes de invitarlo.');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invite-client`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ email: client.email, clientName: client.name }),
        }
      );
      const text = await res.text().catch(() => '');
      let json: any = {};
      try { json = JSON.parse(text); } catch {}
      if (!res.ok) {
        toast.error(json?.error ?? `HTTP ${res.status}: ${text.slice(0, 200)}`);
        return;
      }
      setSent(true);
      const msg = json?.type === 'recovery'
        ? `Email enviado a ${client.email} para restablecer su contraseña`
        : `Email enviado a ${client.email} con sus credenciales`;
      toast.success(msg);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.blocks}>
      <View style={styles.portalCard}>
        <Text variant="heading">Acceso al portal del cliente</Text>
        <Text variant="small" color="ink3">
          {client.email
            ? `El cliente recibirá un enlace en ${client.email} para acceder al portal y ver sus catálogos.`
            : 'Añade un email al cliente para poder enviarle la invitación.'}
        </Text>

        {sent && (
          <View style={styles.inviteSentBox}>
            <Icon name="CircleCheck" size={16} color={colors.success} />
            <Text variant="small" color="success">Invitación enviada a {client.email}</Text>
          </View>
        )}

        <Button
          label={sent ? 'Reenviar invitación' : 'Enviar invitación'}
          variant={sent ? 'secondary' : 'primary'}
          icon="Mail"
          onPress={sendInvite}
          loading={sending}
          disabled={!client.email}
          fullWidth
          style={{ marginTop: space[2] }}
        />
      </View>
    </View>
  );
}

function DataBlock({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Icon name={icon} size={16} color={colors.ink3} />
        <Text variant="caption" color="ink3" style={styles.blockTitle}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, editing, keyboardType, last }: {
  label: string;
  value?: string;
  onChangeText: (v: string) => void;
  editing: boolean;
  keyboardType?: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.rowBorder]}>
      <Text variant="small" color="ink3" style={{ minWidth: 120 }}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.fieldInput}
          value={value ?? ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="—"
          placeholderTextColor={colors.ink4}
        />
      ) : (
        <Text variant="smallMedium" color={value ? 'ink' : 'ink4'} align="right" style={{ flex: 1 }}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: colors.surface2 }]}
      onPress={onPress}
    >
      <Icon name={icon} size={20} color={colors.ink2} />
      <Text variant="smallMedium" align="center">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  clientHeader: {
    backgroundColor: colors.white,
    padding: space[4],
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  tabBar: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: space[4],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  tab: { flex: 1, paddingVertical: space[3], alignItems: 'center', position: 'relative' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '25%', right: '25%',
    height: 2, backgroundColor: colors.ink,
  },
  actionRow: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    gap: space[2],
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center',
    gap: space[1],
  },

  blocks: { padding: space[3], gap: space[2] },
  block: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  blockHeader: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line,
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: colors.surface,
  },
  blockTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },

  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[3], paddingVertical: space[2],
    gap: space[3],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  fieldInput: {
    fontSize: 13, color: colors.ink,
    borderBottomWidth: 1, borderBottomColor: colors.ink,
    flex: 1, textAlign: 'right', paddingVertical: 2,
  },

  addrRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: space[3], paddingVertical: space[3],
    gap: space[2],
  },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  addrForm: { padding: space[3], gap: space[2] },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: 10,
    fontSize: 14, color: colors.ink, backgroundColor: colors.white,
  },

  orderRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space[3],
    borderWidth: 1, borderColor: colors.line,
  },

  notesInput: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[3],
    fontSize: 14, color: colors.ink,
    minHeight: 180, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.line,
  },

  portalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space[4],
    gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  inviteSentBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    paddingVertical: space[2], paddingHorizontal: space[3],
    marginTop: space[2],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
});
