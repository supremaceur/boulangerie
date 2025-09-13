// Customer JavaScript pour la page client - VERSION FINALE COMPLÈTE
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Customer page loaded');

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
  const productsContainer = document.getElementById('products-container');
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
    if (loader) {
      loader.classList.toggle('hidden', !show);
      console.log(`Loader ${show ? 'shown' : 'hidden'}`);
    }
  };

  const lockBody = () => {
    document.body.style.overflow = 'hidden';
  };

  const unlockBody = () => {
    document.body.style.overflow = '';
  };
  
  const showToast = (message) => { 
    console.log('Toast:', message);
    if (toast) {
      toast.textContent = message; 
      toast.classList.add('show'); 
      setTimeout(() => toast.classList.remove('show'), 3000); 
    }
  };

  const getProduct = (id) => {
    return Object.values(state.products).flat().find(p => p.id === id);
  };

  const getFormule = (id) => {
    return state.formules.find(f => f.id === id);
  };

  const showConfirmModal = (title, text, onConfirm) => {
    if (confirmModalTitle) confirmModalTitle.textContent = title;
    if (confirmModalText) confirmModalText.textContent = text;
    if (confirmModal) confirmModal.classList.remove('hidden');
    if (confirmOkBtn) {
      confirmOkBtn.onclick = () => { 
        onConfirm(); 
        confirmModal.classList.add('hidden'); 
      };
    }
  };

  const updateCartBadge = () => {
    const cartBadge = document.getElementById('cart-badge');
    const cartBadgeMobile = document.getElementById('cart-badge-mobile');
    const cartItemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
    
    [cartBadge, cartBadgeMobile].forEach(badge => {
      if (badge) {
        badge.textContent = cartItemCount;
        badge.classList.toggle('hidden', cartItemCount === 0);
      }
    });
    
    console.log('Cart badge updated:', cartItemCount);
  };

  // Fonction d'authentification
  const checkAuth = async () => {
    console.log('Checking authentication...');
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        throw error;
      }
      
      if (!session) {
        console.log('No session found, redirecting to login');
        window.location.href = 'login.html';
        return false;
      }
      
      console.log('Session found for user:', session.user.email);
      state.currentUser = session.user;
      
      // Récupérer le profil utilisateur
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.log('Profile not found, creating new profile');
        // Créer le profil s'il n'existe pas
        const { data: newProfile, error: insertError } = await supabaseClient
          .from('profiles')
          .insert([{
            id: session.user.id,
            email: session.user.email,
            first_name: '',
            last_name: '',
            is_admin: false
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('Insert profile error:', insertError);
          return false;
        }
        
        state.userProfile = newProfile;
      } else {
        state.userProfile = profile;
        
        // Rediriger les admins vers la page admin
        if (profile.is_admin) {
          console.log('Admin user detected, redirecting to admin panel');
          window.location.href = 'admin.html';
          return false;
        }
      }
      
      console.log('Authentication successful');
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      window.location.href = 'login.html';
      return false;
    }
  };

  // Charger les données initiales
  const loadInitialData = async (showLoaderFlag = true) => {
    console.log('Loading initial data...');
    if (showLoaderFlag) showLoader(true);
    
    try {
      // Charger les produits avec la colonne "available"
      console.log('Fetching products...');
      const { data: products, error: productsError } = await supabaseClient
        .from('products')
        .select('*')
        .eq('available', true)
        .order('name');
      
      if (productsError) {
        console.error('Products error:', productsError);
        throw productsError;
      }
      
      console.log('Products loaded:', products?.length || 0);
      if (products?.length > 0) {
        console.log('Sample product:', products[0]);
      }
      
      // Organiser les produits par catégorie
      state.products = {
        sandwichs: products?.filter(p => p.category === 'sandwich') || [],
        boissons: products?.filter(p => p.category === 'boisson') || [],
        desserts: products?.filter(p => p.category === 'dessert') || []
      };
      
      console.log('Products organized by category:', {
        sandwichs: state.products.sandwichs.length,
        boissons: state.products.boissons.length,
        desserts: state.products.desserts.length
      });
      
      // Charger les formules
      console.log('Fetching formules...');
      const { data: formules, error: formulesError } = await supabaseClient
        .from('formules')
        .select('*')
        .order('price');
      
      if (formulesError) {
        console.error('Formules error:', formulesError);
        throw formulesError;
      }
      
      console.log('Formules loaded:', formules?.length || 0);
      if (formules?.length > 0) {
        console.log('Sample formule:', formules[0]);
      }
      
      // Filtrer les formules disponibles si la colonne existe
      state.formules = formules?.filter(f => f.available !== false) || [];
      console.log('Available formules:', state.formules.length);
      
      // Charger les promotions (optionnel)
      console.log('Fetching promotions...');
      try {
        const { data: promotions, error: promosError } = await supabaseClient
          .from('promotions')
          .select('*');
        
        if (promosError) {
          console.log('Promotions error (non-critical):', promosError);
          state.promotions = [];
        } else {
          state.promotions = promotions || [];
          console.log('Promotions loaded:', state.promotions.length);
        }
      } catch (promoErr) {
        console.log('Promotions table might not exist, skipping...');
        state.promotions = [];
      }
      
      // Charger l'historique des commandes de l'utilisateur
      if (state.currentUser) {
        console.log('Fetching order history...');
        const { data: orders, error: ordersError } = await supabaseClient
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (name, price),
              formules (name, price)
            )
          `)
          .eq('user_id', state.currentUser.id)
          .order('created_at', { ascending: false });
        
        if (ordersError) {
          console.error('Orders error:', ordersError);
          state.orders = [];
        } else {
          console.log('Orders loaded:', orders?.length || 0);
          state.orders = orders || [];
        }
      }
      
      console.log('✅ All data loaded successfully');
      console.log('Final state summary:', {
        products: `${Object.values(state.products).flat().length} total (${state.products.sandwichs.length} sandwichs, ${state.products.boissons.length} boissons, ${state.products.desserts.length} desserts)`,
        formules: state.formules.length,
        promotions: state.promotions.length,
        orders: state.orders.length
      });
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      showToast('Erreur lors du chargement des données');
    } finally {
      if (showLoaderFlag) showLoader(false);
    }
  };

  // Afficher les formules
  const renderFormules = () => {
    console.log('Rendering formules...');
    if (!formulesContainer) {
      console.error('Formules container not found');
      return;
    }
    
    if (state.formules.length === 0) {
      formulesContainer.innerHTML = '<p class="text-center text-stone-500">Aucune formule disponible</p>';
      return;
    }
    
    formulesContainer.innerHTML = state.formules.map(formule => {
      // Déterminer les catégories incluses basé sur les colonnes booléennes
      const includedCategories = [];
      if (formule.includes_sandwich || formule.sandwich_included) includedCategories.push('Sandwich');
      if (formule.includes_boisson || formule.boisson_included) includedCategories.push('Boisson');
      if (formule.includes_dessert || formule.dessert_included) includedCategories.push('Dessert');
      
      // Si pas de colonnes booléennes, essayer une approche générique
      if (includedCategories.length === 0) {
        includedCategories.push('Formule complète');
      }
      
      const categoryNames = includedCategories.join(' + ');
      
      return `
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
          <div class="p-6">
            <h3 class="text-2xl font-bold text-stone-800">${formule.name}</h3>
            <p class="text-stone-500 mt-1 font-semibold text-amber-700">${categoryNames}</p>
            ${formule.description ? `<p class="text-stone-600 mt-2 text-sm">${formule.description}</p>` : ''}
            <div class="mt-4 text-3xl font-bold text-amber-600">${parseFloat(formule.price).toFixed(2)}€</div>
          </div>
          <div class="p-6 bg-white mt-auto">
            <button data-formule-id="${formule.id}" class="order-btn w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors duration-300 shadow-md">Commander</button>
          </div>
        </div>`;
    }).join('');
    
    // Ajouter les event listeners pour les boutons de commande
    formulesContainer.addEventListener('click', (e) => {
      const orderBtn = e.target.closest('.order-btn');
      if (orderBtn) {
        const formuleId = parseInt(orderBtn.dataset.formuleId);
        console.log('Opening formule modal for ID:', formuleId);
        openFormuleModal(formuleId);
      }
    });
    
    console.log('Formules rendered');
  };

  // Afficher les produits
  const renderProducts = () => {
    console.log('Rendering products...');
    if (!productsContainer) {
      console.error('Products container not found');
      return;
    }
    
    const categories = [
      { key: 'sandwichs', name: 'Sandwichs', products: state.products.sandwichs },
      { key: 'boissons', name: 'Boissons', products: state.products.boissons },
      { key: 'desserts', name: 'Desserts', products: state.products.desserts }
    ];
    
    productsContainer.innerHTML = categories.map(category => {
      if (category.products.length === 0) return '';
      
      const productsHtml = category.products.map(product => `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-stone-200 flex justify-between items-center">
          <div>
            <h4 class="font-semibold text-stone-800">${product.name}</h4>
            <p class="text-amber-600 font-bold">${parseFloat(product.price).toFixed(2)}€</p>
            ${product.description ? `<p class="text-stone-500 text-sm">${product.description}</p>` : ''}
          </div>
          <button 
            class="add-product-btn bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200"
            data-product-id="${product.id}"
          >
            Ajouter
          </button>
        </div>
      `).join('');
      
      return `
        <div class="mb-8">
          <h3 class="text-2xl font-bold text-stone-800 mb-4">${category.name}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${productsHtml}
          </div>
        </div>
      `;
    }).join('');
    
    // Ajouter les event listeners pour les boutons d'ajout
    productsContainer.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-product-btn');
      if (addBtn) {
        const productId = parseInt(addBtn.dataset.productId);
        console.log('Adding product to cart:', productId);
        addProductToCart(productId);
      }
    });
    
    console.log('Products rendered');
  };

  // Ajouter un produit au panier
  const addProductToCart = (productId) => {
    const product = getProduct(productId);
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }
    
    const existingItem = state.cart.find(item => 
      item.type === 'product' && item.id === productId
    );
    
    if (existingItem) {
      existingItem.quantity++;
      console.log('Increased quantity for product:', product.name);
    } else {
      state.cart.push({
        id: productId,
        type: 'product',
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
        category: product.category
      });
      console.log('Added new product to cart:', product.name);
    }
    
    updateCartBadge();
    showToast(`${product.name} ajouté au panier`);
  };

  // Ouvrir la modal de formule
  const openFormuleModal = (formuleId) => {
    const formule = getFormule(formuleId);
    if (!formule || !orderModal || !modalTitle || !modalBody) {
      console.error('Cannot open formule modal');
      return;
    }
    
    console.log('Opening modal for formule:', formule.name);
    modalTitle.textContent = `Composer votre ${formule.name}`;
    
    // Créer une sélection basée sur les catégories disponibles
    const categories = [];
    if (formule.includes_sandwich || formule.sandwich_included) {
      categories.push({ key: 'sandwichs', name: 'Choisissez votre sandwich' });
    }
    if (formule.includes_boisson || formule.boisson_included) {
      categories.push({ key: 'boissons', name: 'Choisissez votre boisson' });
    }
    if (formule.includes_dessert || formule.dessert_included) {
      categories.push({ key: 'desserts', name: 'Choisissez votre dessert' });
    }
    
    // Si aucune catégorie spécifique, permettre de choisir dans tous les produits disponibles
    if (categories.length === 0) {
      categories.push(
        { key: 'sandwichs', name: 'Choisissez votre sandwich' },
        { key: 'boissons', name: 'Choisissez votre boisson' },
        { key: 'desserts', name: 'Choisissez votre dessert' }
      );
    }
    
    const updateModalTotal = () => {
      if (modalTotalPrice) {
        modalTotalPrice.textContent = `${parseFloat(formule.price).toFixed(2)}€`;
      }
    };
    
    modalBody.innerHTML = categories.map(category => {
      const products = state.products[category.key];
      if (!products || products.length === 0) return '';
      
      return `
        <div class="mb-6">
          <h4 class="text-lg font-semibold text-stone-800 mb-3">${category.name}</h4>
          <div class="space-y-2">
            ${products.map((product, index) => `
              <label class="flex items-center p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                <input 
                  type="radio" 
                  name="${category.key}" 
                  value="${product.id}" 
                  class="text-amber-600 focus:ring-amber-500 mr-3"
                  ${index === 0 ? 'checked' : ''}
                >
                <span class="text-stone-800">${product.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    
    updateModalTotal();
    orderModal.classList.remove('hidden');
    
    // Event listener pour le bouton de soumission
    if (modalSubmitBtn) {
      modalSubmitBtn.onclick = () => {
        console.log('Submitting formule selection...');
        const selections = {};
        categories.forEach(category => {
          const selected = modalBody.querySelector(`input[name="${category.key}"]:checked`);
          if (selected) {
            const productId = parseInt(selected.value);
            const product = getProduct(productId);
            if (product) {
              selections[category.key] = product;
            }
          }
        });
        
        // Créer la description avec les sélections
        const description = Object.values(selections).map(p => p.name).join(', ');
        
        // Ajouter au panier même avec des sélections partielles
        state.cart.push({
          id: formuleId,
          type: 'formule',
          name: formule.name,
          price: parseFloat(formule.price),
          quantity: 1,
          category: 'formule',
          description: description || 'Formule personnalisée',
          products: selections
        });
        
        updateCartBadge();
        showToast(`${formule.name} ajouté au panier`);
        orderModal.classList.add('hidden');
        console.log('Formule added to cart');
      };
    }
  };

  // Afficher l'historique
  const renderHistory = () => {
    console.log('Rendering history...');
    if (!historyModal || !historyModalBody) {
      console.error('History modal elements not found');
      return;
    }
    
    if (state.orders.length === 0) {
      historyModalBody.innerHTML = '<p class="text-center text-stone-500">Aucune commande trouvée</p>';
      historyModal.classList.remove('hidden');
      lockBody();
      return;
    }
    
    historyModalBody.innerHTML = state.orders.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const statusBadge = order.status === 'pending' ? 
        '<span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm">En attente</span>' :
        order.status === 'ready' ?
        '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Prête</span>' :
        '<span class="bg-stone-100 text-stone-800 px-2 py-1 rounded-full text-sm">Terminée</span>';
      
      const itemsList = order.order_items.map(item => {
        let name = '';
        if (item.products) {
          name = `${item.quantity}x ${item.products.name}`;
        } else if (item.formules) {
          name = `${item.quantity}x ${item.formules.name}`;
          if (item.description) name += ` (${item.description})`;
        }
        return `<li class="text-stone-600">${name}</li>`;
      }).join('');
      
      return `
        <div class="bg-white border border-stone-200 rounded-lg p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-sm text-stone-500">${orderDate}</p>
              <p class="font-bold text-stone-800">Commande #${order.id.toString().slice(-6).toUpperCase()}</p>
            </div>
            <div class="text-right">
              ${statusBadge}
              <p class="text-lg font-bold text-amber-600 mt-1">${parseFloat(order.total_price).toFixed(2)}€</p>
            </div>
          </div>
          <ul class="space-y-1">
            ${itemsList}
          </ul>
          <button 
            class="mt-3 text-amber-600 hover:text-amber-700 text-sm font-medium receipt-btn"
            data-order-id="${order.id}"
          >
            Voir le reçu
          </button>
        </div>
      `;
    }).join('');
    
    historyModal.classList.remove('hidden');
    lockBody();
    
    // Event listeners pour les reçus
    historyModalBody.addEventListener('click', (e) => {
      const receiptBtn = e.target.closest('.receipt-btn');
      if (receiptBtn) {
        const orderId = parseInt(receiptBtn.dataset.orderId);
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
          renderReceipt(order);
        }
      }
    });
  };

  // Afficher le reçu
  const renderReceipt = (order) => {
    console.log('Rendering receipt for order:', order.id);
    if (!receiptModal) {
      console.error('Receipt modal not found');
      return;
    }
    
    const receiptDate = document.getElementById('receipt-date');
    const receiptOrderId = document.getElementById('receipt-order-id');
    const receiptItems = document.getElementById('receipt-items');
    const receiptSubtotal = document.getElementById('receipt-subtotal');
    const receiptTva = document.getElementById('receipt-tva');
    const receiptTotal = document.getElementById('receipt-total');
    
    if (receiptDate) receiptDate.textContent = new Date(order.created_at).toLocaleDateString('fr-FR');
    if (receiptOrderId) receiptOrderId.textContent = `#${order.id.toString().slice(-6).toUpperCase()}`;
    
    if (receiptItems) {
      const itemsHtml = order.order_items.map(item => {
        let itemName = '';
        if (item.products) {
          itemName = `${item.quantity}x ${item.products.name}`;
        } else if (item.formules) {
          itemName = `${item.quantity}x ${item.formules.name}`;
          if (item.description) itemName += ` (${item.description})`;
        }
        return `<div class="flex justify-between"><span>${itemName}</span><span>${(item.price * item.quantity).toFixed(2)}&nbsp;€</span></div>`;
      }).join('');
      
      receiptItems.innerHTML = itemsHtml;
    }
    
    const subtotal_ttc = order.total_price;
    const tva = subtotal_ttc * 0.20;
    const total_ht = subtotal_ttc - tva;
    
    if (receiptSubtotal) receiptSubtotal.innerHTML = `${total_ht.toFixed(2)}&nbsp;€`;
    if (receiptTva) receiptTva.innerHTML = `${tva.toFixed(2)}&nbsp;€`;
    if (receiptTotal) receiptTotal.innerHTML = `${subtotal_ttc.toFixed(2)}&nbsp;€`;
    
    const promoLine = document.getElementById('receipt-promo-line');
    if (order.discount_amount && promoLine) {
      const receiptDiscount = document.getElementById('receipt-discount');
      if (receiptDiscount) receiptDiscount.innerHTML = `- ${order.discount_amount.toFixed(2)}&nbsp;€`;
      promoLine.classList.remove('hidden');
    } else if (promoLine) {
      promoLine.classList.add('hidden');
    }
    
    receiptModal.classList.remove('hidden');
  };

  // Réinitialiser le timer de déconnexion
  const resetLogoutTimer = () => {
    if (logoutTimer) clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => handleLogout(true), LOGOUT_TIME);
  };

  // Afficher le panier
  const renderCart = () => {
    console.log('Rendering cart...');
    const cartBody = document.getElementById('cart-body');
    const cartFooter = document.getElementById('cart-footer');
    
    if (!cartBody || !cartFooter) {
      console.error('Cart modal elements not found');
      return;
    }
    
    if (state.cart.length === 0) {
      cartBody.innerHTML = '<p class="text-center text-stone-500">Votre panier est vide</p>';
      cartFooter.innerHTML = '';
      return;
    }

    let total = 0;
    cartBody.innerHTML = state.cart.map((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      return `
        <div class="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
          <div class="flex-1">
            <p class="font-semibold">${item.name}</p>
            <p class="text-sm text-stone-500">${item.price.toFixed(2)}€ chacun</p>
            ${item.description ? `<p class="text-sm text-stone-400">${item.description}</p>` : ''}
          </div>
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <button class="decrease-quantity bg-stone-200 text-stone-700 w-8 h-8 rounded-full font-bold hover:bg-stone-300" data-index="${index}">-</button>
              <span class="font-semibold">${item.quantity}</span>
              <button class="increase-quantity bg-stone-200 text-stone-700 w-8 h-8 rounded-full font-bold hover:bg-stone-300" data-index="${index}">+</button>
            </div>
            <span class="font-bold text-amber-600">${itemTotal.toFixed(2)}€</span>
            <button class="remove-item text-red-500 hover:text-red-700" data-index="${index}">×</button>
          </div>
        </div>
      `;
    }).join('');

    cartFooter.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <span class="text-xl font-bold">Total: ${total.toFixed(2)}€</span>
      </div>
      <button id="checkout-btn" class="w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition">
        Commander
      </button>
    `;

    // Event listeners pour le panier
    cartBody.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      
      if (e.target.classList.contains('decrease-quantity')) {
        if (state.cart[index].quantity > 1) {
          state.cart[index].quantity--;
        } else {
          state.cart.splice(index, 1);
        }
        renderCart();
        updateCartBadge();
      } else if (e.target.classList.contains('increase-quantity')) {
        state.cart[index].quantity++;
        renderCart();
        updateCartBadge();
      } else if (e.target.classList.contains('remove-item')) {
        state.cart.splice(index, 1);
        renderCart();
        updateCartBadge();
      }
    });

    cartFooter.addEventListener('click', (e) => {
      if (e.target.id === 'checkout-btn') {
        handleCheckout();
      }
    });
  };

  // Traiter la commande
  const handleCheckout = async () => {
    if (state.cart.length === 0) {
      showToast('Votre panier est vide');
      return;
    }
    
    console.log('Processing checkout...');
    showLoader(true);
    
    try {
      const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Créer la commande
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert([{
          user_id: state.currentUser.id,
          total_price: total,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }
      
      console.log('Order created:', order.id);
      
      // Créer les éléments de commande
      const orderItems = state.cart.map(item => ({
        order_id: order.id,
        product_id: item.type === 'product' ? item.id : null,
        formule_id: item.type === 'formule' ? item.id : null,
        quantity: item.quantity,
        price: item.price,
        category: item.category || (item.type === 'product' ? 'autre' : 'formule'),
        description: item.description || null
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        throw itemsError;
      }
      
      console.log('Order items created');

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

  // Event listeners
  hamburgerBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  cartBtns.forEach(btn => {
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Opening cart modal');
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
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Opening history modal');
      renderHistory();
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
    console.log('Logging out...');
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
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });

  // Gestion des activités utilisateur pour réinitialiser le timer
  const userActivityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  userActivityEvents.forEach(event => {
    document.addEventListener(event, resetLogoutTimer, true);
  });

  // Initialisation
  const init = async () => {
    console.log('Initializing customer page...');
    
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      console.log('Authentication failed, stopping initialization');
      return;
    }

    await loadInitialData();
    
    // Mettre à jour le message de bienvenue
    if (state.userProfile) {
      const welcomeText = `Bonjour ${state.userProfile.first_name || ''} ${state.userProfile.last_name || ''}`.trim();
      if (welcomeMessage) welcomeMessage.textContent = welcomeText;
      if (welcomeMessageMobile) welcomeMessageMobile.textContent = welcomeText;
      console.log('Welcome message updated:', welcomeText);
    }

    renderFormules();
    renderProducts();
    updateCartBadge();
    resetLogoutTimer();
    
    console.log('Customer page initialization complete');
  };

  // Rafraîchit quand l'onglet reprend le focus
  window.addEventListener('focus', async () => {
    if (!state.currentUser) return;
    console.log('Window focused, refreshing data...');
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Rafraîchit quand la page redevient visible
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !state.currentUser) return;
    console.log('Page visible, refreshing data...');
    await loadInitialData(false);
    renderFormules();
    renderProducts();
    updateCartBadge();
  });

  // Gestion des erreurs globales
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Lancer l'initialisation
  try {
    await init();
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Erreur lors de l\'initialisation de la page');
  }
});