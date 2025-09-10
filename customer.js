// Customer JavaScript pour la page client
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

  // State de l'application
  let state = {
    currentUser: null,
    userProfile: null,
    products: { sandwichs: [], boissons: [], desserts: [] },
    formules: [],
    orders: [],
    cart: [],
    promotions: []
  };

  let logoutTimer;
  const LOGOUT_TIME = 10 * 60 * 1000; // 10 minutes

  // Éléments DOM
  const loader = document.getElementById('loader');
  const toast = document.getElementById('toast');
  const welcomeMessage = document.getElementById('welcome-message');
  const welcomeMessageMobile = document.getElementById('welcome-message-mobile');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
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
  
  // Receipt
  const receiptModal = document.getElementById('receipt-modal');
  const receiptCloseBtn = document.getElementById('receipt-close-btn');
  
  // Confirm modal
  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalText = document.getElementById('confirm-modal-text');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');
  
  // Logout buttons
  const logoutBtns = [
    document.getElementById('logout-btn-customer'), 
    document.getElementById('logout-btn-customer-mobile')
  ];

  // Fonctions utilitaires
  const showLoader = (show) => { 
    loader.classList.toggle('hidden', !show); 
  };
  
  const showToast = (message) => { 
    toast.textContent = message; 
    toast.classList.add('show'); 
    setTimeout(() => toast.classList.remove('show'), 3000); 
  };

  const getProduct = (id) => Object.values(state.products).flat().find(p => p.id === id);
  const getFormule = (id) => state.formules.find(f => f.id === id);

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
    const cartBadgeMobile = document.getElementById('cart-badge-mobile');
    const cartItemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
    
    [cartBadge, cartBadgeMobile].forEach(badge => {
      if (badge) {
        if (cartItemCount > 0) { 
          badge.textContent = cartItemCount; 
          badge.classList.remove('hidden'); 
        } else { 
          badge.classList.add('hidden'); 
        }
      }
    });
  };

  // Gestion de l'inactivité
  const resetLogoutTimer = () => {
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => handleLogout(true), LOGOUT_TIME);
  };
  ['mousemove','mousedown','keypress','scroll','touchstart'].forEach(ev => 
    document.addEventListener(ev, resetLogoutTimer, false)
  );

  // Vérification de l'authentification
  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) {
        window.location.href = 'login.html';
        return false;
      }
      state.currentUser = session.user;
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      window.location.href = 'login.html';
      return false;
    }
  };

  // Chargement des données
  const loadInitialData = async (showLoaderIndicator = true) => {
    if (showLoaderIndicator) showLoader(true);
    try {
      // Profile
      if (state.currentUser) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', state.currentUser.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        state.userProfile = data;
      }

      // Products
      const { data: productsData, error: productsError } = await supabaseClient
        .from('products')
        .select('*');
      if (productsError) throw productsError;
      
      state.products = { sandwichs: [], boissons: [], desserts: [] };
      productsData.forEach(p => {
        if (!state.products[p.category]) state.products[p.category] = [];
        state.products[p.category].push(p);
      });

      // Formules
      const { data: formulesData, error: formulesError } = await supabaseClient
        .from('formules')
        .select('*, formules_products(product_id)');
      if (formulesError) throw formulesError;
      
      state.formules = formulesData.map(f => {
        const eligible_products = { sandwichs: [], boissons: [], desserts: [] };
        if (f.formules_products) {
          f.formules_products.forEach(fp => {
            const product = getProduct(fp.product_id);
            if (product) {
              if (!eligible_products[product.category]) eligible_products[product.category] = [];
              eligible_products[product.category].push(product.id);
            }
          });
        }
        return { ...f, eligible_products };
      });

      // Orders
      if (state.currentUser) {
        const { data: ordersData, error: ordersError } = await supabaseClient
          .from('orders')
          .select('*, order_items(*, products(*), formules(*))')
          .eq('user_id', state.currentUser.id)
          .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;
        state.orders = ordersData;
      }

      // Promotions
      const { data: promosData, error: promosError } = await supabaseClient
        .from('promotions')
        .select('*, promotion_products(product_id), promotion_formules(formule_id)');
      if (promosError) throw promosError;
      state.promotions = promosData;

    } catch (error) {
      console.error('Error loading data:', error);
      showToast(`Erreur de chargement: ${error.message}`);
    } finally {
      if (showLoaderIndicator) showLoader(false);
    }
  };

  // Render functions
  const renderProducts = () => {
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = Object.entries(state.products).map(([category, products]) => {
      if (products.length === 0) return '';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      const productsHtml = products.filter(p => p.available).map(p => `
        <div class="bg-white rounded-lg shadow-sm flex flex-col text-center">
          <div class="p-4 flex-grow">
            <p class="font-semibold text-stone-800">${p.name}</p>
            <p class="text-stone-500 text-sm mt-2">${p.description || ''}</p>
          </div>
          <div class="p-4 border-t border-stone-100">
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-amber-600">${p.price.toFixed(2)}€</span>
              <button onclick="addToCart('product', ${p.id})" class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      `).join('');
      
      return `
        <div>
          <h3 class="text-2xl font-bold text-stone-800 mb-4">${categoryName}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${productsHtml}
          </div>
        </div>
      `;
    }).join('');
  };

  const renderFormules = () => {
    formulesContainer.innerHTML = state.formules.filter(f => f.available).map(f => `
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="p-6">
          <h3 class="text-xl font-bold text-stone-800 mb-2">${f.name}</h3>
          <p class="text-stone-500 text-sm mb-4">${f.description || ''}</p>
          <div class="text-2xl font-bold text-amber-600 mb-4">${f.price.toFixed(2)}€</div>
          <button onclick="openFormuleModal(${f.id})" class="w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition shadow-md">
            Composer
          </button>
        </div>
      </div>
    `).join('');
  };

  // Fonctions globales pour les boutons onclick
  window.addToCart = (type, id) => {
    if (type === 'product') {
      const product = getProduct(id);
      if (product) {
        const existingItem = state.cart.find(item => item.type === 'product' && item.id === id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.cart.push({ 
            type: 'product', 
            id, 
            quantity: 1, 
            price: product.price,
            category: product.category,
            name: product.name
          });
        }
        updateCartBadge();
        showToast(`${product.name} ajouté au panier`);
      }
    }
  };

  window.openFormuleModal = (formuleId) => {
    const formule = getFormule(formuleId);
    if (!formule) return;
    
    modalTitle.textContent = `Composer votre ${formule.name}`;
    modalTotalPrice.textContent = `${formule.price.toFixed(2)}€`;
    
    // Ici vous ajouteriez la logique pour composer la formule
    // Pour l'instant, on simule un ajout direct
    modalBody.innerHTML = `
      <div class="text-center">
        <p class="text-lg mb-4">Composition de la formule ${formule.name}</p>
        <p class="text-stone-600">Prix: ${formule.price.toFixed(2)}€</p>
      </div>
    `;
    
    orderModal.classList.remove('hidden');
    
    modalSubmitBtn.onclick = () => {
      const existingItem = state.cart.find(item => item.type === 'formule' && item.id === formuleId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cart.push({ 
          type: 'formule', 
          id: formuleId, 
          quantity: 1, 
          price: formule.price,
          category: 'formule',
          name: formule.name
        });
      }
      updateCartBadge();
      showToast(`${formule.name} ajouté au panier`);
      orderModal.classList.add('hidden');
    };
  };

  // Event listeners
  hamburgerBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  cartBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
      renderCart();
      cartModal.classList.remove('hidden');
    });
  });

  cartCloseBtn?.addEventListener('click', () => {
    cartModal.classList.add('hidden');
  });

  modalCloseBtn?.addEventListener('click', () => {
    orderModal.classList.add('hidden');
  });

  historyBtns.forEach(btn => {
    btn?.addEventListener('click', () => {
      renderHistory();
      historyModal.classList.remove('hidden');
    });
  });

  historyModalCloseBtn?.addEventListener('click', () => {
    historyModal.classList.add('hidden');
  });

  receiptCloseBtn?.addEventListener('click', () => {
    receiptModal.classList.add('hidden');
  });

  confirmCancelBtn?.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
  });

  // Logout
  const handleLogout = async (timeout = false) => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      
      if (timeout) {
        showToast('Session expirée. Vous avez été déconnecté.');
      }
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Erreur lors de la déconnexion');
    }
  };

  logoutBtns.forEach(btn => {
    btn?.addEventListener('click', () => handleLogout());
  });

  const renderCart = () => {
    const cartBody = document.getElementById('cart-body');
    const cartFooter = document.getElementById('cart-footer');
    
    if (state.cart.length === 0) {
      cartBody.innerHTML = '<p class="text-center text-stone-500">Votre panier est vide</p>';
      cartFooter.innerHTML = '';
      return;
    }

    let total = 0;
    cartBody.innerHTML = state.cart.map(item => {
      let itemInfo;
      if (item.type === 'product') {
        itemInfo = getProduct(item.id);
      } else {
        itemInfo = getFormule(item.id);
      }
      
      if (!itemInfo) return '';
      
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      return `
        <div class="flex justify-between items-center">
          <div>
            <p class="font-semibold">${itemInfo.name}</p>
            <p class="text-sm text-stone-500">${item.price.toFixed(2)}€ × ${item.quantity}</p>
          </div>
          <p class="font-bold">${itemTotal.toFixed(2)}€</p>
        </div>
      `;
    }).join('');

    cartFooter.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <span class="text-xl font-bold">Total: ${total.toFixed(2)}€</span>
      </div>
      <button onclick="submitOrder()" class="w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition">
        Commander
      </button>
    `;
  };

  const renderHistory = () => {
    if (state.orders.length === 0) {
      historyModalBody.innerHTML = '<p class="text-center text-stone-500">Aucune commande pour le moment</p>';
      return;
    }

    historyModalBody.innerHTML = state.orders.map(order => `
      <div class="bg-stone-50 rounded-lg p-4">
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold">Commande #${order.id}</span>
          <span class="text-sm text-stone-500">${new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <div class="text-sm text-stone-600 mb-2">
          Status: <span class="font-semibold ${['delivered', 'completed'].includes(order.status) ? 'text-green-600' : ['rejected', 'declined', 'refused', 'cancelled', 'failed'].includes(order.status) ? 'text-red-600' : order.status === 'confirmed' ? 'text-blue-600' : 'text-amber-600'}">
            ${['delivered', 'completed'].includes(order.status) ? 'Livrée' : 
              ['rejected', 'declined', 'refused', 'cancelled', 'failed'].includes(order.status) ? 'Annulée' : 
              order.status === 'confirmed' ? 'En préparation' : 'En attente'}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <div class="text-lg font-bold text-amber-600">${order.total_price.toFixed(2)}€</div>
          ${['delivered', 'completed'].includes(order.status) ? 
            `<button onclick="showReceipt(${order.id})" class="bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 transition">
              Voir le ticket
            </button>` : ''}
        </div>
      </div>
    `).join('');
  };

  // Fonction pour afficher le ticket d'une commande livrée
  window.showReceipt = (orderId) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    // Remplir le modal de reçu
    document.getElementById('receipt-date').textContent = new Date(order.created_at).toLocaleDateString();
    document.getElementById('receipt-order-id').textContent = order.id;
    
    const receiptItems = document.getElementById('receipt-items');
    receiptItems.innerHTML = order.order_items.map(item => `
      <div class="flex justify-between">
        <span>${item.products?.name || item.formules?.name} x${item.quantity}</span>
        <span>${(item.price * item.quantity).toFixed(2)}€</span>
      </div>
    `).join('');

    // Calculer les totaux
    const subtotalHT = order.total_price / 1.2; // Enlever la TVA
    const tva = order.total_price - subtotalHT;

    document.getElementById('receipt-subtotal').textContent = `${subtotalHT.toFixed(2)}€`;
    document.getElementById('receipt-tva').textContent = `${tva.toFixed(2)}€`;
    document.getElementById('receipt-total').textContent = `${order.total_price.toFixed(2)}€`;

    // Masquer les éléments de promotion si pas applicable
    document.getElementById('receipt-promo-line').classList.add('hidden');

    receiptModal.classList.remove('hidden');
  };

  window.submitOrder = async () => {
    if (state.cart.length === 0) {
      showToast('Votre panier est vide');
      return;
    }

    showLoader(true);
    try {
      const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: state.currentUser.id,
          total_price: total,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Ajouter les items de commande
      const orderItems = state.cart.map(item => ({
        order_id: order.id,
        product_id: item.type === 'product' ? item.id : null,
        formule_id: item.type === 'formule' ? item.id : null,
        quantity: item.quantity,
        price: item.price,
        category: item.category || (item.type === 'product' ? 'autre' : 'formule')
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      state.cart = [];
      updateCartBadge();
      cartModal.classList.add('hidden');
      showToast('Commande passée avec succès !');
      
      // Recharger les données
      await loadInitialData(false);
      
    } catch (error) {
      console.error('Order error:', error);
      showToast('Erreur lors de la commande');
    } finally {
      showLoader(false);
    }
  };

  // Initialisation
  const init = async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    await loadInitialData();
    
    // Mettre à jour le message de bienvenue
    if (state.userProfile) {
      const welcomeText = `Bonjour ${state.userProfile.first_name} ${state.userProfile.last_name}`;
      if (welcomeMessage) welcomeMessage.textContent = welcomeText;
      if (welcomeMessageMobile) welcomeMessageMobile.textContent = welcomeText;
    }

    renderFormules();
    renderProducts();
    updateCartBadge();
    resetLogoutTimer();
  };

  // Lancer l'initialisation
  await init();
});