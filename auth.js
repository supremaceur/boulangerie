// Auth JavaScript pour la page de connexion
document.addEventListener('DOMContentLoaded', async () => {
  // Configuration Supabase
  const SUPABASE_URL = 'https://zliusqwhpqzszjetvrpx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXVzcXdocHF6c3pqZXR2cnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE2MzgsImV4cCI6MjA3MjczNzYzOH0.Zb3InrWND0YpIUNHSHKDdPUxQzgihQOB2491VRb994E';
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Éléments DOM
  const loader = document.getElementById('loader');
  const authError = document.getElementById('auth-error');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignupBtn = document.getElementById('show-signup-btn');
  const showLoginBtn = document.getElementById('show-login-btn');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const toast = document.getElementById('toast');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotPasswordModalCloseBtn = document.getElementById('forgot-password-modal-close-btn');
  const resetPasswordModal = document.getElementById('reset-password-modal');
  const resetPasswordForm = document.getElementById('reset-password-form');

  // Fonctions utilitaires
  const showLoader = (show) => { 
    loader.classList.toggle('hidden', !show); 
  };
  
  const showToast = (message) => { 
    toast.textContent = message; 
    toast.classList.add('show'); 
    setTimeout(() => toast.classList.remove('show'), 3000); 
  };
  
  const showAuthError = (message) => { 
    authError.textContent = message; 
    authError.classList.remove('hidden'); 
  };
  
  const hideAuthError = () => { 
    authError.classList.add('hidden'); 
  };

  // Fonction de redirection après connexion
  const redirectAfterAuth = async (user) => {
    try {
      let { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('is_admin, first_name, last_name')
        .eq('id', user.id)
        .single();

      // Si le profil n'existe pas, le créer
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile for user:', user.id);
        
        // Extraire le nom et prénom depuis les métadonnées Google
        let firstName = '';
        let lastName = '';
        
        if (user.user_metadata) {
          // Vérifier d'abord les champs directs
          firstName = user.user_metadata.first_name || user.user_metadata.given_name || '';
          lastName = user.user_metadata.last_name || user.user_metadata.family_name || '';
          
          // Si pas de prénom/nom, essayer de diviser le full_name
          if (!firstName && !lastName && user.user_metadata.full_name) {
            const nameParts = user.user_metadata.full_name.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }
          
          // Si toujours vide, utiliser le name de Google
          if (!firstName && !lastName && user.user_metadata.name) {
            const nameParts = user.user_metadata.name.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }
        }

        console.log('Creating profile with:', { firstName, lastName, userMetadata: user.user_metadata });

        const { error: insertError } = await supabaseClient
          .from('profiles')
          .insert({
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            is_admin: false
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          // Récupérer le profil nouvellement créé
          const { data: newProfile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('is_admin, first_name, last_name')
            .eq('id', user.id)
            .single();
          
          if (!fetchError) {
            profile = newProfile;
          }
        }
      } else if (error) {
        console.error('Error fetching profile:', error);
      }

      // Redirection selon is_admin
      if (profile?.is_admin === true) {
        console.log('Redirecting admin user to admin panel');
        window.location.href = 'admin.html';
      } else {
        console.log('Redirecting regular user to customer panel');
        window.location.href = 'customer.html';
      }
    } catch (error) {
      console.error('Error during redirect:', error);
      window.location.href = 'customer.html';
    }
  };

  // Vérifier si l'utilisateur est déjà connecté
  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        await redirectAfterAuth(session.user);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  // Gestion du basculement entre formulaires
  showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAuthError();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });

  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAuthError();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  // Gestion de la connexion
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    showLoader(true);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        showToast('Connexion réussie !');
        await redirectAfterAuth(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      showAuthError(error.message || 'Erreur de connexion');
    } finally {
      showLoader(false);
    }
  });

  // Gestion de l'inscription
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    showLoader(true);

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Créer le profil utilisateur
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            is_admin: false
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          showAuthError('Erreur lors de la création du profil utilisateur');
          return;
        }

        console.log('Profile created successfully for user:', data.user.id);
        showToast('Inscription réussie ! Vérifiez votre email.');
        // Basculer vers le formulaire de connexion
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showAuthError(error.message || 'Erreur lors de l\'inscription');
    } finally {
      showLoader(false);
    }
  });

  // Gestion de la connexion Google
  googleLoginBtn.addEventListener('click', async () => {
    hideAuthError();
    showLoader(true);

    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/index.html'
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Google login error:', error);
      showAuthError('Erreur de connexion avec Google');
      showLoader(false);
    }
  });

  // Gestion du mot de passe oublié
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.classList.remove('hidden');
  });

  forgotPasswordModalCloseBtn.addEventListener('click', () => {
    forgotPasswordModal.classList.add('hidden');
  });

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const email = document.getElementById('forgot-email').value;

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login.html'
      });

      if (error) {
        throw error;
      }

      showToast('Email de réinitialisation envoyé !');
      forgotPasswordModal.classList.add('hidden');
    } catch (error) {
      console.error('Password reset error:', error);
      showToast('Erreur lors de l\'envoi de l\'email');
    } finally {
      showLoader(false);
    }
  });

  // Gestion de la réinitialisation du mot de passe
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const newPassword = document.getElementById('new-password').value;

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      showToast('Mot de passe mis à jour !');
      resetPasswordModal.classList.add('hidden');
    } catch (error) {
      console.error('Password update error:', error);
      showToast('Erreur lors de la mise à jour du mot de passe');
    } finally {
      showLoader(false);
    }
  });

  // Vérifier les paramètres URL pour la réinitialisation du mot de passe
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type') === 'recovery') {
    resetPasswordModal.classList.remove('hidden');
  }

  // Vérifier le statut d'authentification au chargement
  await checkAuthStatus();
});