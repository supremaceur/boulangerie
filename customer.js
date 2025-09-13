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

  // Modal body lock utilities
  const lockBody = () => {
    document.body.style.overflow = 'hidden';
  };

  const unlockBody = () => {
    document.body.style.overflow = '';
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
      if (formulesError) {
        console.error('Formules error:', formulesError);
        throw formulesError;
      }
      
      console.log('Raw formules data:', formulesData);
      
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
      
      console.log('Processed formules:', state.formules);

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
      const productsHtml = products.filter(p => p.available).map(p => {
        const promo = getPromotionForItem({type: 'product', id: p.id});
        const newPrice = promo ? p.price * (1 - promo.discount_percentage / 100) : p.price;

        return `
        <div class="bg-white rounded-lg shadow-sm flex flex-col text-center">
          <div class="p-4 flex-grow">
            <p class="font-semibold text-stone-800">${p.name}</p>
            <p class="text-stone-500 text-sm mt-2">${p.description || ''}</p>
          </div>
          <div class="p-4 border-t border-stone-100">
            <div class="flex justify-between items-center">
              <div>
                ${'''promo ? `
                  <span class="text-lg font-bold text-red-500 line-through">${p.price.toFixed(2)}€</span>
                  <span class="text-lg font-bold text-amber-600">${newPrice.toFixed(2)}€</span>
                ` : `
                  <span class="text-lg font-bold text-amber-600">${p.price.toFixed(2)}€</span>
                `'''}
              </div>
              <button onclick="addToCart('product', ${p.id})" class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      `}).join('');
      
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
    console.log('Formules to render:', state.formules);
    
    if (!state.formules || state.formules.length === 0) {
      formulesContainer.innerHTML = '<p class="text-center text-stone-500 col-span-full">Aucune formule disponible pour le moment</p>';
      return;
    }
    
    formulesContainer.innerHTML = state.formules.map(f => `
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
    
    // Créer l'interface de composition avec les produits éligibles
    let compositionHTML = `<div class="space-y-6">`;
    
    if (formule.eligible_products) {
      Object.entries(formule.eligible_products).forEach(([category, productIds]) => {
        if (productIds.length > 0) {
          compositionHTML += `
            <div class="bg-stone-50 rounded-lg p-4">
              <h4 class="font-semibold text-stone-700 mb-3 capitalize">${category}</h4>
              <div class="space-y-2">
                ${productIds.map(productId => {
                  const product = getProduct(productId);
                  if (!product) return '';
                  return `
                    <label class="flex items-center gap-3 p-2 hover:bg-stone-100 rounded-lg cursor-pointer">
                      <input type="radio" 
                             name="formule-${category}" 
                             value="${product.id}" 
                             class="text-amber-600 focus:ring-amber-500">
                      <span class="flex-1">${product.name}</span>
                      <span class="text-sm text-stone-500">${product.price.toFixed(2)}€</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }
      });
    }
    
    if (compositionHTML === `<div class="space-y-6">`) {
      compositionHTML += `
        <div class="text-center py-8">
          <p class="text-stone-500">Cette formule n'a pas encore de produits définis.</p>
          <p class="text-sm text-stone-400 mt-2">Elle sera ajoutée telle quelle au panier.</p>
        </div>
      `;
    }
    
    compositionHTML += `</div>`;
    modalBody.innerHTML = compositionHTML;
    
    orderModal.classList.remove('hidden');
    
    modalSubmitBtn.onclick = () => {
      // Récupérer les produits sélectionnés
      const selectedProducts = {};
      const radioInputs = modalBody.querySelectorAll('input[type="radio"]:checked');
      
      radioInputs.forEach(input => {
        const category = input.name.replace('formule-', '');
        const productId = parseInt(input.value);
        const product = getProduct(productId);
        if (product) {
          selectedProducts[category] = {
            id: productId,
            name: product.name,
            price: product.price
          };
        }
      });
      
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
          name: formule.name,
          selectedProducts: selectedProducts
        });
      }
      
      updateCartBadge();
      const compositionText = Object.keys(selectedProducts).length > 0 
        ? ` avec ${Object.values(selectedProducts).map(p => p.name).join(', ')}`
        : '';
      showToast(`${formule.name}${compositionText} ajouté au panier`);
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
      lockBody();
    });
  });

  historyModalCloseBtn?.addEventListener('click', () => {
    historyModal.classList.add('hidden');
    unlockBody();
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
        <div class="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
          <div class="flex-1">
            <p class="font-semibold">${itemInfo.name}</p>
            <p class="text-sm text-stone-500">${item.price.toFixed(2)}€ chacun</p>
            ${item.description ? `<p class="text-xs text-stone-400">${item.description}</p>` : ''}
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <button onclick="updateCartQuantity(${state.cart.indexOf(item)}, -1)" class="w-6 h-6 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-sm font-bold">
                -
              </button>
              <span class="w-8 text-center font-medium">${item.quantity}</span>
              <button onclick="updateCartQuantity(${state.cart.indexOf(item)}, 1)" class="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center text-sm font-bold">
                +
              </button>
            </div>
            <p class="font-bold w-16 text-right">${itemTotal.toFixed(2)}€</p>
            <button onclick="removeFromCart(${state.cart.indexOf(item)})" class="text-red-600 hover:text-red-800 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    const timeSlots = [];
    for (let h = 11; h <= 14; h++) {
        for (let m = 0; m < 60; m += 15) {
            if (h === 14 && m > 0) continue;
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            timeSlots.push(time);
        }
    }
    const timeSelectorHtml = `
      <div class="mt-4">
        <label for="cart-pickup-time" class="block text-sm font-medium text-stone-600 mb-1">Heure de retrait</label>
        <select id="cart-pickup-time" class="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white">
          ${timeSlots.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
    `;

    cartFooter.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <span class="text-xl font-bold">Total: ${total.toFixed(2)}€</span>
      </div>
      ${timeSelectorHtml}
      <button onclick="submitOrder()" class="w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition mt-4">
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
        ${['rejected', 'declined', 'refused', 'cancelled', 'failed'].includes(order.status) && order.refuse_reason ?
          `<div class="text-sm text-red-600 mb-2">Motif du refus: ${order.refuse_reason}</div>` : ''}
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

  window.removeFromCart = (index) => {
    if (index >= 0 && index < state.cart.length) {
      const removedItem = state.cart[index];
      state.cart.splice(index, 1);
      
      // Mettre à jour l'affichage
      renderCart();
      updateCartBadge();
      
      // Notification
      const itemInfo = removedItem.type === 'product' 
        ? getProduct(removedItem.id) 
        : getFormule(removedItem.id);
      showToast(`${itemInfo?.name || 'Article'} retiré du panier`);
    }
  };

  window.updateCartQuantity = (index, change) => {
    if (index >= 0 && index < state.cart.length) {
      const item = state.cart[index];
      const newQuantity = item.quantity + change;
      
      if (newQuantity <= 0) {
        // Si la quantité devient 0 ou négative, supprimer l'article
        removeFromCart(index);
      } else {
        // Mettre à jour la quantité
        item.quantity = newQuantity;
        
        // Mettre à jour l'affichage
        renderCart();
        updateCartBadge();
      }
    }
  };

  window.submitOrder = async () => {
    if (state.cart.length === 0) {
      showToast('Votre panier est vide');
      return;
    }

    showLoader(true);
    try {
      const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const pickupTime = document.getElementById('cart-pickup-time').value;
      
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          user_id: state.currentUser.id,
          total_price: total,
          status: 'pending',
          pickup_time: pickupTime
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

  // Rafraîchit quand l'onglet reprend le focus
  window.addEventListener('focus', async () => {
    if (!state.currentUser) return;
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Rafraîchit quand la page redevient visible
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !state.currentUser) return;
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Lancer l'initialisation
  await init();
});ation
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

  // Rafraîchit quand l'onglet reprend le focus
  window.addEventListener('focus', async () => {
    if (!state.currentUser) return;
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Rafraîchit quand la page redevient visible
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !state.currentUser) return;
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Lancer l'initialisation
  await init();
});