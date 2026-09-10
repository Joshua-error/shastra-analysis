import { SupabaseClient } from '@supabase/supabase-js';

const DEMO_EMAIL = 'courtside@tournament.com';
const DEMO_PASSWORD = 'Password123!';

export async function ensureCourtsideSession(supabase: SupabaseClient) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;

    // Try signing in with default courtside credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (!signInError && signInData.user) {
      return signInData.user;
    }

    // Try anonymous sign-in if enabled
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (!anonError && anonData.user) {
      return anonData.user;
    }

    // Try creating default courtside operator account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (!signUpError && signUpData.user) {
      const { data: retrySignIn } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      return retrySignIn.user ?? signUpData.user;
    }

    return null;
  } catch (err) {
    console.warn('Auto auth silent attempt:', err);
    return null;
  }
}
