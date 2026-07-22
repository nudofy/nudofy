// ─── Esquemas de validación con zod ─────────────────────────────────────────
// Importar desde aquí en cualquier formulario:
//   import { LoginSchema, ClientSchema, ProductSchema, SupplierSchema, validate } from '@/lib/validation';
//
// Los mensajes dependen del idioma, así que cada Schema es una función que recibe
// la `t` de `useTranslation('validation')` y construye el esquema en ese momento.
// `validate(schema, data)` devuelve `{ ok: true, data }` o `{ ok: false, errors }`
// con el primer error por campo, listo para mostrar en UI.

import { z } from 'zod';

type TFn = (key: string, options?: Record<string, unknown>) => string;

// ─── Helpers ────────────────────────────────────────────────────────────────
const trimmedString = (t: TFn, min = 1, max = 255) =>
  z.string().trim()
    .min(min, t('min_chars', { count: min }))
    .max(max, t('max_chars', { count: max }));

const optionalTrim = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z.string().max(500).optional().nullable(),
).transform((v) => (v === '' ? null : v));

const emailSchema = (t: TFn) => z
  .string()
  .trim()
  .min(1, t('email_required'))
  .email(t('email_invalid'));

const optionalEmail = (t: TFn) => z
  .string()
  .trim()
  .email(t('email_invalid'))
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v : null));

const phoneSchema = (t: TFn) => z
  .string()
  .trim()
  .regex(/^[+\d\s().-]{6,}$/, t('phone_invalid'))
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v : null));

// NIF/CIF español muy permisivo (8 dígitos + letra, o letra + 7 dígitos + letra/dígito)
const nifSchema = (t: TFn) => z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{8,9}$/i, t('nif_invalid'))
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v.toUpperCase() : null));

// ─── Login ──────────────────────────────────────────────────────────────────
export const LoginSchema = (t: TFn) => z.object({
  email: emailSchema(t),
  password: z.string().min(1, t('password_required')),
});
export type LoginInput = z.infer<ReturnType<typeof LoginSchema>>;

// ─── Cliente ────────────────────────────────────────────────────────────────
export const ClientSchema = (t: TFn) => z.object({
  name: trimmedString(t, 2, 120),
  fiscal_name: optionalTrim,
  nif: nifSchema(t),
  email: optionalEmail(t),
  phone: phoneSchema(t),
  address: optionalTrim,
  contact_name: optionalTrim,
  client_type: optionalTrim,
  payment_method: optionalTrim,
  notes: optionalTrim,
  tariff_id: z.string().uuid().nullable().optional(),
});
export type ClientInput = z.infer<ReturnType<typeof ClientSchema>>;

// ─── Proveedor ──────────────────────────────────────────────────────────────
export const SupplierSchema = (t: TFn) => z.object({
  name: trimmedString(t, 2, 120),
  contact: optionalTrim,
  phone: phoneSchema(t),
  email: optionalEmail(t),
  address: optionalTrim,
  description: optionalTrim,
});
export type SupplierInput = z.infer<ReturnType<typeof SupplierSchema>>;

// ─── Producto ───────────────────────────────────────────────────────────────
const numericLike = (t: TFn) => z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'));
      return Number.isNaN(n) ? v : n;
    }
    return v;
  },
  z.number({ invalid_type_error: t('must_be_number') }).optional(),
);

export const ProductSchema = (t: TFn) => z.object({
  name: trimmedString(t, 1, 200),
  reference: optionalTrim,
  price: numericLike(t).refine((v) => v === undefined || v >= 0, t('price_negative')),
  vat_rate: numericLike(t).refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    t('vat_out_of_range'),
  ),
  description: optionalTrim,
  family: optionalTrim,
  subfamily: optionalTrim,
});
export type ProductInput = z.infer<ReturnType<typeof ProductSchema>>;

// ─── Validador genérico ─────────────────────────────────────────────────────
export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; firstError: string };

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): ValidationResult<z.infer<T>> {
  const res = schema.safeParse(input);
  if (res.success) return { ok: true, data: res.data };
  const errors: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) errors[path] = issue.message;
  }
  const firstError = Object.values(errors)[0] ?? 'Datos inválidos';
  return { ok: false, errors, firstError };
}
