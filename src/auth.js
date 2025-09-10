import { supabaseClient, state } from './store.js';
import { loadInitialData } from './api.js';
import { renderAll, showView, showToast, showAuthError, hideAuthError, showLoader } from './ui.js';

let logoutTimer;
const LOGOUT_TIME = 10 * 60 * 1000; // 10 min

function resetLogoutTimer() {
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => handleLogout(true), LOGOUT_TIME);
}

export async function handleLogin(e) {
  e.preventDefault();
  hideAuthError();
  showLoader(true);
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    console.error('Erreur de connexion:', error);
    if (error.message === 'Invalid login credentials') showAuthError("Identifiant ou mot de passe incorrect");
    else showAuthError(error.message);
  } finally {
    showLoader(false);
  }
}

export async function handleSignup(e) {
  e.preventDefault();
  hideAuthError();
  showLoader(true);
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const firstName = document.getElementById('signup-firstname').value;
  const lastName = document.getElementById('signup-lastname').value;
  try {
    const { error } = await supabaseClient.auth.signUp({
      email, password, options: { data: { first_name: firstName, last_name: lastName } }
    });
    if (error) throw error;
    showAuthError("Inscription réussie ! Veuillez vérifier vos e-mails pour confirmer votre compte.");
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    showAuthError(error.message);
  } finally {
    showLoader(false);
  }
}

export async function handleGoogleLogin() {
  await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
}

async function hardSignOut() {
  try { await supabaseClient.auth.signOut(); } catch(e) {}
  state.currentUser = null;
  state.userProfile = null;
  state.products = { sandwichs: [], boissons: [], desserts: [] };
  state.formules = [];
  state.orders = [];
  state.cart = [];
  state.promotions = [];
  clearTimeout(logoutTimer);
  showView('auth-view');
}

export function handleLogout(isTimeout = false) {
  hardSignOut();
  if (isTimeout) showToast('Vous avez été déconnecté pour inactivité.');
}

export async function initAuth() {
  showLoader(true);
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    const session = data.session;

    if (session?.user) {
      state.currentUser = { ...session.user, role: session.user.email === 'kevin.gouche@gmail.com' ? 'admin' : 'customer' };
      resetLogoutTimer();
      await loadInitialData();
      showView(state.currentUser.role === 'admin' ? 'admin-view' : 'customer-view');
      renderAll();
    } else {
      showView('auth-view');
    }
  } catch (e) {
    console.warn('initAuth error:', e);
    showView('auth-view');
  } finally {
    showLoader(false);
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      await hardSignOut();
      return;
    }

    if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          state.currentUser = { ...session.user, role: session.user.email === 'kevin.gouche@gmail.com' ? 'admin' : 'customer' };
          resetLogoutTimer();
        } else {
          await hardSignOut();
        }
        return;
    }

    if (['SIGNED_IN', 'USER_UPDATED'].includes(event)) {
      if (session?.user) {
        state.currentUser = { ...session.user, role: session.user.email === 'kevin.gouche@gmail.com' ? 'admin' : 'customer' };
        resetLogoutTimer();
        await loadInitialData();
        renderAll();
        showView(state.currentUser.role === 'admin' ? 'admin-view' : 'customer-view');
      }
    }
  });
}
