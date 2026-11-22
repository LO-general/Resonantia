import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const DEFAULT_SUPABASE_URL = 'https://cszycxjiurmwdtkuzaql.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1HYiJ1Wf9gsL72PykUjYsg_TpVS6lxY';
const ADMIN_EMAILS = ['loris.novel@gmail.com'];

export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY: string =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export function isAdminEmailAddress(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function supabaseToUserProfile(sbUser: SupabaseUser): UserProfile {
  const meta = (sbUser.user_metadata || {}) as Record<string, any>;
  const rawAge = meta.age !== undefined && meta.age !== null ? Number(meta.age) : undefined;
  return {
    uid: sbUser.id,
    email: sbUser.email || null,
    displayName:
      meta.display_name ||
      meta.full_name ||
      sbUser.email?.split('@')[0] ||
      'Créateur',
    age: Number.isFinite(rawAge) ? rawAge : undefined,
    photoURL: meta.avatar_url || null,
    createdAt: sbUser.created_at,
    role: isAdminEmailAddress(sbUser.email) ? 'admin' : meta.role === 'admin' ? 'admin' : 'user',
  };
}

function formatSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Un compte existe déjà avec cette adresse email.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Adresse email ou code secret incorrect.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Votre adresse email n’est pas encore confirmée. Vérifiez votre boîte mail et cliquez sur le lien de confirmation.';
  }
  if (lower.includes('password should be at least')) {
    return 'Le code secret doit contenir au moins 6 caractères.';
  }
  if (lower.includes('unable to validate email')) {
    return 'Adresse email invalide.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
  }
  return message;
}

export interface SupabaseSignUpResult {
  user: UserProfile;
  requiresEmailConfirmation: boolean;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  displayName?: string,
  age?: number
): Promise<SupabaseSignUpResult> {
  const supabase = getSupabaseClient();
  const trimmedEmail = email.trim();
  const cleanName = displayName?.trim() || trimmedEmail.split('@')[0] || 'Créateur';
  const role: 'admin' | 'user' = isAdminEmailAddress(trimmedEmail) ? 'admin' : 'user';

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      data: {
        display_name: cleanName,
        age: typeof age === 'number' && Number.isFinite(age) ? age : null,
        role,
      },
    },
  });

  if (error) {
    throw new Error(formatSupabaseAuthError(error.message));
  }
  if (!data.user) {
    throw new Error('Impossible de créer le compte sur Supabase.');
  }

  const profile = supabaseToUserProfile(data.user);
  profile.displayName = cleanName;
  if (typeof age === 'number') profile.age = age;

  // Non-blocking attempt to sync profile row if a `profiles` table exists in Supabase
  if (data.session) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: trimmedEmail,
          display_name: cleanName,
          age: typeof age === 'number' ? age : null,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Optional table: ignore if not provisioned yet
    }
  }

  return {
    user: profile,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signInWithSupabase(email: string, password: string): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(formatSupabaseAuthError(error.message));
  }
  if (!data.user) {
    throw new Error('Connexion impossible.');
  }

  return supabaseToUserProfile(data.user);
}

export async function signInWithGoogleSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) {
    throw new Error(formatSupabaseAuthError(error.message));
  }
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function resetSupabasePassword(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  if (error) {
    throw new Error(formatSupabaseAuthError(error.message));
  }
}
