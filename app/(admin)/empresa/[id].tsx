// ADM-07 · Ficha de empresa
import React, { useState } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, TextInput, Alert, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/components/AdminShell';
import { useAdminCompanyDetail } from '@/hooks/useAdmin';
import { colors, space, radius } from '@/theme';
import { Text, Icon, Button, Badge } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0 }) + ' €';
}

const PLAN_META: Record<string, { label: string; maxAgents: number; maxClients: number; maxProducts: number; price: number }> = {
  free:       { label: 'Free',        maxAgents: 1,   maxClients: 10,     maxProducts: 50,     price: 0  },
  free_pro:   { label: 'Free Pro',    maxAgents: 5,   maxClients: 500,    maxProducts: 5000,   price: 0  },
  basic:      { label: 'Básico',      maxAgents: 1,   maxClients: 50,     maxProducts: 500,    price: 9  },
  pro:        { label: 'Pro',         maxAgents: 1,   maxClients: 500,    maxProducts: 5000,   price: 19 },
  agency:     { label: 'Agencia',     maxAgents: 10,  maxClients: 500,    maxProducts: 5000,   price: 39 },
  agency_pro: { label: 'Agencia Pro', maxAgents: 999, maxClients: 999999, maxProducts: 999999, price: 79 },
};

function UsageBar({ label, current, max, last }: { label: string; current: number; max: number; last?: boolean }) {
  const pct = max > 0 && max < 999999 ? Math.min((current / max) * 100, 100) : 0;
  const barColor = pct >= 90 ? colors.danger : pct >= 70 ? colors.warning : colors.success;
  return (
    <View style={[styles.usageRow, !last && styles.fieldRowBorder]}>
      <View style={styles.usageTop}>
        <Text variant="small" color="ink2">{label}</Text>
        <Text variant="smallMedium">
          {current.toLocaleString('es-ES')}
          {max < 999999 ? ` / ${max.toLocaleString('es-ES')}` : ' (ilimitado)'}
        </Text>
      </View>
      {max < 999999 && (
        <View style={styles.usageBarWrap}>
          <View style={[styles.usageBar, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

export default function AdminEmpresaDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { company, agents, invoices, clientCount, productCount, loading, updateCompany, toggleActive } = useAdminCompanyDetail(id);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNif, setEditNif] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !company) {
    return (
      <AdminShell activeSection="agentes" title="Cargando...">
        <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
          Cargando empresa...
        </Text>
      </AdminShell>
    );
  }

  const plan = PLAN_META[company.plan] ?? PLAN_META.agency;
  const initials = company.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const activeAgentCount = agents.filter(a => a.active).length;
  const basePrice = plan.price ?? 0;
  const monthlyTotal = basePrice * activeAgentCount;

  const showUpgrade = company.plan === 'agency' && (
    activeAgentCount / plan.maxAgents > 0.7 ||
    clientCount / plan.maxClients > 0.7 ||
    productCount / plan.maxProducts > 0.7
  );

  function startEdit() {
    setEditName(company!.name);
    setEditNif(company!.nif ?? '');
    setEditAddress(company!.address ?? '');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await updateCompany({ name: editName, nif: editNif, address: editAddress });
    setSaving(false);
    if (error) toast.error(error);
    else { setEditing(false); toast.success('Empresa actualizada'); }
  }

  async function handleToggleActive() {
    Alert.alert(
      company!.active ? 'Suspender empresa' : 'Activar empresa',
      `¿${company!.active ? 'Suspender' : 'Activar'} a ${company!.name}? ${company!.active ? 'Los agentes perderán acceso.' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: company!.active ? 'Suspender' : 'Activar',
          style: company!.active ? 'destructive' : 'default',
          onPress: async () => {
            const { error } = await toggleActive(!company!.active);
            if (error) toast.error(error);
          },
        },
      ]
    );
  }

  async function handleProposeUpgrade() {
    // Buscar el email del admin de la empresa
    const adminAgent = agents.find(a => a.role === 'admin');
    const email = adminAgent?.email ?? '';
    if (!email) { toast.error('No se encontró un admin con email en esta empresa'); return; }

    const subject = `Nudofy · Propuesta de upgrade a Agencia Pro — ${company!.name}`;
    const body =
`Hola,

Hemos revisado el uso de tu cuenta en Nudofy y queremos proponerte una mejora de plan.

Tu empresa ${company!.name} está utilizando actualmente el plan Agencia y se está acercando a los límites:
• Agentes activos: ${activeAgentCount} / ${plan.maxAgents}
• Clientes: ${clientCount} / ${plan.maxClients}
• Productos: ${productCount} / ${plan.maxProducts}

El plan Agencia Pro (79 €/mes) te ofrece:
• Agentes ilimitados
• Clientes ilimitados
• Productos ilimitados
• Soporte prioritario

Si quieres saber más o hacer el cambio, responde a este email y te ayudamos en el proceso.

Un saludo,
Equipo Nudofy`;

    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error('No se pudo abrir el cliente de correo'); return; }
    await Linking.openURL(url);
  }

  return (
    <AdminShell activeSection="agentes" title="Ficha de empresa">
      {/* Breadcrumb + acciones */}
      <View style={styles.pageHeader}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.breadcrumb, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Icon name="ArrowLeft" size={16} color={colors.ink2} />
          <Text variant="smallMedium" color="ink2">Agentes</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.pageActions}>
          <Button
            label={company.active ? 'Suspender' : 'Activar'}
            variant="secondary"
            size="sm"
            onPress={handleToggleActive}
          />
          {editing ? (
            <Button label="Guardar" size="sm" onPress={handleSave} loading={saving} />
          ) : (
            <Button label="Editar" size="sm" onPress={startEdit} />
          )}
        </View>
      </View>

      {/* Cabecera empresa */}
      <View style={styles.companyHeader}>
        <View style={styles.companyAv}>
          <Text variant="heading" color="ink2">{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading">{company.name}</Text>
          <Text variant="caption" color="ink3">Alta: {formatDate(company.created_at)}</Text>
          <View style={styles.companyMeta}>
            <Badge label={`Plan ${plan.label}`} variant="neutral" />
            <Badge
              label={company.active ? 'Activo' : 'Suspendido'}
              variant={company.active ? 'success' : 'neutral'}
            />
          </View>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label="Agentes activos"
          value={`${activeAgentCount}${plan.maxAgents < 999 ? ` / ${plan.maxAgents}` : ''}`}
          sub={plan.maxAgents < 999 ? `${plan.maxAgents - activeAgentCount} plazas disponibles` : 'Ilimitados'}
        />
        <KpiCard
          label="Clientes totales"
          value={`${clientCount.toLocaleString('es-ES')}${plan.maxClients < 999999 ? ` / ${plan.maxClients.toLocaleString('es-ES')}` : ''}`}
          sub={plan.maxClients < 999999 ? `${(plan.maxClients - clientCount).toLocaleString('es-ES')} disponibles` : 'Ilimitados'}
        />
        <KpiCard
          label="Productos en catálogo"
          value={`${productCount.toLocaleString('es-ES')}${plan.maxProducts < 999999 ? ` / ${plan.maxProducts.toLocaleString('es-ES')}` : ''}`}
          sub={plan.maxProducts < 999999 ? `${(plan.maxProducts - productCount).toLocaleString('es-ES')} disponibles` : 'Ilimitados'}
        />
        <KpiCard
          label="Facturación mensual"
          value={formatEur(monthlyTotal)}
          sub={`${activeAgentCount} agentes × ${basePrice} €/mes`}
          accent
        />
      </View>

      {/* Upgrade banner */}
      {showUpgrade && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeIcon}>
            <Icon name="TrendingUp" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyMedium">Sugerencia · Plan Agencia Pro</Text>
            <Text variant="caption" color="ink3">
              Esta empresa se acerca a los límites del plan Agencia. Agencia Pro ofrece todo ilimitado.
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: space[1] }}>
              <Button label="Proponer upgrade" variant="secondary" size="sm" onPress={handleProposeUpgrade} />
            </View>
          </View>
        </View>
      )}

      {/* Datos empresa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">Datos de la empresa</Text>
          {!editing && (
            <Pressable
              onPress={startEdit}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text variant="smallMedium" color="ink2">Editar</Text>
            </Pressable>
          )}
        </View>
        {editing ? (
          <View style={styles.editBody}>
            <EditField label="Razón social">
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholderTextColor={colors.ink4} />
            </EditField>
            <EditField label="NIF / CIF">
              <TextInput style={styles.editInput} value={editNif} onChangeText={setEditNif} placeholder="B-12345678" placeholderTextColor={colors.ink4} autoCapitalize="characters" />
            </EditField>
            <EditField label="Dirección fiscal">
              <TextInput style={styles.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="C/ Mayor 1, Madrid" placeholderTextColor={colors.ink4} />
            </EditField>
            <View style={styles.editActions}>
              <Button label="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
              <Button label="Guardar" onPress={handleSave} loading={saving} />
            </View>
          </View>
        ) : (
          <>
            <FieldRow label="Razón social" value={company.name} />
            <FieldRow label="NIF" value={company.nif ?? '—'} />
            <FieldRow label="Dirección fiscal" value={company.address ?? '—'} />
            <FieldRow label="Plan activo" value={`${plan.label} · ${formatEur(monthlyTotal)}/mes`} />
            <FieldRow label="Alta" value={formatDate(company.created_at)} last />
          </>
        )}
      </View>

      {/* Uso del plan */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">Uso del plan</Text>
        </View>
        <UsageBar label="Agentes" current={activeAgentCount} max={plan.maxAgents} />
        <UsageBar label="Clientes" current={clientCount} max={plan.maxClients} />
        <UsageBar label="Productos" current={productCount} max={plan.maxProducts} last />
      </View>

      {/* Agentes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="bodyMedium">Agentes de la empresa</Text>
          <Text variant="caption" color="ink3">{agents.length}</Text>
        </View>
        {agents.length === 0 ? (
          <Text variant="small" color="ink3" align="center" style={styles.emptyText}>
            Sin agentes aún
          </Text>
        ) : (
          agents.map((agent, i) => {
            const ag2 = agent.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
            const isAdmin = agent.role === 'admin';
            return (
              <View
                key={agent.id}
                style={[styles.agentRow, i < agents.length - 1 && styles.fieldRowBorder]}
              >
                <View style={styles.agentAv}>
                  <Text variant="smallMedium" color="ink2">{ag2}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.agentNameRow}>
                    <Text variant="smallMedium">{agent.name}</Text>
                    <Badge label={isAdmin ? 'Admin' : 'Agente'} variant="neutral" />
                  </View>
                  <Text variant="caption" color="ink3">{agent.email}</Text>
                  <Text variant="caption" color="ink3">
                    {agent.client_count} clientes · {agent.order_count_month} pedidos este mes
                  </Text>
                </View>
                <Button
                  label="Ver"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push(`/(admin)/agente/${agent.id}` as any)}
                />
              </View>
            );
          })
        )}
      </View>

      {/* Facturas */}
      {invoices.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">Historial de facturas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHead}>
                {['Período', 'Importe', 'IVA', 'Total', 'Estado'].map((h, i) => (
                  <Text
                    key={h}
                    variant="caption"
                    color="ink3"
                    style={[styles.th, { width: [130, 100, 90, 100, 120][i] }]}
                  >
                    {h.toUpperCase()}
                  </Text>
                ))}
              </View>
              {invoices.map((inv, i) => {
                const statusLabel = inv.status === 'paid' ? 'Pagada' : inv.status === 'pending' ? 'Pendiente' : 'Vencida';
                const statusVariant: 'success' | 'warning' | 'danger' =
                  inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger';
                return (
                  <View
                    key={inv.id}
                    style={[styles.tableRow, i === invoices.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.td, { width: 130 }]}>
                      <Text variant="small" color="ink">{inv.period}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <Text variant="small" color="ink">{formatEur(inv.amount)}</Text>
                    </View>
                    <View style={[styles.td, { width: 90 }]}>
                      <Text variant="small" color="ink">{formatEur(inv.iva)}</Text>
                    </View>
                    <View style={[styles.td, { width: 100 }]}>
                      <Text variant="smallMedium">{formatEur(inv.total)}</Text>
                    </View>
                    <View style={[styles.td, { width: 120 }]}>
                      <Badge label={statusLabel} variant={statusVariant} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </AdminShell>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <View style={[styles.kpi, accent && styles.kpiAccent]}>
      <Text
        variant="caption"
        style={{ color: accent ? 'rgba(255,255,255,0.85)' : colors.ink3 }}
      >
        {label}
      </Text>
      <Text
        variant="heading"
        style={{ color: accent ? colors.white : colors.ink, marginTop: space[1] }}
      >
        {value}
      </Text>
      <Text
        variant="caption"
        style={{ color: accent ? 'rgba(255,255,255,0.85)' : colors.ink3, marginTop: space[1] }}
      >
        {sub}
      </Text>
    </View>
  );
}

function FieldRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text variant="small" color="ink3">{label}</Text>
      <Text variant="smallMedium" style={{ textAlign: 'right', flex: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallMedium">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    flexWrap: 'wrap',
  },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageActions: { flexDirection: 'row', gap: space[1] },

  companyHeader: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[4],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  companyAv: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  companyMeta: {
    flexDirection: 'row', gap: space[2], marginTop: space[2],
    flexWrap: 'wrap', alignItems: 'center',
  },

  kpiGrid: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  kpi: {
    flex: 1, minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
  },
  kpiAccent: { backgroundColor: colors.brand, borderColor: colors.brand },

  upgradeBanner: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    padding: space[3],
    flexDirection: 'row', gap: space[3], alignItems: 'flex-start',
  },
  upgradeIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: space[3],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },

  fieldRow: {
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    flexDirection: 'row', alignItems: 'center', gap: space[3],
  },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },

  editBody: { padding: space[3], gap: space[3] },
  editInput: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: 14, color: colors.ink,
    backgroundColor: colors.white,
  },
  editActions: { flexDirection: 'row', gap: space[2], marginTop: space[1] },

  usageRow: {
    padding: space[3],
    gap: space[1],
  },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageBarWrap: { height: 6, backgroundColor: colors.line2, borderRadius: 3, overflow: 'hidden' },
  usageBar: { height: 6, borderRadius: 3 },

  agentRow: {
    padding: space[3],
    flexDirection: 'row', alignItems: 'center', gap: space[2],
  },
  agentAv: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  agentNameRow: { flexDirection: 'row', alignItems: 'center', gap: space[1], flexWrap: 'wrap' },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  th: {
    paddingVertical: space[2] + 2, paddingHorizontal: space[3],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.line2,
    alignItems: 'center',
  },
  td: { paddingVertical: space[2] + 4, paddingHorizontal: space[3], justifyContent: 'center' },

  emptyText: { paddingVertical: space[6] },
});
