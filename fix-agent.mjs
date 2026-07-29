// AUDITORÍA DE SEGURIDAD (28 jul 2026): este script tenía la Supabase
// service_role key de PRODUCCIÓN hardcodeada en texto plano, commiteada y
// pusheada al repo remoto (github.com/nudofy/nudofy, commit 26d66d3, 10 may
// 2026). La service_role key salta TODAS las políticas RLS — es la llave
// maestra de la base de datos completa.
//
// Se ha quitado el valor literal de aquí, pero ESO NO DESHACE LA FILTRACIÓN:
// la clave ya viajó al repo remoto. Acción obligatoria pendiente para Jorge
// (no se puede hacer desde este entorno): Supabase Dashboard → Settings →
// API → Service role key → "Reset" (rotar), y actualizar el secreto en todos
// los sitios donde se usa (Edge Functions ya la leen de variable de entorno,
// no del código, así que solo hay que actualizar el valor del secret).
//
// A partir de ahora: SIEMPRE pasar SUPABASE_URL/SERVICE_KEY por variable de
// entorno (nunca hardcodeado), ej.:
//   SUPABASE_URL=https://xxx.supabase.co SERVICE_KEY=eyJ... node fix-agent.mjs
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.FIX_AGENT_EMAIL ?? "baquearisti@gmail.com";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const headers = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// 1. Buscar UUID del usuario en Auth
const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${EMAIL}`, { headers });
const usersData = await usersRes.json();
const user = usersData.users?.[0];

if (!user) {
  console.error("❌ Usuario no encontrado en Auth:", EMAIL);
  process.exit(1);
}
console.log("✅ Usuario encontrado:", user.id);

// 2. Comprobar si ya existe en agents
const checkRes = await fetch(
  `${SUPABASE_URL}/rest/v1/agents?email=eq.${EMAIL}&select=id`,
  { headers: { ...headers, "Prefer": "return=representation" } }
);
const existing = await checkRes.json();
if (existing.length > 0) {
  console.log("⚠️  Ya existe en tabla agents:", existing[0].id);
  process.exit(0);
}

// 3. Insertar en agents
const trialExpiry = new Date();
trialExpiry.setDate(trialExpiry.getDate() + 30);

const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
  method: "POST",
  headers: { ...headers, "Prefer": "return=representation" },
  body: JSON.stringify({
    user_id: user.id,
    name: "Jorge",
    email: EMAIL,
    plan: "free_pro",
    plan_expires_at: trialExpiry.toISOString(),
    active: true,
  }),
});

const inserted = await insertRes.json();
if (!insertRes.ok) {
  console.error("❌ Error insertando:", JSON.stringify(inserted));
  process.exit(1);
}
console.log("✅ Agente creado correctamente:", JSON.stringify(inserted[0] ?? inserted));
