// Edge Function: generate-order-images-zip
// Genera un ZIP con todas las imágenes de los productos de un pedido
// y devuelve una URL firmada válida 24 horas.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { zipSync } from 'https://esm.sh/fflate@0.8.2';

const ALLOWED_ORIGINS = [
  'https://nudofy.com',
  'https://app.nudofy.com',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 100);
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return json({ error: 'No autorizado' }, 401, origin);

    // ── Parámetros ─────────────────────────────────────────────────────────
    const { orderId } = await req.json();
    if (!orderId) return json({ error: 'orderId requerido' }, 400, origin);

    // ── Verificar acceso al pedido (agente o cliente) ──────────────────────
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, agent_id, client_id')
      .eq('id', orderId)
      .single();

    if (!order) return json({ error: 'Pedido no encontrado' }, 404, origin);

    const [{ data: agent }, { data: client }] = await Promise.all([
      supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
    ]);

    const isAgent = agent && order.agent_id === agent.id;
    const isClient = client && order.client_id === client.id;
    if (!isAgent && !isClient) return json({ error: 'Sin acceso a este pedido' }, 403, origin);

    // ── Obtener productos e imágenes del pedido ────────────────────────────
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product:products(
          id, name, reference, image_url,
          product_images(url, position)
        )
      `)
      .eq('order_id', orderId);

    if (itemsError || !items || items.length === 0) {
      return json({ error: 'No hay líneas en este pedido' }, 400, origin);
    }

    // ── Recopilar URLs de imágenes ─────────────────────────────────────────
    type ImageJob = { url: string; filename: string };
    const imageJobs: ImageJob[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const product = (item as any).product;
      if (!product) continue;

      const images: { url: string; position?: number }[] =
        product.product_images?.length > 0
          ? [...product.product_images].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          : product.image_url
            ? [{ url: product.image_url }]
            : [];

      if (images.length === 0) continue;

      const ref = sanitizeFilename(product.reference ?? product.name ?? product.id);

      images.forEach((img: any, idx: number) => {
        if (!img.url || seen.has(img.url)) return;
        seen.add(img.url);
        const ext = (img.url.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
        const filename = images.length === 1 ? `${ref}.${ext}` : `${ref}_${idx + 1}.${ext}`;
        imageJobs.push({ url: img.url, filename });
      });
    }

    if (imageJobs.length === 0) {
      return json({ error: 'Los productos de este pedido no tienen imágenes' }, 400, origin);
    }

    // ── Descargar imágenes en paralelo ────────────────────────────────────
    const zipFiles: Record<string, Uint8Array> = {};

    await Promise.all(imageJobs.map(async ({ url, filename }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        zipFiles[filename] = new Uint8Array(buffer);
      } catch {
        // Imagen no accesible, se omite
      }
    }));

    if (Object.keys(zipFiles).length === 0) {
      return json({ error: 'No se pudieron descargar las imágenes' }, 500, origin);
    }

    // ── Crear ZIP ─────────────────────────────────────────────────────────
    const zipData = zipSync(zipFiles);

    // ── Subir a Storage ───────────────────────────────────────────────────
    const orderNum = sanitizeFilename(order.order_number ?? orderId);
    const zipFilename = `${orderNum}_${Date.now()}.zip`;

    const { error: uploadError } = await supabase.storage
      .from('order-zips')
      .upload(zipFilename, zipData, { contentType: 'application/zip', upsert: true });

    if (uploadError) return json({ error: uploadError.message }, 500, origin);

    // ── URL firmada (24h) ─────────────────────────────────────────────────
    const { data: signed, error: signedError } = await supabase.storage
      .from('order-zips')
      .createSignedUrl(zipFilename, 86400);

    if (signedError || !signed) {
      return json({ error: 'Error generando URL de descarga' }, 500, origin);
    }

    return json({ url: signed.signedUrl, filename: zipFilename, count: Object.keys(zipFiles).length }, 200, origin);

  } catch (e: any) {
    return json({ error: e?.message ?? 'Error interno' }, 500, origin);
  }
});
