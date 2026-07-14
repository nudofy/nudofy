import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserRole = 'nudofy_admin' | 'company_admin' | 'agent' | 'client';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: boolean;   // true si hay sesión pero no se pudo cargar el perfil
  retryProfile: () => void; // reintento manual (para un botón "Reintentar")
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) { lastUserId.current = session.user.id; fetchProfile(session.user.id); }
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) { lastUserId.current = session.user.id; fetchProfile(session.user.id); }
      else {
        lastUserId.current = null;
        setProfile(null);
        setProfileError(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carga el perfil reintentando ante errores transitorios (red). Un error
  // transitorio dejaba antes profile=null + loading=false → app sin salida,
  // porque todo el enrutado depende de profile.role. Ahora reintenta y, si
  // agota los intentos, marca profileError para que la UI ofrezca "Reintentar".
  async function fetchProfile(userId: string, attempt = 0) {
    setProfileError(false);
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, name')
      .eq('id', userId)
      .single();

    // Si la sesión cambió mientras cargábamos, descartar este resultado.
    if (lastUserId.current !== userId) return;

    if (!error && data) {
      setProfile(data as UserProfile);
      setProfileError(false);
      setLoading(false);
    } else if (error?.code === 'PGRST116') {
      // Fila no encontrada — usuario sin perfil, cerrar sesión.
      console.warn('[AuthContext] Perfil no encontrado, cerrando sesión');
      await supabase.auth.signOut();
    } else {
      // Error transitorio (red u otro): reintentar hasta 3 veces con backoff.
      if (attempt < 3) {
        const delay = 800 * (attempt + 1);
        console.warn(`[AuthContext] fetchProfile error, reintento ${attempt + 1}/3 en ${delay}ms:`, error?.message);
        setTimeout(() => { if (lastUserId.current === userId) fetchProfile(userId, attempt + 1); }, delay);
      } else {
        // Agotados los reintentos: dejar de cargar y señalar el error para que
        // la UI muestre una pantalla de "Reintentar" en vez de quedar colgada.
        console.error('[AuthContext] fetchProfile falló tras 3 reintentos:', error?.message);
        setProfileError(true);
        setLoading(false);
      }
    }
  }

  function retryProfile() {
    if (lastUserId.current) {
      setLoading(true);
      fetchProfile(lastUserId.current);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Usuario o contraseña incorrectos' };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'nudofy:///reset-password',
    });
    if (error) return { error: 'No se pudo enviar el email de recuperación' };
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, profileError, retryProfile, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
