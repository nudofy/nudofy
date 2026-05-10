const SUPABASE_URL = "https://bpdtjjhexygryvxrhivl.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZHRqamhleHlncnl2eHJoaXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU3NTUxNCwiZXhwIjoyMDkxMTUxNTE0fQ.3SbvUaWsgBGErKYDCs3hrZtr2lAKjd-EyIEdC3RI0RU";
const EMAIL = "baquearisti@gmail.com";

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
