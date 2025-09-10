import { supabaseClient, state } from './store.js';
import { loadInitialData } from './api.js';
import { renderAll, showView, showToast, showAuthError, hideAuthError, showLoader } from './ui.js';

let logoutTimer;
const LOGOUT_TIME = 10 * 60 * 1000; // 10 min
let hasBootstrapped = false;

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
  console.log('handleGoogleLogin: Initiating Google OAuth');
  await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
}

async function hardSignOut() {
  console.log('hardSignOut: Performing hard sign out');
  try { await supabaseClient.auth.signOut(); } catch(e) { console.error('hardSignOut error:', e); }
  state.currentUser = null;
  state.userProfile = null;
  state.products = { sandwichs: [], boissons: [], desserts: [] };
  state.formules = [];
  state.orders = [];
  state.cart = [];
  state.promotions = [];
  clearTimeout(logoutTimer);
  showView('auth-view');
  console.log('hardSignOut: State reset and auth view shown');
}

export function handleLogout(isTimeout = false) {
  console.log('handleLogout: Logging out, isTimeout:', isTimeout);
  hardSignOut();
  if (isTimeout) showToast('Vous avez été déconnecté pour inactivité.');
}

export async function bootstrapAuth() {
  console.log('bootstrapAuth: Starting bootstrap process');
  showLoader(true);
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    console.log('bootstrapAuth: getSession result - data:', data, 'error:', error);
    if (error) throw error;
    const session = data.session;

    if (session?.user) {
      console.log('bootstrapAuth: User session found:', session.user.id, session.user.email);
      state.currentUser = { ...session.user, role: session.user.email === 'kevin.gouche@gmail.com' ? 'admin' : 'customer' };
      resetLogoutTimer();
      await loadInitialData();
      showView(state.currentUser.role === 'admin' ? 'admin-view' : 'customer-view');
      renderAll();
      console.log('bootstrapAuth: User logged in, view rendered');
    } else {
      console.log('bootstrapAuth: No user session found, showing auth view');
      showView('auth-view');
    }
  } catch (e) {
    console.warn('bootstrapAuth error:', e);
    showView('auth-view');
    console.log('bootstrapAuth: Error during bootstrap, showing auth view');
  } finally {
    hasBootstrapped = true;
    showLoader(false);
    console.log('bootstrapAuth: Bootstrap process finished, hasBootstrapped = true');
  }
}

export function initAuthListeners() {
  console.log('initAuthListeners: Initializing auth state change listener');
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange: Event:', event, 'Session:', session, 'hasBootstrapped:', hasBootstrapped);
    if (!hasBootstrapped) {
      console.log('onAuthStateChange: Not bootstrapped yet, returning.');
      return;
    }

    if (event === 'SIGNED_OUT') {
      console.log('onAuthStateChange: SIGNED_OUT event');
      await hardSignOut();
      return;
    }

    if (['SIGNED_IN', 'USER_UPDATED'].includes(event)) {
      console.log('onAuthStateChange: SIGNED_IN or USER_UPDATED event');
      if (session?.user) {
        console.log('onAuthStateChange: User session found in event:', session.user.id, session.user.email);
        state.currentUser = { ...session.user, role: session.user.email === 'kevin.gouche@gmail.com' ? 'admin' : 'customer' };
        resetLogoutTimer();
        await loadInitialData();
        renderAll();
        showView(state.currentUser.role === 'admin' ? 'admin-view' : 'customer-view');
        console.log('onAuthStateChange: User logged in via event, view rendered');
      } else {
        console.log('onAuthStateChange: No user session found in event, performing hard sign out');
        await hardSignOut(); // Should not happen for SIGNED_IN/USER_UPDATED with null session
      }
    }
  });
}
