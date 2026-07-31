-- Bug reportado por un cliente real (Sindiseca Toys) el 31 jul 2026: cancelar
-- un pedido daba "new row for relation orders violates check constraint
-- orders_status_check".
--
-- La restricción real en produccion (confirmada contra pg_constraint, no
-- contra schema.sql que estaba desactualizado una vez mas) era:
--   CHECK (status = ANY (ARRAY['draft','confirmed','sent_to_supplier',
--     'delivered','proposal_sent']))
-- Falta 'cancelled' — el valor que usa app/(agent)/pedido/[id].tsx al
-- cancelar. Probablemente se perdio en un ALTER anterior que anadio
-- 'delivered'/'proposal_sent' sin volver a incluir 'cancelled'. Esto rompia
-- la cancelacion de pedidos para TODOS los agentes, no solo Sindiseca Toys.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text, 'confirmed'::text, 'sent_to_supplier'::text,
    'delivered'::text, 'proposal_sent'::text, 'cancelled'::text
  ]));

NOTIFY pgrst, 'reload schema';
