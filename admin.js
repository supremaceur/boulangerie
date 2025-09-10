// Admin JavaScript pour la page administration
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
    promotions: []
  };

  let chartInstances = {};
  let logoutTimer;
  const LOGOUT_TIME = 10 * 60 * 1000; // 10 minutes

  // Éléments DOM
  const loader = document.getElementById('loader');
  const toast = document.getElementById('toast');
  const logoutBtn = document.getElementById('logout-btn-admin');
  
  // Tabs
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminContents = document.querySelectorAll('.admin-content');
  const adminOrderTabs = document.querySelectorAll('.admin-order-tab');
  
  // Containers
  const adminOrdersPendingContainer = document.getElementById('admin-orders-pending-container');
  const adminOrdersCompletedContainer = document.getElementById('admin-orders-completed-container');
  const adminProductsContainer = document.getElementById('admin-products-container');
  const adminFormulesContainer = document.getElementById('admin-formules-container');
  const adminPromosContainer = document.getElementById('admin-promos-container');
  
  // Buttons
  const addProductBtn = document.getElementById('add-product-btn');
  const addFormuleBtn = document.getElementById('add-formule-btn');
  const addPromoBtn = document.getElementById('add-promo-btn');
  
  // Modals
  const refuseModal = document.getElementById('refuse-modal');
  const refuseReasonInput = document.getElementById('refuse-reason');
  const refuseCancelBtn = document.getElementById('refuse-cancel-btn');
  const refuseConfirmBtn = document.getElementById('refuse-confirm-btn');
  
  const formuleModal = document.getElementById('formule-modal');
  const formuleForm = document.getElementById('formule-form');
  const formuleModalCloseBtn = document.getElementById('formule-modal-close-btn');
  const formuleCancelBtn = document.getElementById('formule-cancel-btn');
  const formuleProductsContainer = document.getElementById('formule-products-container');
  
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const productModalCloseBtn = document.getElementById('product-modal-close-btn');
  
  const promoModal = document.getElementById('promo-modal');
  const promoForm = document.getElementById('promo-form');
  const promoModalCloseBtn = document.getElementById('promo-modal-close-btn');
  
  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalText = document.getElementById('confirm-modal-text');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');

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

  // Gestion de l'inactivité
  const resetLogoutTimer = () => {
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => handleLogout(true), LOGOUT_TIME);
  };
  ['mousemove','mousedown','keypress','scroll','touchstart'].forEach(ev => 
    document.addEventListener(ev, resetLogoutTimer, false)
  );

  // Vérification de l'authentification admin
  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) {
        window.location.href = 'login.html';
        return false;
      }
      
      // Vérifier le rôle admin
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (error || profile?.is_admin !== true) {
        window.location.href = 'customer.html';
        return false;
      }
      
      state.currentUser = session.user;
      return true;
    } catch (error) {
      console.error('Admin auth check error:', error);
      window.location.href = 'login.html';
      return false;
    }
  };

  // Chargement des données
  const loadInitialData = async (showLoaderIndicator = true) => {
    if (showLoaderIndicator) showLoader(true);
    try {
      // Products
      const { data: productsData, error: productsError } = await supabaseClient
        .from('products')
        .select('*');
      if (productsError) throw productsError;
      
      state.products = productsData;

      // Formules avec leurs produits
      const { data: formulesData, error: formulesError } = await supabaseClient
        .from('formules')
        .select(`
          *,
          formules_products (
            product_id,
            quantity,
            products (*)
          )
        `);
      if (formulesError) throw formulesError;
      
      // Reformater les données pour faciliter l'utilisation
      state.formules = formulesData.map(formule => ({
        ...formule,
        products: formule.formules_products?.map(fp => ({
          ...fp.products,
          quantity: fp.quantity
        })) || []
      }));

      // Orders
      const { data: ordersData, error: ordersError } = await supabaseClient
        .from('orders')
        .select('*, order_items(*, products(*), formules(*)), profiles(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;
      state.orders = ordersData;

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

  // Fonctions de rendu
  const renderAdminOrders = () => {
    console.log('All orders:', state.orders.map(o => ({ id: o.id, status: o.status })));
    const pendingOrders = state.orders.filter(order => order.status === 'pending');
    const acceptedOrders = state.orders.filter(order => order.status === 'confirmed');
    const completedOrders = state.orders.filter(order => ['delivered', 'completed'].includes(order.status));
    const rejectedOrders = state.orders.filter(order => ['rejected', 'declined', 'refused', 'cancelled', 'failed'].includes(order.status));
    console.log(`Pending: ${pendingOrders.length}, Accepted: ${acceptedOrders.length}, Completed: ${completedOrders.length}, Rejected: ${rejectedOrders.length}`);

    // Commandes en cours
    adminOrdersPendingContainer.innerHTML = pendingOrders.length === 0 
      ? '<p class="text-center text-stone-500">Aucune commande en cours</p>'
      : pendingOrders.map(order => `
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h4 class="text-lg font-bold text-stone-800">Commande #${order.id}</h4>
                <p class="text-stone-600">Client: ${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}</p>
                <p class="text-sm text-stone-500">${new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-amber-600">${order.total_price.toFixed(2)}€</p>
              </div>
            </div>
            <div class="space-y-2 mb-4">
              ${order.order_items.map(item => `
                <div class="flex justify-between">
                  <span>${item.products?.name || item.formules?.name} x${item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}€</span>
                </div>
              `).join('')}
            </div>
            <div class="flex gap-2 relative z-10 mt-4">
              <button onclick="completeOrder(${order.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium border-0" style="background-color: #16a34a !important; color: #ffffff !important;">
                Accepter
              </button>
              <button onclick="refuseOrder(${order.id})" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium border-0" style="background-color: #dc2626 !important; color: #ffffff !important;">
                Refuser
              </button>
            </div>
          </div>
        `).join('');

    // Section pour commandes acceptées (en préparation)  
    const acceptedSection = acceptedOrders.length === 0 
      ? '<p class="text-center text-stone-500 mb-6">Aucune commande en préparation</p>'
      : `
        <h3 class="text-lg font-semibold text-stone-700 mb-4">Commandes en préparation (${acceptedOrders.length})</h3>
        <div class="grid gap-4 mb-8">
          ${acceptedOrders.map(order => `
            <div class="bg-blue-50 rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h4 class="text-lg font-bold text-stone-800">Commande #${order.id}</h4>
                  <p class="text-stone-600">Client: ${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}</p>
                  <p class="text-sm text-stone-500">${new Date(order.created_at).toLocaleString()}</p>
                  <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mt-2">
                    En préparation
                  </span>
                </div>
                <div class="text-right">
                  <p class="text-xl font-bold text-amber-600">${order.total_price.toFixed(2)}€</p>
                </div>
              </div>
              <div class="space-y-2 mb-4">
                ${order.order_items.map(item => `
                  <div class="flex justify-between">
                    <span>${item.products?.name || item.formules?.name} x${item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                `).join('')}
              </div>
              <div class="flex gap-2 relative z-10 mt-4">
                <button onclick="deliverOrder(${order.id})" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium border-0" style="background-color: #16a34a !important; color: #ffffff !important;">
                  Livrer
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

    // Injecter la section des commandes acceptées entre pending et completed
    adminOrdersPendingContainer.innerHTML += acceptedSection;

    // Commandes terminées (livrées + refusées)
    const allFinishedOrders = [...completedOrders, ...rejectedOrders];
    adminOrdersCompletedContainer.innerHTML = allFinishedOrders.length === 0 
      ? '<p class="text-center text-stone-500">Aucune commande terminée</p>'
      : allFinishedOrders.map(order => `
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-lg font-bold text-stone-800">Commande #${order.id}</h4>
                <p class="text-stone-600">Client: ${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}</p>
                <p class="text-sm text-stone-500">${new Date(order.created_at).toLocaleString()}</p>
                <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  ['delivered', 'completed'].includes(order.status) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                  ${['delivered', 'completed'].includes(order.status) ? 'Livrée' : 'Refusée'}
                </span>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-amber-600">${order.total_price.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        `).join('');
  };

  const renderAdminProducts = () => {
    adminProductsContainer.innerHTML = Object.entries(state.products).map(([category, products]) => {
      if (products.length === 0) return '';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      
      return `
        <div>
          <h3 class="text-xl font-bold text-stone-800 mb-4">${categoryName}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${products.map(product => `
              <div class="bg-white rounded-lg shadow-sm p-4">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-semibold text-stone-800">${product.name}</h4>
                  <span class="text-lg font-bold text-amber-600">${product.price.toFixed(2)}€</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                    product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }">
                    ${product.available ? 'Disponible' : 'Indisponible'}
                  </span>
                  <div class="flex gap-2">
                    <button onclick="editProduct(${product.id})" class="text-blue-600 hover:text-blue-800">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  };

  const renderAdminFormules = () => {
    adminFormulesContainer.innerHTML = state.formules.length === 0 
      ? '<p class="text-center text-stone-500">Aucune formule créée</p>'
      : state.formules.map(formule => `
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h4 class="text-lg font-bold text-stone-800">${formule.name}</h4>
                <p class="text-stone-600 mb-2">${formule.description || ''}</p>
                ${formule.products && formule.products.length > 0 ? `
                  <div class="text-sm text-stone-500">
                    <span class="font-medium">Composition:</span>
                    ${formule.products.map(p => p.name).join(', ')}
                  </div>
                ` : '<div class="text-sm text-stone-400 italic">Aucun produit sélectionné</div>'}
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-amber-600">${formule.price.toFixed(2)}€</p>
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Disponible
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="editFormule('${formule.id}')" class="text-blue-600 hover:text-blue-800">Modifier</button>
              <button onclick="deleteFormule('${formule.id}')" class="text-red-600 hover:text-red-800">Supprimer</button>
            </div>
          </div>
        `).join('');
  };

  const renderAdminPromotions = () => {
    adminPromosContainer.innerHTML = state.promotions.length === 0 
      ? '<p class="text-center text-stone-500">Aucune promotion active</p>'
      : state.promotions.map(promo => `
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-lg font-bold text-stone-800">${promo.description}</h4>
                <p class="text-amber-600 font-semibold">${promo.discount_percentage}% de réduction</p>
                ${promo.expires_at ? `<p class="text-sm text-stone-500">Expire le: ${new Date(promo.expires_at).toLocaleDateString()}</p>` : ''}
                ${promo.max_orders ? `<p class="text-sm text-stone-500">Limité à ${promo.max_orders} commandes</p>` : ''}
              </div>
              <div class="flex gap-2">
                <button onclick="editPromotion(${promo.id})" class="text-blue-600 hover:text-blue-800">Modifier</button>
                <button onclick="deletePromotion(${promo.id})" class="text-red-600 hover:text-red-800">Supprimer</button>
              </div>
            </div>
          </div>
        `).join('');
  };

  const renderStats = (period = 'today') => {
    const statsContainer = document.getElementById('stats-tables-container');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today); 
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const filteredOrders = state.orders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (period === 'today') return orderDate >= today;
      if (period === 'week') return orderDate >= weekStart;
      if (period === 'month') return orderDate >= monthStart;
      return true;
    });

    const formulesStats = {};
    filteredOrders.forEach(order => {
      order.order_items.forEach(item => {
        if (item.formules) {
          const f = item.formules;
          if (!formulesStats[f.id]) formulesStats[f.id] = { name: f.name, count: 0, revenue: 0 };
          formulesStats[f.id].count += item.quantity;
          formulesStats[f.id].revenue += item.price * item.quantity;
        }
      });
    });

    const productsStats = {};
    filteredOrders.forEach(order => {
      order.order_items.forEach(item => {
        if (item.products) {
          const p = item.products;
          if (!productsStats[p.id]) productsStats[p.id] = { name: p.name, count: 0 };
          productsStats[p.id].count += item.quantity;
        }
        if (item.formules && item.description) {
          const productNames = item.description.split(', ');
          productNames.forEach(name => {
            const product = Object.values(state.products).flat().find(pp => pp.name === name);
            if (product) {
              if (!productsStats[product.id]) productsStats[product.id] = { name: product.name, count: 0 };
              productsStats[product.id].count += item.quantity;
            }
          });
        }
      });
    });

    const sortedFormules = Object.values(formulesStats).sort((a,b) => b.count - a.count);
    const sortedProducts = Object.values(productsStats).sort((a,b) => b.count - a.count);

    statsContainer.innerHTML = `
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-stone-700 mb-4">Formules les plus vendues</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-stone-200"><tr><th class="p-3">Formule</th><th class="p-3">Quantité</th><th class="p-3">Revenu Total</th></tr></thead>
            <tbody>
              ${sortedFormules.length ? sortedFormules.map(f => `<tr class="border-b"><td class="p-3">${f.name}</td><td class="p-3">${f.count}</td><td class="p-3">${f.revenue.toFixed(2)} €</td></tr>`).join('') : '<tr><td colspan="3" class="text-center p-4">Aucune donnée</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 class="text-xl font-semibold text-stone-700 mb-4">Produits les plus populaires</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-stone-200"><tr><th class="p-3">Produit</th><th class="p-3">Nombre de fois choisi</th></tr></thead>
            <tbody>
              ${sortedProducts.length ? sortedProducts.map(p => `<tr class="border-b"><td class="p-3">${p.name}</td><td class="p-3">${p.count}</td></tr>`).join('') : '<tr><td colspan="2" class="text-center p-4">Aucune donnée</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  // Fonctions globales pour les boutons onclick
  window.completeOrder = async (orderId) => {
    showLoader(true);
    try {
      const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

      if (error) throw error;
      showToast('Commande validée !');
      await loadInitialData(false);
      renderAdminOrders();
    } catch (error) {
      console.error('Complete order error:', error);
      showToast('Erreur lors de la validation');
    } finally {
      showLoader(false);
    }
  };

  window.refuseOrder = (orderId) => {
    refuseModal.classList.remove('hidden');
    refuseConfirmBtn.onclick = async () => {
      const reason = refuseReasonInput.value;
      if (!reason.trim()) {
        showToast('Veuillez indiquer un motif de refus');
        return;
      }

      showLoader(true);
      try {
        const { error } = await supabaseClient
          .from('orders')
          .update({ status: 'rejected', refuse_reason: reason })
          .eq('id', orderId);

        if (error) {
          console.error('Status rejection error:', error);
          // Essayer d'autres valeurs communes si 'rejected' échoue
          const alternativeStatuses = ['declined', 'refused', 'cancelled', 'failed'];
          let success = false;
          
          for (const status of alternativeStatuses) {
            try {
              const { error: retryError } = await supabaseClient
                .from('orders')
                .update({ status, refuse_reason: reason })
                .eq('id', orderId);
              
              if (!retryError) {
                console.log(`Success with status: ${status}`);
                success = true;
                break;
              }
            } catch (retryErr) {
              console.log(`Failed with status ${status}:`, retryErr);
            }
          }
          
          if (!success) throw error;
        }

        showToast('Commande refusée');
        refuseModal.classList.add('hidden');
        refuseReasonInput.value = '';
        await loadInitialData(false);
        renderAdminOrders();
      } catch (error) {
        console.error('Refuse order error:', error);
        showToast('Erreur lors du refus - vérifiez la console pour les détails');
      } finally {
        showLoader(false);
      }
    };
  };

  // Fonction pour livrer une commande
  window.deliverOrder = async (orderId) => {
    showLoader(true);
    try {
      const { error } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'delivered'
        })
        .eq('id', orderId);

      if (error) {
        console.error('Deliver status error:', error);
        // Essayer 'completed' si 'delivered' ne fonctionne pas
        const { error: completedError } = await supabaseClient
          .from('orders')
          .update({ 
            status: 'completed'
          })
          .eq('id', orderId);
        
        if (completedError) throw completedError;
        console.log('Success with status: completed');
      } else {
        console.log('Success with status: delivered');
      }

      showToast('Commande livrée ! Le ticket est maintenant disponible pour le client.');
      await loadInitialData(false);
      renderAdminOrders();
    } catch (error) {
      console.error('Deliver order error:', error);
      showToast('Erreur lors de la livraison');
    } finally {
      showLoader(false);
    }
  };

  window.editProduct = (productId) => {
    const product = getProduct(productId);
    if (!product) return;

    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-available').checked = product.available;

    productModal.classList.remove('hidden');
    productForm.dataset.productId = productId;
  };

  window.deleteProduct = (productId) => {
    const product = getProduct(productId);
    if (!product) return;

    showConfirmModal(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer "${product.name}" ?`,
      async () => {
        showLoader(true);
        try {
          const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);

          if (error) throw error;
          showToast('Produit supprimé !');
          await loadInitialData(false);
          renderAdminProducts();
        } catch (error) {
          console.error('Delete product error:', error);
          showToast('Erreur lors de la suppression');
        } finally {
          showLoader(false);
        }
      }
    );
  };

  // Fonction pour rendre les produits dans le modal de formule
  const renderFormuleProducts = (selectedProducts = []) => {
    if (!formuleProductsContainer) return;

    formuleProductsContainer.innerHTML = '';

    if (state.products.length === 0) {
      formuleProductsContainer.innerHTML = '<p class="text-stone-500 text-center py-4">Aucun produit disponible. Créez d\'abord des produits.</p>';
      return;
    }

    // Grouper les produits par catégorie
    const productsByCategory = {};
    state.products.forEach(product => {
      if (!productsByCategory[product.category]) {
        productsByCategory[product.category] = [];
      }
      productsByCategory[product.category].push(product);
    });

    // Render par catégorie
    Object.entries(productsByCategory).forEach(([category, products]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'mb-4';
      categoryDiv.innerHTML = `
        <h4 class="font-semibold text-stone-700 mb-2 capitalize">${category}</h4>
        <div class="space-y-2">
          ${products.map(product => `
            <label class="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer">
              <input type="checkbox" 
                     name="formule-products" 
                     value="${product.id}" 
                     class="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                     ${selectedProducts.includes(product.id) ? 'checked' : ''}>
              <span class="flex-1 text-stone-700">${product.name}</span>
              <span class="text-sm text-stone-500">${product.price.toFixed(2)}€</span>
            </label>
          `).join('')}
        </div>
      `;
      formuleProductsContainer.appendChild(categoryDiv);
    });
  };

  window.editFormule = (formuleId) => {
    const formule = getFormule(formuleId);
    if (!formule) return;

    document.getElementById('formule-name').value = formule.name;
    document.getElementById('formule-description').value = formule.description || '';
    document.getElementById('formule-price').value = formule.price;

    // Charger les produits sélectionnés pour cette formule
    const selectedProducts = formule.products ? formule.products.map(p => p.id) : [];
    renderFormuleProducts(selectedProducts);

    formuleModal.classList.remove('hidden');
    formuleForm.dataset.formuleId = formuleId;
  };

  window.deleteFormule = (formuleId) => {
    const formule = getFormule(formuleId);
    if (!formule) return;

    showConfirmModal(
      'Supprimer la formule',
      `Êtes-vous sûr de vouloir supprimer "${formule.name}" ?`,
      async () => {
        showLoader(true);
        try {
          // Les relations seront automatiquement supprimées grâce à ON DELETE CASCADE
          const { error } = await supabaseClient
            .from('formules')
            .delete()
            .eq('id', formuleId);

          if (error) throw error;
          showToast('Formule supprimée !');
          await loadInitialData(false);
          renderAdminFormules();
        } catch (error) {
          console.error('Delete formule error:', error);
          showToast('Erreur lors de la suppression');
        } finally {
          showLoader(false);
        }
      }
    );
  };

  window.editPromotion = (promoId) => {
    // Implementation pour éditer les promotions
    showToast('Fonction en cours de développement');
  };

  window.deletePromotion = (promoId) => {
    const promo = state.promotions.find(p => p.id === promoId);
    if (!promo) return;

    showConfirmModal(
      'Supprimer la promotion',
      `Êtes-vous sûr de vouloir supprimer cette promotion ?`,
      async () => {
        showLoader(true);
        try {
          const { error } = await supabaseClient
            .from('promotions')
            .delete()
            .eq('id', promoId);

          if (error) throw error;
          showToast('Promotion supprimée !');
          await loadInitialData(false);
          renderAdminPromotions();
        } catch (error) {
          console.error('Delete promotion error:', error);
          showToast('Erreur lors de la suppression');
        } finally {
          showLoader(false);
        }
      }
    );
  };

  // Event listeners
  
  // Tabs navigation
  adminTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = tab.dataset.tab;
      if (!tabId) return;

      // Update active tab
      adminTabs.forEach(t => t.classList.remove('bg-stone-700'));
      tab.classList.add('bg-stone-700');

      // Show content
      adminContents.forEach(content => content.classList.add('hidden'));
      document.getElementById(`${tabId}-tab`)?.classList.remove('hidden');

      // Render content based on tab
      switch(tabId) {
        case 'orders':
          renderAdminOrders();
          break;
        case 'products':
          renderAdminProducts();
          break;
        case 'formules':
          renderAdminFormules();
          break;
        case 'promotions':
          renderAdminPromotions();
          break;
        case 'stats':
          renderStats();
          break;
      }
    });
  });

  // Order tabs
  adminOrderTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.dataset.orderTab;
      
      adminOrderTabs.forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');

      if (tabType === 'pending') {
        adminOrdersPendingContainer.classList.remove('hidden');
        adminOrdersCompletedContainer.classList.add('hidden');
      } else {
        adminOrdersPendingContainer.classList.add('hidden');
        adminOrdersCompletedContainer.classList.remove('hidden');
      }
    });
  });

  // Modal handlers
  addProductBtn?.addEventListener('click', () => {
    productForm.reset();
    delete productForm.dataset.productId;
    productModal.classList.remove('hidden');
  });

  addFormuleBtn?.addEventListener('click', () => {
    formuleForm.reset();
    delete formuleForm.dataset.formuleId;
    renderFormuleProducts();
    formuleModal.classList.remove('hidden');
  });

  addPromoBtn?.addEventListener('click', () => {
    promoForm.reset();
    promoModal.classList.remove('hidden');
  });

  // Close modals
  [productModalCloseBtn, formuleModalCloseBtn, promoModalCloseBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
      productModal.classList.add('hidden');
      formuleModal.classList.add('hidden');
      promoModal.classList.add('hidden');
    });
  });

  // Cancel buttons
  formuleCancelBtn?.addEventListener('click', () => {
    formuleModal.classList.add('hidden');
  });

  refuseCancelBtn?.addEventListener('click', () => {
    refuseModal.classList.add('hidden');
    refuseReasonInput.value = '';
  });

  confirmCancelBtn?.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
  });

  // Form submissions
  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const productData = {
      name: document.getElementById('product-name').value,
      category: document.getElementById('product-category').value,
      price: parseFloat(document.getElementById('product-price').value),
      available: document.getElementById('product-available').checked
    };

    try {
      const productId = productForm.dataset.productId;
      if (productId) {
        const { error } = await supabaseClient
          .from('products')
          .update(productData)
          .eq('id', productId);
        if (error) throw error;
        showToast('Produit modifié !');
      } else {
        const { error } = await supabaseClient
          .from('products')
          .insert(productData);
        if (error) throw error;
        showToast('Produit ajouté !');
      }

      productModal.classList.add('hidden');
      await loadInitialData(false);
      renderAdminProducts();
    } catch (error) {
      console.error('Product save error:', error);
      showToast('Erreur lors de l\'enregistrement');
    } finally {
      showLoader(false);
    }
  });

  formuleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);

    const formuleData = {
      name: document.getElementById('formule-name').value,
      description: document.getElementById('formule-description').value,
      price: parseFloat(document.getElementById('formule-price').value)
    };

    // Récupérer les produits sélectionnés
    const selectedProducts = Array.from(document.querySelectorAll('input[name="formule-products"]:checked'))
      .map(checkbox => checkbox.value);

    try {
      const formuleId = formuleForm.dataset.formuleId;
      let savedFormuleId = formuleId;

      if (formuleId) {
        // Mise à jour de la formule existante
        const { error } = await supabaseClient
          .from('formules')
          .update(formuleData)
          .eq('id', formuleId);
        if (error) throw error;

        // Supprimer les anciennes relations
        const { error: deleteError } = await supabaseClient
          .from('formules_products')
          .delete()
          .eq('formule_id', formuleId);
        if (deleteError) throw deleteError;

        showToast('Formule modifiée !');
      } else {
        // Création d'une nouvelle formule
        const { data, error } = await supabaseClient
          .from('formules')
          .insert(formuleData)
          .select()
          .single();
        if (error) throw error;
        savedFormuleId = data.id;
        showToast('Formule ajoutée !');
      }

      // Ajouter les nouvelles relations produit-formule
      if (selectedProducts.length > 0) {
        const relations = selectedProducts.map(productId => ({
          formule_id: savedFormuleId,
          product_id: productId,
          quantity: 1
        }));

        const { error: relationError } = await supabaseClient
          .from('formules_products')
          .insert(relations);
        
        if (relationError) {
          console.error('Error saving product relations:', relationError);
          showToast('Formule sauvée mais erreur dans la composition');
        }
      }

      formuleModal.classList.add('hidden');
      await loadInitialData(false);
      renderAdminFormules();
    } catch (error) {
      console.error('Formule save error:', error);
      showToast('Erreur lors de l\'enregistrement');
    } finally {
      showLoader(false);
    }
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

  logoutBtn?.addEventListener('click', () => handleLogout());

  // Event listeners pour les filtres de statistiques
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('stats-filter-btn')) {
      document.querySelectorAll('.stats-filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-600', 'text-white');
        btn.classList.add('bg-stone-200', 'text-stone-700');
      });
      e.target.classList.remove('bg-stone-200', 'text-stone-700');
      e.target.classList.add('bg-amber-600', 'text-white');
      renderStats(e.target.dataset.period);
    }
  });

  // Rafraîchit quand l'onglet reprend le focus
  window.addEventListener('focus', async () => {
    if (!state.currentUser) return;
    await loadInitialData(false);
    const isOrdersVisible = !document.getElementById('orders-tab').classList.contains('hidden');
    if (isOrdersVisible) renderAdminOrders();
  });

  // Rafraîchit quand la page redevient visible
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !state.currentUser) return;
    await loadInitialData(false);
    const isOrdersVisible = !document.getElementById('orders-tab').classList.contains('hidden');
    if (isOrdersVisible) renderAdminOrders();
  });

  // Initialisation
  const init = async () => {
    const isAdminAuthenticated = await checkAdminAuth();
    if (!isAdminAuthenticated) return;

    await loadInitialData();
    renderAdminOrders(); // Tab par défaut
    resetLogoutTimer();
  };

  // Lancer l'initialisation
  await init();
});