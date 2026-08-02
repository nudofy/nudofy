// A-08 · Resumen de pedido (solo lectura tras confirmar)
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Share, Linking, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Button, Icon, Badge } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Order, OrderItem, Supplier, Catalog } from '@/hooks/useAgent';
import { printAndShare } from '@/lib/pdf';
import { confirmDestructive } from '@/lib/confirm';
import { formatEur } from '@/lib/format';

// Tipos de las relaciones que devuelve el select de este screen
type OrderClient = { id: string; name: string; address?: string; email?: string };
type OrderSupplier = Pick<Supplier, 'id' | 'name' | 'email' | 'phone'> & { conditions?: string };
type OrderCatalog = Pick<Catalog, 'id' | 'name'>;
type ShippingAddress = { id: string; label: string; address?: string; city?: string; postal_code?: string };

type FullOrder = Order & {
  client?: OrderClient;
  supplier?: OrderSupplier;
  catalog?: OrderCatalog;
  shipping_address?: ShippingAddress;
};

type FullOrderItem = OrderItem & {
  product?: { name: string; reference?: string };
  attributes?: Record<string, string> | null;
};

// Los mensajes generados (email/WhatsApp/PDF a proveedor) se mantienen en
// español siempre — pertenecen a la fase de "emails transaccionales", no a
// la extracción de strings de la interfaz visible.
function formatEurEs(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/** Normaliza un teléfono para wa.me: solo dígitos con código de país.
 *  Si el número original empieza por '+' o tiene ≥10 dígitos se asume que
 *  ya incluye código de país. Si tiene exactamente 9 dígitos se añade el
 *  prefijo de España (34) como valor por defecto para el mercado actual. */
function normalizePhoneForWhatsApp(raw: string): string {
  const startsWithPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (startsWithPlus || digits.length >= 10) return digits;
  if (digits.length === 9) return '34' + digits;
  return digits;
}

function formatDateTime(iso: string, language: string) {
  const locale = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-GB' : 'es-ES';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function PedidoScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t, i18n } = useTranslation('agent');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [items, setItems] = useState<FullOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalEmail, setProposalEmail] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendEmails, setResendEmails] = useState<string[]>([]);
  const [resendCustom, setResendCustom] = useState('');
  const [sendingResend, setSendingResend] = useState(false);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('orders')
      .select(`
        id, order_number, status, total, discount_code, notes, pdf_url, created_at, sent_at,
        client:clients(id, name, address, email),
        supplier:suppliers(id, name, conditions, email, phone),
        catalog:catalogs(id, name),
        shipping_address:client_addresses(id, label, address, city, postal_code)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOrder((data as unknown) as FullOrder);
        setLoading(false);
      });

    supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, total, attributes, variant_id, product:products(name, reference)')
      .eq('order_id', id)
      .then(({ data }) => setItems(((data ?? []) as unknown) as FullOrderItem[]));
  }, [id]);

  function openProposalModal() {
    setProposalEmail(order?.client?.email ?? '');
    setShowProposalModal(true);
  }

  async function sendProposal() {
    if (!order) return;
    setSendingProposal(true);
    try {
      const lines = items.map(it => {
        const ref = it.product?.reference ? ` (${it.product.reference})` : '';
        return `• ${it.product?.name ?? '—'}${ref} — x${it.quantity} · ${formatEurEs(it.total)}`;
      }).join('\n');

      const subject = `Propuesta de pedido ${order.order_number ?? ''} · ${order.supplier?.name ?? ''}`;
      const body =
`Hola${order.client?.name ? ' ' + order.client.name : ''},

Te envío la propuesta de pedido del proveedor ${order.supplier?.name ?? '—'}:

Nº pedido: ${order.order_number ?? '—'}
Catálogo: ${order.catalog?.name ?? '—'}

Productos:
${lines}

Total: ${formatEurEs(order.total)}
${order.notes ? '\nObservaciones:\n' + order.notes + '\n' : ''}
Por favor, confírmame si estás de acuerdo.

Un saludo.`;

      const url = `mailto:${encodeURIComponent(proposalEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) { toast.error(t('order_detail.mail_client_error')); return; }
      await Linking.openURL(url);

      const { error } = await supabase.from('orders').update({ status: 'proposal_sent' }).eq('id', order.id);
      if (error) { toast.error(error.message); return; }
      setOrder(o => o ? { ...o, status: 'proposal_sent' } : o);
      setShowProposalModal(false);
      toast.success(t('order_detail.proposal_sent_toast'));
    } catch (e: any) {
      toast.error(e?.message ?? t('order_detail.proposal_error'));
    } finally {
      setSendingProposal(false);
    }
  }

  async function finalizeFromProposal() {
    if (!order) return;
    const { error } = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('order_detail.order_confirmed_toast'));
    setOrder(o => o ? { ...o, status: 'confirmed' } : o);
  }

  async function revertToDraftAndContinue() {
    if (!order) return;
    const { error } = await supabase.from('orders').update({ status: 'draft' }).eq('id', order.id);
    if (error) { toast.error(error.message); return; }
    router.replace(`/(agent)/pedido/nuevo?draftId=${order.id}` as any);
  }

  async function deleteDraft() {
    if (!order) return;
    await supabase.from('order_items').delete().eq('order_id', order.id);
    await supabase.from('orders').delete().eq('id', order.id);
    goBack();
  }

  function cancelOrder() {
    if (!order) return;
    confirmDestructive(
      t('order_detail.cancel_confirm_title'),
      t('order_detail.cancel_confirm_body'),
      async () => {
        const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
        if (error) { toast.error(error.message); return; }
        toast.success(t('order_detail.order_cancelled_toast'));
        setOrder(o => o ? { ...o, status: 'cancelled' } : o);
      },
      t('order_detail.cancel_order')
    );
  }

  function openResendModal() {
    // Pre-seleccionar email del agente
    const { data: { session } } = supabase.auth.getSession() as any;
    const emails: string[] = [];
    if (order?.supplier?.email) emails.push(order.supplier.email);
    if (order?.client?.email) emails.push(order.client.email);
    setResendEmails(emails);
    setResendCustom('');
    setShowResendModal(true);
  }

  async function handleResend() {
    if (!order) return;
    const all = [...resendEmails];
    if (resendCustom.trim()) all.push(resendCustom.trim());
    if (all.length === 0) { toast.error(t('order_detail.select_recipient_error')); return; }
    setSendingResend(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/notify-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ order_id: order.id, recipients: all }),
      });
      if (res.ok) {
        toast.success(t('order_detail.resend_success', { count: all.length }));
        setShowResendModal(false);
      } else {
        toast.error(t('order_detail.resend_error'));
      }
    } catch {
      toast.error(t('order_detail.connection_error'));
    } finally {
      setSendingResend(false);
    }
  }

  function toggleResendEmail(email: string) {
    setResendEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  }

  async function sendToSupplier() {
    if (!order) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: 'sent_to_supplier', sent_at: new Date().toISOString() })
      .eq('id', order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('order_detail.order_sent_toast'));
    setOrder(o => o ? { ...o, status: 'sent_to_supplier' } : o);
  }

  async function generatePdf() {
    if (!order) return;
    setGeneratingPdf(true);
    try {
      // Obtener imágenes de cada producto del pedido
      const productIds = items.map(i => i.product_id).filter(Boolean);
      const imageMap = new Map<string, string>(); // product_id → image_url

      if (productIds.length > 0) {
        const { data: productImages } = await supabase
          .from('products')
          .select('id, image_url')
          .in('id', productIds);
        for (const p of productImages ?? []) {
          if (p.image_url) imageMap.set(p.id, p.image_url);
        }
      }

      const formatEurLocal = (n: number) =>
        n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

      const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

      const itemsHtml = items.map(item => {
        const imgUrl = item.product_id ? imageMap.get(item.product_id) : null;
        const imgTag = imgUrl
          ? `<img src="${imgUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />`
          : `<div style="width:64px;height:64px;background:#f3f4f6;border-radius:6px;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">Sin imagen</div>`;
        const ref = item.product?.reference ? `<span style="color:#9ca3af;font-size:11px;"> · ${item.product.reference}</span>` : '';
        const variantHtml = item.attributes && Object.keys(item.attributes).length > 0
          ? `<br/><span style="color:#6b7280;font-size:11px;">${Object.entries(item.attributes).map(([k,v]) => `${k}: ${v}`).join(' · ')}</span>`
          : '';
        return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">${imgTag}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <span style="font-weight:500;">${item.product?.name ?? '—'}</span>${ref}${variantHtml}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:middle;">${item.quantity}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:middle;">${formatEurLocal(item.unit_price)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:middle;font-weight:500;">${formatEurLocal(item.total)}</td>
          </tr>`;
      }).join('');

      const shippingAddr = order.shipping_address;
      const shippingLine = shippingAddr
        ? [shippingAddr.label, shippingAddr.address, [shippingAddr.postal_code, shippingAddr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        : (order.client?.address ?? '—');

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; background: #fff; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #111827; }
    .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .logo span { color: #ef4444; }
    .order-num { font-size: 13px; color: #6b7280; text-align: right; }
    .order-num strong { display: block; font-size: 18px; color: #111827; margin-bottom: 2px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .meta-block { background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
    .meta-block h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #9ca3af; margin-bottom: 8px; }
    .meta-block p { font-size: 13px; color: #111827; line-height: 1.5; }
    .meta-block p strong { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    thead th:nth-child(3) { text-align: center; }
    thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box { background: #f9fafb; border-radius: 8px; padding: 16px 20px; min-width: 240px; }
    .totals-row { display: flex; justify-content: space-between; gap: 32px; padding: 4px 0; font-size: 13px; }
    .totals-row.total { border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; color: #ef4444; }
    .notes { background: #fff7ed; border-left: 3px solid #f97316; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #374151; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">nudo<span>fy</span></div>
    <div class="order-num">
      <strong>${order.order_number ?? '—'}</strong>
      ${new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <h3>Cliente</h3>
      <p><strong>${order.client?.name ?? '—'}</strong></p>
      <p style="color:#6b7280;font-size:12px;margin-top:4px;">Envío: ${shippingLine}</p>
    </div>
    <div class="meta-block">
      <h3>Proveedor</h3>
      <p><strong>${order.supplier?.name ?? '—'}</strong></p>
      <p style="color:#6b7280;font-size:12px;margin-top:4px;">Catálogo: ${order.catalog?.name ?? '—'}</p>
      ${order.supplier?.conditions ? `<p style="color:#6b7280;font-size:12px;">Cond.: ${order.supplier.conditions}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:72px;">Imagen</th>
        <th>Producto</th>
        <th style="width:60px;">Uds.</th>
        <th style="width:90px;">P. unit.</th>
        <th style="width:90px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal (${totalUnits} uds.)</span><span>${formatEurLocal(subtotal)}</span></div>
      ${order.discount_code ? `<div class="totals-row"><span>Descuento</span><span>${order.discount_code}</span></div>` : ''}
      <div class="totals-row total"><span>Total pedido</span><span>${formatEurLocal(order.total)}</span></div>
    </div>
  </div>

  ${order.notes ? `<div class="notes"><strong>Observaciones:</strong> ${order.notes}</div>` : ''}

  <div class="footer">Generado con Nudofy · ${new Date().toLocaleDateString('es-ES')}</div>
</body>
</html>`;

      await printAndShare({ html, filename: `pedido-${order.order_number ?? order.id.slice(0, 8)}.pdf`, dialogTitle: `Pedido ${order.order_number ?? ''}` });
    } catch (e: any) {
      toast.error(e?.message ?? t('order_detail.pdf_error'));
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function downloadImages() {
    if (!order) return;
    setGeneratingZip(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-order-images-zip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ orderId: order.id }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? t('order_detail.zip_error'));
        return;
      }
      await Linking.openURL(data.url);
      toast.success(t('order_detail.zip_success', { count: data.count }));
    } catch (e: any) {
      toast.error(e?.message ?? t('order_detail.unexpected_error'));
    } finally {
      setGeneratingZip(false);
    }
  }

  async function shareOrder() {
    await Share.share({
      message: `Pedido ${order?.order_number} · ${formatEurEs(order?.total ?? 0)}\nNudofy` });
  }

  async function emailToSupplier() {
    if (!order) return;
    const supplier = order.supplier;
    const client = order.client;
    const catalog = order.catalog;
    const shippingAddr = order.shipping_address;

    if (!supplier?.email) {
      toast.error(t('order_detail.supplier_no_email'));
      return;
    }

    const lines = items.map(it => {
      const ref = it.product?.reference ? ` (${it.product.reference})` : '';
      const name = it.product?.name ?? '—';
      const variant = it.attributes && Object.keys(it.attributes).length > 0
        ? ` [${Object.entries(it.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}]`
        : '';
      return `• ${name}${variant}${ref} — x${it.quantity} · ${formatEurEs(it.total)}`;
    }).join('\n');

    // Dirección de envío: usar la del pedido si existe, o la del cliente como fallback
    const shippingLine = shippingAddr
      ? [shippingAddr.label, shippingAddr.address, [shippingAddr.postal_code, shippingAddr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : (client?.address ?? '—');

    const subject = `Pedido ${order.order_number ?? ''} · ${client?.name ?? ''}`.trim();
    const body =
`Hola${supplier?.name ? ' ' + supplier.name : ''},

Te envío un nuevo pedido:

Nº pedido: ${order.order_number ?? '—'}
Cliente: ${client?.name ?? '—'}
Dirección de envío: ${shippingLine}
Catálogo: ${catalog?.name ?? '—'}

Líneas:
${lines}

Total: ${formatEurEs(order.total)}
${order.notes ? '\nObservaciones:\n' + order.notes + '\n' : ''}
Un saludo.`;

    const url = `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error(t('order_detail.mail_client_error')); return; }
    await Linking.openURL(url);
  }

  async function whatsappToSupplier() {
    if (!order) return;
    const supplier = order.supplier;
    const client = order.client;
    const catalog = order.catalog;
    const shippingAddr = order.shipping_address;

    if (!supplier?.phone) {
      toast.error(t('order_detail.supplier_no_phone'));
      return;
    }

    const phone = normalizePhoneForWhatsApp(supplier.phone);

    const lines = items.map(it => {
      const name = it.product?.name ?? '—';
      const variant = it.attributes && Object.keys(it.attributes).length > 0
        ? ` [${Object.entries(it.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}]`
        : '';
      return `• ${name}${variant} — x${it.quantity} · ${formatEurEs(it.total)}`;
    }).join('\n');

    // Dirección de envío: usar la del pedido si existe, o la del cliente como fallback
    const shippingLine = shippingAddr
      ? [shippingAddr.label, shippingAddr.address, [shippingAddr.postal_code, shippingAddr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : (client?.address ?? '—');

    const message =
`Hola${supplier?.name ? ' ' + supplier.name : ''},

Te paso un pedido nuevo:

*Nº pedido:* ${order.order_number ?? '—'}
*Cliente:* ${client?.name ?? '—'}
*Dirección:* ${shippingLine}
*Catálogo:* ${catalog?.name ?? '—'}

*Líneas:*
${lines}

*Total:* ${formatEurEs(order.total)}
${order.notes ? '\n*Observaciones:* ' + order.notes + '\n' : ''}
Un saludo.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) { toast.error(t('order_detail.whatsapp_error')); return; }
    await Linking.openURL(url);
  }

  if (loading || !order) {
    return (
      <Screen>
        <TopBar title={t('order_detail.top_bar_title')} onBack={() => goBack()} />
        <View style={styles.loadingWrap}>
          <Text variant="small" color="ink3">{t('order_detail.loading')}</Text>
        </View>
      </Screen>
    );
  }

  const isConfirmed = order.status === 'confirmed' || order.status === 'sent_to_supplier';

  return (
    <Screen>
      <TopBar title={t('order_detail.title')} onBack={() => goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Badge de estado */}
        {isConfirmed && (
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Icon name="Check" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{t('order_detail.status_confirmed')}</Text>
              <Text variant="small" color="ink3">{formatDateTime(order.created_at, i18n.language)}</Text>
              {order.order_number && (
                <View style={styles.orderNumPill}>
                  <Text variant="caption" color="ink2">{order.order_number}</Text>
                </View>
              )}
            </View>
            {order.status === 'sent_to_supplier' && <Badge label={t('order_detail.status_sent_badge')} variant="success" />}
          </View>
        )}
        {order.status === 'draft' && (
          <View style={styles.draftCard}>
            <Icon name="FileText" size={20} color={colors.ink2} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{t('order_detail.status_draft')}</Text>
              <View style={styles.draftActions}>
                <Button
                  label={t('order_detail.continue_order')}
                  icon="ArrowRight"
                  onPress={() => router.push(`/(agent)/pedido/nuevo?draftId=${order.id}&edit=1` as any)}
                  style={{ flex: 1 }}
                />
                {!confirmDelete ? (
                  <Button
                    label={t('order_detail.delete')}
                    icon="Trash2"
                    variant="ghost"
                    onPress={() => setConfirmDelete(true)}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <View style={styles.deleteConfirm}>
                    <Text variant="small" color="danger">{t('order_detail.confirm_delete')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button label={t('order_detail.yes')} variant="ghost" size="sm" onPress={deleteDraft} />
                      <Button label={t('order_detail.no')} variant="secondary" size="sm" onPress={() => setConfirmDelete(false)} />
                    </View>
                  </View>
                )}
              </View>
              <Button
                label={t('order_detail.send_proposal')}
                icon="Send"
                variant="secondary"
                onPress={openProposalModal}
                fullWidth
                style={{ marginTop: space[2] }}
              />
            </View>
          </View>
        )}

        {order.status === 'proposal_sent' && (
          <View style={styles.proposalCard}>
            <View style={styles.proposalIcon}>
              <Icon name="Clock" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{t('order_detail.status_proposal_sent')}</Text>
              <Text variant="small" color="ink3">{t('order_detail.waiting_approval')}</Text>
              {order.order_number && (
                <View style={styles.orderNumPill}>
                  <Text variant="caption" color="ink2">{order.order_number}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {order.status === 'cancelled' && (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Icon name="X" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{t('order_detail.status_cancelled')}</Text>
              <Text variant="small" color="ink3">{formatDateTime(order.created_at, i18n.language)}</Text>
              {order.order_number && (
                <View style={styles.orderNumPill}>
                  <Text variant="caption" color="ink2">{order.order_number}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cliente y entrega */}
        <DataBlock title={t('order_detail.client_delivery_title')} icon="User">
          <DataRow label={t('order_detail.client_label')} value={order.client?.name ?? t('order_detail.no_client')} />
          <DataRow
            label={t('order_detail.shipping_to')}
            value={
              order.shipping_address
                ? [
                    order.shipping_address.label,
                    order.shipping_address.address,
                    [order.shipping_address.postal_code, order.shipping_address.city].filter(Boolean).join(' '),
                  ].filter(Boolean).join(', ')
                : (order.client?.address ?? '—')
            }
            last
          />
        </DataBlock>

        {/* Proveedor */}
        <DataBlock title={t('order_detail.supplier_title')} icon="Truck">
          <DataRow label={t('order_detail.supplier_label')} value={order.supplier?.name ?? '—'} />
          <DataRow label={t('order_detail.catalog_label')} value={order.catalog?.name ?? '—'} />
          <DataRow label={t('order_detail.conditions_label')} value={order.supplier?.conditions ?? '—'} last />
        </DataBlock>

        {/* Líneas */}
        <DataBlock title={t('order_detail.lines_title')} icon="ListOrdered">
          {items.map((item, idx) => {
            const variantLabel = item.attributes && Object.keys(item.attributes).length > 0
              ? Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')
              : null;
            return (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  idx < items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="smallMedium">{item.product?.name ?? '—'}</Text>
                  {variantLabel ? (
                    <Text variant="caption" color="ink3">{variantLabel}</Text>
                  ) : null}
                  {item.product?.reference ? (
                    <Text variant="caption" color="ink4">{t('order_detail.ref_prefix', { ref: item.product.reference })}</Text>
                  ) : null}
                </View>
                <Text variant="smallMedium" style={styles.itemAmount}>
                  x{item.quantity} · {formatEur(item.total, i18n.language)}
                </Text>
              </View>
            );
          })}
        </DataBlock>

        {/* Totales */}
        {(() => {
          const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
          const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
          return (
            <DataBlock title={t('order_detail.totals_title')} icon="Receipt">
              <DataRow label={t('order_detail.subtotal_label', { count: totalUnits })} value={formatEur(subtotal, i18n.language)} />
              {order.discount_code && <DataRow label={t('order_detail.discount_code_label')} value={order.discount_code} />}
              <DataRow label={t('order_detail.total_order_label')} value={formatEur(order.total, i18n.language)} bold last />
            </DataBlock>
          );
        })()}

        {order.notes && (
          <View style={styles.notesCard}>
            <Text variant="caption" color="ink3" style={styles.notesLabel}>{t('order_detail.notes_label')}</Text>
            <Text variant="body" style={{ marginTop: 4 }}>{order.notes}</Text>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionsGrid}>
          <ActionBtn
            icon="FileText"
            label={generatingPdf ? t('order_detail.generating') : t('order_detail.pdf_with_images')}
            onPress={generatePdf}
            loading={generatingPdf}
          />
          <ActionBtn icon="Mail" label={t('order_detail.send_email')} onPress={emailToSupplier} />
          <ActionBtn icon="MessageCircle" label={t('order_detail.whatsapp')} onPress={whatsappToSupplier} />
          <ActionBtn icon="Share2" label={t('order_detail.share')} onPress={shareOrder} />
          <ActionBtn
            icon="Image"
            label={generatingZip ? t('order_detail.generating') : t('order_detail.images_zip')}
            onPress={downloadImages}
            loading={generatingZip}
          />
          {isConfirmed && (
            <ActionBtn icon="Send" label={t('order_detail.resend_notif')} onPress={openResendModal} />
          )}
        </View>

        {/* Finalizar desde propuesta */}
        {order.status === 'proposal_sent' && (
          <Button
            label={t('order_detail.finalize_order')}
            icon="CircleCheck"
            onPress={finalizeFromProposal}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        )}

        {/* Continuar editando pedido */}
        {(order.status === 'confirmed' || order.status === 'proposal_sent') && (
          <Button
            label={t('order_detail.continue_order')}
            icon="ShoppingCart"
            variant="secondary"
            onPress={revertToDraftAndContinue}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        )}

        {/* Enviar al proveedor */}
        {order.status === 'confirmed' && (
          <Button
            label={t('order_detail.mark_sent_to_supplier')}
            onPress={sendToSupplier}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        )}

        {/* Cancelar pedido */}
        {(isConfirmed || order.status === 'proposal_sent') && (
          <Button
            label={t('order_detail.cancel_order')}
            icon="X"
            variant="danger"
            onPress={cancelOrder}
            fullWidth
            style={{ marginTop: space[2] }}
          />
        )}
      </ScrollView>

      {/* Modal reenvío */}
      <Modal visible={showResendModal} transparent animationType="slide" onRequestClose={() => setShowResendModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[1] }}>{t('order_detail.resend_modal_title')}</Text>
              <Text variant="small" color="ink3" style={{ marginBottom: space[3] }}>
                {t('order_detail.resend_modal_hint')}
              </Text>

              {[
                order?.supplier?.email && { label: t('order_detail.supplier_prefix', { email: order.supplier.email }), email: order.supplier.email },
                order?.client?.email   && { label: t('order_detail.client_prefix', { email: order.client.email }),     email: order.client.email },
              ].filter(Boolean).map((item: any) => (
                <Pressable
                  key={item.email}
                  style={styles.resendCheck}
                  onPress={() => toggleResendEmail(item.email)}
                >
                  <View style={[styles.checkbox, resendEmails.includes(item.email) && styles.checkboxOn]}>
                    {resendEmails.includes(item.email) && <Icon name="Check" size={12} color={colors.white} />}
                  </View>
                  <Text variant="small">{item.label}</Text>
                </Pressable>
              ))}

              <Text variant="caption" color="ink3" style={[styles.modalLabel, { marginTop: space[3] }]}>
                {t('order_detail.other_email_label')}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={resendCustom}
                onChangeText={setResendCustom}
                placeholder="otro@email.com"
                placeholderTextColor={colors.ink4}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <Button label={t('order_detail.cancel')} variant="secondary" onPress={() => setShowResendModal(false)} style={{ flex: 1 }} />
                <Button label={t('order_detail.send')} icon="Send" onPress={handleResend} loading={sendingResend} style={{ flex: 2 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal propuesta */}
      <Modal visible={showProposalModal} transparent animationType="slide" onRequestClose={() => setShowProposalModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text variant="heading" style={{ marginBottom: space[1] }}>{t('order_detail.proposal_modal_title')}</Text>
              <Text variant="small" color="ink3" style={{ marginBottom: space[3] }}>
                {t('order_detail.proposal_modal_hint')}
              </Text>

              <Text variant="caption" color="ink3" style={styles.modalLabel}>{t('order_detail.client_email_label')}</Text>
              <TextInput
                style={styles.modalInput}
                value={proposalEmail}
                onChangeText={setProposalEmail}
                placeholder="correo@cliente.com"
                placeholderTextColor={colors.ink4}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalActions}>
                <Button
                  label={t('order_detail.cancel')}
                  variant="secondary"
                  onPress={() => setShowProposalModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('order_detail.send')}
                  icon="Send"
                  onPress={sendProposal}
                  loading={sendingProposal}
                  disabled={!proposalEmail.trim()}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
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

function DataRow({ label, value, bold, last }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text variant="small" color="ink3" style={{ flex: 1 }}>{label}</Text>
      {bold ? (
        <Text variant="bodyMedium" color="brand" align="right" style={{ flex: 1 }}>{value}</Text>
      ) : (
        <Text variant="smallMedium" align="right" style={{ flex: 1 }}>{value}</Text>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, onPress, loading }: { icon: IconName; label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actBtn, pressed && { backgroundColor: colors.surface2 }, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator size="small" color={colors.ink2} />
        : <Icon name={icon} size={20} color={colors.ink2} />}
      <Text variant="smallMedium" align="center">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space[3], gap: space[2] },

  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: space[2], gap: space[2],
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  itemAmount: { minWidth: 100, textAlign: 'right' },

  statusCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  statusIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  orderNumPill: {
    backgroundColor: colors.white,
    paddingHorizontal: space[2], paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  draftCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  draftActions: {
    flexDirection: 'row', gap: space[2], marginTop: space[2],
  },
  deleteConfirm: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  proposalCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  proposalIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: '#D97706',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelledCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space[3],
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
  },
  cancelledIcon: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  notesCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[3],
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: space[5], gap: space[2],
  },
  modalLabel: { marginTop: space[2] },
  modalInput: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2],
    fontSize: 14, color: colors.ink,
  },
  modalActions: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  notesLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
  block: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden',
  },
  blockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: colors.surface2,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  blockTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  dataRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  resendCheck: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxOn: {
    backgroundColor: colors.brand, borderColor: colors.brand,
  },
  actBtn: {
    width: '48%',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: space[1],
    paddingVertical: space[3],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.line,
  },
});
