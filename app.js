// Saveurs Pasteur - Application JavaScript
document.addEventListener('DOMContentLoaded', async () => {
  // ===== CONFIGURATION SUPABASE =====
  const SUPABASE_URL = 'https://zliusqwhpqzszjetvrpx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXVzcXdocHF6c3pqZXR2cnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE2MzgsImV4cCI6MjA3MjczNzYzOH0.Zb3InrWND0YpIUNHSHKDdPUxQzgihQOB2491VRb994E';
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // ===== STATE GLOBAL =====
  let state = {
    currentUser: null,
    userProfile: null,
    products: { sandwichs: [], boissons: [], desserts: [] },
    formules: [],
    orders: [],
    cart: [],
    promotions: []
  };

  let chartInstances = {};
  let logoutTimer;
  const LOGOUT_TIME = 10 * 60 * 1000; // 10 minutes
  let hasBootstrapped = false;

  // ===== ÉLÉMENTS DOM =====
  const loader = document.getElementById('loader');
  const views = { 
    auth: document.getElementById('auth-view'), 
    customer: document.getElementById('customer-view'), 
    admin: document.getElementById('admin-view') 
  };
  const authError = document.getElementById('auth-error');
  
  // Auth forms
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignupBtn = document.getElementById('show-signup-btn');
  const showLoginBtn = document.getElementById('show-login-btn');
  const googleLoginBtn = document.getElementById('google-login-btn');
  
  // Logout buttons
  const logoutBtns = [
    document.getElementById('logout-btn-customer'), 
    document.getElementById('logout-btn-admin'), 
    document.getElementById('logout-btn-customer-mobile')
  ];
  
  // Navigation
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const welcomeMessage = document.getElementById('welcome-message');
  const welcomeMessageMobile = document.getElementById('welcome-message-mobile');

  // Cart
  const cartBtns = [document.getElementById('cart-btn-desktop'), document.getElementById('cart-btn-mobile')];
  const cartModal = document.getElementById('cart-modal');
  const cartCloseBtn = document.getElementById('cart-close-btn');

  // Orders and formules
  const formulesContainer = document.getElementById('formules-container');
  const orderModal = document.getElementById('order-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalTotalPrice = document.getElementById('modal-total-price');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  
  // History
  const historyBtns = [document.getElementById('history-btn'), document.getElementById('history-btn-mobile')];
  const historyModal = document.getElementById('history-modal');
  const historyModalBody = document.getElementById('history-modal-body');
  const historyModalCloseBtn = document.getElementById('history-modal-close-btn');
  
  // Admin elements
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminContents = document.querySelectorAll('.admin-content');
  const adminOrdersPendingContainer = document.getElementById('admin-orders-pending-container');
  const adminOrdersCompletedContainer = document.getElementById('admin-orders-completed-container');
  const adminOrderTabs = document.querySelectorAll('.admin-order-tab');
  const ordersTabContent = document.getElementById('orders-tab');
  const adminProductsContainer = document.getElementById('admin-products-container');
  const addProductBtn = document.getElementById('add-product-btn');
  const adminFormulesContainer = document.getElementById('admin-formules-container');
  const addFormuleBtn = document.getElementById('add-formule-btn');
  
  // Modals
  const refuseModal = document.getElementById('refuse-modal');
  const refuseReasonInput = document.getElementById('refuse-reason');
  const refuseCancelBtn = document.getElementById('refuse-cancel-btn');
  const refuseConfirmBtn = document.getElementById('refuse-confirm-btn');
  const formuleModal = document.getElementById('formule-modal');
  const formuleForm = document.getElementById('formule-form');
  const formuleModalTitle = document.getElementById('formule-modal-title');
  const formuleModalCloseBtn = document.getElementById('formule-modal-close-btn');
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const productModalCloseBtn = document.getElementById('product-modal-close-btn');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalText = document.getElementById('confirm-modal-text');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');
  const toast = document.getElementById('toast');
  const receiptModal = document.getElementById('receipt-modal');
  const receiptCloseBtn = document.getElementById('receipt-close-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotPasswordModalCloseBtn = document.getElementById('forgot-password-modal-close-btn');
  const resetPasswordModal = document.getElementById('reset-password-modal');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const promoModal = document.getElementById('promo-modal');
  const promoForm = document.getElementById('promo-form');
  const promoModalCloseBtn = document.getElementById('promo-modal-close-btn');
  const addPromoBtn = document.getElementById('add-promo-btn');
  const adminPromosContainer = document.getElementById('admin-promos-container');

  // ===== FONCTIONS UTILITAIRES =====
  const showLoader = (show) => { 
    loader.classList.toggle('hidden', !show); 
  };
  
  const showView = (viewId) => {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewId.replace('-view', '')]?.classList.remove('hidden');
  };
  
  const showToast = (message) => { 
    toast.textContent = message; 
    toast.classList.add('show'); 
    setTimeout(() => toast.classList.remove('show'), 3000); 
  };
  
  const getProduct = (id) => Object.values(state.products).flat().find(p => p.id === id);
  const getFormule = (id) => state.formules.find(f => f.id === id);
  
  const showAuthError = (message) => { 
    authError.textContent = message; 
    authError.classList.remove('hidden'); 
  };
  
  const hideAuthError = () => { 
    authError.classList.add('hidden'); 
  };
  
  const showConfirmModal = (title, text, onConfirm) => {
    confirmModalTitle.textContent = title;
    confirmModalText.textContent = text;
    confirmModal.classList.remove('hidden');
    confirmOkBtn.onclick = () => { 
      onConfirm(); 
      confirmModal.classList.add('hidden'); 
    };
  };

  const updateCartBadge = () => {
    const cartBadge = document.getElementById('cart-badge');
    const cartItemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
    if (cartItemCount > 0) { 
      cartBadge.textContent = cartItemCount; 
      cartBadge.classList.remove('hidden'); 
    } else { 
      cartBadge.classList.add('hidden'); 
    }
  };

  // NOTE: Le reste du JavaScript sera dans le fichier principal
  // Cette structure permet de séparer les pages en plusieurs fichiers
  
  // Export des fonctions principales pour les autres pages
  window.boulangerie = {
    state,
    supabaseClient,
    showLoader,
    showView,
    showToast,
    getProduct,
    getFormule,
    showAuthError,
    hideAuthError,
    showConfirmModal,
    updateCartBadge
  };
});