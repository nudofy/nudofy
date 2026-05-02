// ─── Esquemas de validación con zod ─────────────────────────────────────────
// Importar desde aquí en cualquier formulario:
//   import { LoginSchema, ClientSchema, ProductSchema, SupplierSchema, validate } from '@/lib/validation';
//
// `validate(schema, data)` devuelve `{ ok: true, data }` o `{ ok: false, errors }`
// con el primer error por campo, listo para mostrar en UI.

import { z } from 'zod';

// ─── Helpers ────────────────────────────────────────────────────────────────
const trimmedString = (min = 1, max = 255) =>
  z.string().trim().min(min, `Mínimo ${min} caracteres`).max(max, `Máximo ${max} caracteres`);

const optionalTrim = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z.string().max(500).optional().nullable(),
).transform((v) => (v === '' ? null : v));

const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Email inválido');

const optionalEmail = z
  .string()
  .trim()
  .email('Email inválido')
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v : null));

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d\s().-]{6,}$/, 'Teléfono inválido')
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v : null));

// NIF/CIF español muy permisivo (8 dígitos + letra, o letra + 7 dígitos + letra/dígito)
const nifSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{8,9}$/i, 'NIF/CIF con formato inválido (8-9 caracteres)')
  .or(z.literal(''))
  .optional()
  .nullable()
  .transform((v) => (v && v !== '' ? v.toUpperCase() : null));

// ─── Login ──────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Cliente ────────────────────────────────────────────────────────────────
export const ClientSchema = z.object({
  name: trimmedString(2, 120),
  fiscal_name: optionalTrim,
  nif: nifSchema,
  email: optionalEmail,
  phone: phoneSchema,
  address: optionalTrim,
  contact_name: optionalTrim,
  client_type: optionalTrim,
  payment_method: optionalTrim,
  notes: optionalTrim,
  tariff_id: z.string().uuid().nullable().optional(),
});
export type ClientInput = z.infer<typeof ClientSchema>;

// ─── Proveedor ──────────────────────────────────────────────────────────────
export const SupplierSchema = z.object({
  name: trimmedString(2, 120),
  contact: optionalTrim,
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalTrim,
  description: optionalTrim,
});
export type SupplierInput = z.infer<typeof SupplierSchema>;

// ─── Producto ───────────────────────────────────────────────────────────────
const numericLike = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'));
      return Number.isNaN(n) ? v : n;
    }
    return v;
  },
  z.number({ invalid_type_error: 'Debe ser un número' }).optional(),
);

export const ProductSchema = z.object({
  name: trimmedString(1, 200),
  reference: optionalTrim,
  price: numericLike.refine((v) => v === undefined || v >= 0, 'El precio no puede ser negativo'),
  vat_rate: numericLike.refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    'IVA fuera de rango (0–100)',
  ),
  description: optionalTrim,
  family: optionalTrim,
  subfamily: optionalTrim,
});
export type ProductInput = z.infer<typeof ProductSchema>;

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
