/**
 * Supabase Configuration & Authentication Client
 * Project: Resume (znsgjsihddcnbxchgrot)
 */

window.SUPABASE_URL = "https://znsgjsihddcnbxchgrot.supabase.co";
window.SUPABASE_ANON_KEY = localStorage.getItem('sb_anon_key') || "";
window.supabaseClient = null;

function getCreateClientFn() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    return window.supabase.createClient;
  }
  if (typeof window.createClient === 'function') {
    return window.createClient;
  }
  return null;
}

function initSupabase() {
  const createClientFn = getCreateClientFn();
  if (createClientFn && window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.length > 20) {
    try {
      window.supabaseClient = createClientFn(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return true;
    } catch (e) {
      console.warn("Error initializing Supabase client:", e);
      return false;
    }
  }
  return false;
}

function setSupabaseAnonKey(newKey) {
  if (newKey && newKey.trim()) {
    window.SUPABASE_ANON_KEY = newKey.trim();
    localStorage.setItem('sb_anon_key', window.SUPABASE_ANON_KEY);
    initSupabase();
    return true;
  }
  return false;
}
