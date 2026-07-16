import {
  LoginSchema,
  ClientSchema,
  SupplierSchema,
  ProductSchema,
  validate,
} from '@/lib/validation';

describe('LoginSchema', () => {
  it('acepta email y contraseña válidos', () => {
    const res = validate(LoginSchema, { email: 'jorge@nudofy.com', password: 'secreto123' });
    expect(res.ok).toBe(true);
  });

  it('rechaza un email con formato inválido', () => {
    const res = validate(LoginSchema, { email: 'no-es-un-email', password: 'secreto123' });
    expect(res.ok).toBe(false);
  });

  it('rechaza contraseña vacía', () => {
    const res = validate(LoginSchema, { email: 'jorge@nudofy.com', password: '' });
    expect(res.ok).toBe(false);
  });
});

describe('ClientSchema', () => {
  it('acepta un cliente mínimo válido', () => {
    const res = validate(ClientSchema, { name: 'Moda Norte S.L.' });
    expect(res.ok).toBe(true);
  });

  it('rechaza un nombre demasiado corto', () => {
    const res = validate(ClientSchema, { name: 'A' });
    expect(res.ok).toBe(false);
  });

  it('convierte un NIF válido a mayúsculas', () => {
    const res = validate(ClientSchema, { name: 'Moda Norte S.L.', nif: 'b12345678' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.nif).toBe('B12345678');
  });

  it('rechaza un NIF con formato inválido', () => {
    const res = validate(ClientSchema, { name: 'Moda Norte S.L.', nif: '123' });
    expect(res.ok).toBe(false);
  });

  it('convierte campos opcionales vacíos a null en vez de string vacío', () => {
    const res = validate(ClientSchema, { name: 'Moda Norte S.L.', email: '', phone: '', nif: '' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.email).toBeNull();
      expect(res.data.phone).toBeNull();
      expect(res.data.nif).toBeNull();
    }
  });

  it('rechaza un email opcional con formato inválido', () => {
    const res = validate(ClientSchema, { name: 'Moda Norte S.L.', email: 'no-valido' });
    expect(res.ok).toBe(false);
  });
});

describe('SupplierSchema', () => {
  it('acepta un proveedor mínimo válido', () => {
    const res = validate(SupplierSchema, { name: 'Textiles Pérez' });
    expect(res.ok).toBe(true);
  });

  it('rechaza un proveedor sin nombre', () => {
    const res = validate(SupplierSchema, { name: '' });
    expect(res.ok).toBe(false);
  });
});

describe('ProductSchema', () => {
  it('acepta un producto con precio como string con coma decimal', () => {
    const res = validate(ProductSchema, { name: 'Camiseta básica', price: '19,90' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.price).toBeCloseTo(19.9);
  });

  it('rechaza un precio negativo', () => {
    const res = validate(ProductSchema, { name: 'Camiseta básica', price: -5 });
    expect(res.ok).toBe(false);
  });

  it('rechaza un IVA fuera de rango (0-100)', () => {
    const res = validate(ProductSchema, { name: 'Camiseta básica', vat_rate: 150 });
    expect(res.ok).toBe(false);
  });

  it('acepta un producto sin precio ni IVA (opcionales)', () => {
    const res = validate(ProductSchema, { name: 'Camiseta básica' });
    expect(res.ok).toBe(true);
  });
});

describe('validate()', () => {
  it('devuelve firstError con el mensaje del primer campo inválido', () => {
    const res = validate(LoginSchema, { email: '', password: '' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(typeof res.firstError).toBe('string');
  });
});
