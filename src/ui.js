import { state } from './store.js';
import { getProduct, getFormule, findApplicablePromotion } from './utils.js';

// ===== HELPERS =====
export const showLoader = (show) => { document.getElementById('loader').classList.toggle('hidden', !show); };
export const showView = (viewId) => {
  const views = { auth: document.getElementById('auth-view'), customer: document.getElementById('customer-view'), admin: document.getElementById('admin-view') };
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[viewId.replace('-view', '')]?.classList.remove('hidden');
};
export const showToast = (message) => { 
  const toast = document.getElementById('toast');
  toast.textContent = message; 
  toast.classList.add('show'); 
  setTimeout(() => toast.classList.remove('show'), 3000); 
};
export const showAuthError = (message) => { 
  const authError = document.getElementById('auth-error');
  authError.textContent = message; 
  authError.classList.remove('hidden'); 
};
export const hideAuthError = () => { document.getElementById('auth-error').classList.add('hidden'); };
export const showConfirmModal = (title, text, onConfirm) => {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-text').textContent = text;
  document.getElementById('confirm-modal').classList.remove('hidden');
  document.getElementById('confirm-ok-btn').onclick = () => { onConfirm(); document.getElementById('confirm-modal').classList.add('hidden'); };
};

export const updateCartBadge = () => {
  const cartBadge = document.getElementById('cart-badge');
  const cartItemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  if (cartItemCount > 0) { cartBadge.textContent = cartItemCount; cartBadge.classList.remove('hidden'); }
  else { cartBadge.classList.add('hidden'); }
};

// ===== RENDER =====
export const renderProducts = () => {
  const productsContainer = document.getElementById('products-container');
  productsContainer.innerHTML = Object.entries(state.products).map(([category, products]) => {
    if (products.length === 0) return '';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const productsHtml = products.filter(p => p.available).map(p => `
      <div class="bg-white rounded-lg shadow-sm flex flex-col text-center">
        <div class="p-4 flex-grow">
          <p class="font-semibold text-stone-800">${p.name}</p>
          <p class="text-stone-500 mt-1">${parseFloat(p.price).toFixed(2)}€</p>
        </div>
        <div class="p-4 border-t border-stone-100">
          <button class="add-to-cart-btn bg-amber-100 text-amber-800 font-bold py-2 px-4 rounded-lg hover:bg-amber-200 transition w-full" data-product-id="${p.id}">Ajouter</button>
        </div>
      </div>`).join('');
    if (!productsHtml) return '';
    return `<div><h3 class="text-xl font-bold text-stone-700 mb-4">${categoryName}</h3><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${productsHtml}</div></div>`;
  }).join('');
};

export const renderFormules = () => {
  const formulesContainer = document.getElementById('formules-container');
  formulesContainer.innerHTML = state.formules.map(formule => {
    const includedCategories = Object.keys(formule.eligible_products)
      .filter(cat => formule.eligible_products[cat] && formule.eligible_products[cat].length > 0)
      .map(cat => cat.charAt(0).toUpperCase() + cat.slice(1, -1))
      .join(' + ');

    const productsDetailsHtml = Object.entries(formule.eligible_products).map(([category, productIds]) => {
      if (!productIds || productIds.length === 0) return '';
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      const productList = productIds.map(id => {
        const product = getProduct(id);
        return product && product.available ? `<li class="text-stone-600">${product.name}</li>` : '';
      }).filter(Boolean).join('');
      if (!productList) return '';
      return `<div class="mt-3"><h4 class="font-semibold text-stone-700">${categoryName} inclus :</h4><ul class="list-disc list-inside ml-2 text-sm">${productList}</ul></div>`;
    }).join('');

    return `
      <div class="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        <div class="p-6">
          <h3 class="text-2xl font-bold text-stone-800">${formule.name}</h3>
          <p class="text-stone-500 mt-1 font-semibold text-amber-700">${includedCategories}</p>
          <div class="mt-4 text-3xl font-bold text-amber-600">${parseFloat(formule.price).toFixed(2)}€</div>
        </div>
        <div class="p-6 border-t border-stone-200 bg-stone-50/50 flex-grow">${productsDetailsHtml}</div>
        <div class="p-6 bg-white mt-auto">
          <button data-formule-id="${formule.id}" class="order-btn w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors duration-300 shadow-md">Commander</button>
        </div>
      </div>`;
  }).join('');
};

export const renderAll = () => {
  if (!state.currentUser) return;
  if (state.currentUser.role === 'admin') {
    renderAdminOrders();
    renderAdminProducts();
    renderAdminFormules();
    renderAdminPromotions();
    renderStats();
  } else {
    renderFormules();
    renderProducts();
    const welcomeText = `Bonjour, ${state.userProfile?.first_name || 'Client'} !`;
    document.getElementById('welcome-message').textContent = welcomeText;
    document.getElementById('welcome-message-mobile').textContent = welcomeText;
  }
};

export const renderCart = () => {
  const cartBody = document.getElementById('cart-body');
  const cartFooter = document.getElementById('cart-footer');

  if (state.cart.length === 0) {
    cartBody.innerHTML = '<p class="text-center text-stone-500">Votre panier est vide.</p>';
    cartFooter.innerHTML = '';
    return;
  }

  cartBody.innerHTML = state.cart.map((item, index) => {
    if (item.type === 'product') {
      return `
        <div class="flex justify-between items-center py-2 border-b border-stone-100">
          <div>
            <p class="font-semibold">${item.product.name}</p>
            <p class="text-sm text-stone-500">${item.quantity} x ${parseFloat(item.product.price).toFixed(2)}€</p>
          </div>
          <div class="flex items-center gap-4">
            <span class="font-semibold">${(item.quantity * item.product.price).toFixed(2)}€</span>
            <button class="remove-from-cart-btn text-red-500 hover:text-red-700 font-bold text-xl" data-cart-item-index="${index}">&times;</button>
          </div>
        </div>`;
    } else if (item.type === 'formule') {
      const productsList = item.selectedProducts.map(p => `<li>${p.name}</li>`).join('');
      return `
        <div class="py-2 border-b border-stone-100">
          <div class="flex justify-between items-start">
            <div>
              <p class="font-semibold">${item.formule.name}</p>
              <ul class="text-sm text-stone-500 list-disc list-inside pl-2">${productsList}</ul>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-semibold">${(item.quantity * item.formule.price).toFixed(2)}€</span>
              <button class="remove-from-cart-btn text-red-500 hover:text-red-700 font-bold text-xl" data-cart-item-index="${index}">&times;</button>
            </div>
          </div>
        </div>`;
    }
  }).join('');

  const subtotal = state.cart.reduce((total, item) => {
    const price = item.type === 'product' ? item.product.price : item.formule.price;
    return total + (item.quantity * price);
  }, 0);

  const applicablePromo = findApplicablePromotion(state.cart);
  let discountAmount = 0;
  let finalTotal = subtotal;

  let promoHtml = '';
  if (applicablePromo) {
    discountAmount = subtotal * (applicablePromo.discount_percentage / 100);
    finalTotal = subtotal - discountAmount;
    promoHtml = `
      <div class="flex justify-between items-center text-green-600">
        <span>Promotion: ${applicablePromo.description}</span>
        <span>-${discountAmount.toFixed(2)}€</span>
      </div>`;
  }

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
      <label for="cart-pickup-time" class="block text-lg font-semibold text-stone-700 mb-2">Heure de retrait</label>
      <select id="cart-pickup-time" class="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white">
        ${timeSlots.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
  `;

  cartFooter.innerHTML = `
    <div class="flex justify-between items-center"><span>Sous-total:</span><span>${subtotal.toFixed(2)}€</span></div>
    ${promoHtml}
    <div class="flex justify-between items-center font-bold text-xl my-4"><span>Total:</span><span>${finalTotal.toFixed(2)}€</span></div>
    ${timeSelectorHtml}
    <button id="checkout-btn" class="w-full bg-amber-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-700 transition mt-4">Valider la commande</button>
  `;
};

export const renderAdminOrders = () => {
  const adminOrdersPendingContainer = document.getElementById('admin-orders-pending-container');
  const adminOrdersCompletedContainer = document.getElementById('admin-orders-completed-container');
  const pendingOrders = state.orders.filter(o => ['pending', 'confirmed'].includes(o.status)).sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));
  const completedOrders = state.orders.filter(o => ['refused', 'delivered'].includes(o.status));
  const statusBadge = (status) => ({
    pending: `<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">En attente</span>`,
    confirmed: `<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Confirmée</span>`,
    refused: `<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Refusée</span>`,
    delivered: `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Livrée</span>`
  }[status] || '');

  const card = (order) => {
    const itemsHtml = order.order_items.map(item => {
      if (item.products) return `<li>${item.quantity} x ${item.products.name}</li>`;
      if (item.formules) return `<li>${item.quantity} x ${item.formules.name} (${item.description || ''})</li>`;
      return '';
    }).join('');
    let actions = '';
    if (order.status === 'pending') {
      actions = `
        <div class="mt-4 flex gap-3">
          <button class="confirm-order-btn flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition" data-order-id="${order.id}">Accepter</button>
          <button class="refuse-order-btn flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition" data-order-id="${order.id}">Refuser</button>
        </div>`;
    } else if (order.status === 'confirmed') {
      actions = `
        <div class="mt-4">
          <button class="deliver-order-btn w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition" data-order-id="${order.id}">Marquer comme livrée</button>
        </div>`;
    }
    return `
      <div class="bg-white rounded-xl shadow p-5">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p class="font-bold text-lg text-stone-800">Commande #${order.id.toString().slice(-4)}</p>
            <p class="font-bold text-amber-600">Retrait: ${order.pickup_time.slice(0,5)}</p>
            <p class="text-sm text-stone-500">${new Date(order.created_at).toLocaleString('fr-FR')}</p>
          </div>
          <div>${statusBadge(order.status)}</div>
        </div>
        <div class="mt-4 border-t pt-4">
          <p class="font-semibold">Total - ${parseFloat(order.total_price).toFixed(2)}€</p>
          <ul class="list-disc list-inside text-stone-600 mt-2">${itemsHtml}</ul>
          ${order.status === 'refused' && order.refuse_reason ? `<p class="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">Motif: ${order.refuse_reason}</p>` : ''}
        </div>
        ${actions}
      </div>`;
  };

  adminOrdersPendingContainer.innerHTML = pendingOrders.length ? pendingOrders.map(card).join('') : '<p class="text-center text-stone-500">Aucune commande en cours.</p>';
  adminOrdersCompletedContainer.innerHTML = completedOrders.length ? completedOrders.map(card).join('') : '<p class="text-center text-stone-500">Aucune commande terminée.</p>';
};

export const renderAdminProducts = () => {
  const adminProductsContainer = document.getElementById('admin-products-container');
  adminProductsContainer.innerHTML = Object.entries(state.products).map(([category, products]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const productsHtml = products.map(p => `
      <div class="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
        <div>
          <p class="font-semibold text-stone-800">${p.name}</p>
          <p class="text-sm text-stone-500">${parseFloat(p.price).toFixed(2)}€</p>
        </div>
        <div class="flex items-center gap-4">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" ${p.available ? 'checked' : ''} class="sr-only peer toggle-product-btn" data-product-id="${p.id}">
            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-amber-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
          <button class="delete-product-btn text-stone-400 hover:text-red-600 transition" data-product-id="${p.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
      </div>`).join('');
    return `<div><h3 class="text-xl font-bold text-stone-700 mb-3">${categoryName}</h3><div class="space-y-2">${productsHtml}</div></div>`;
  }).join('');
};

export const renderAdminFormules = () => {
  const adminFormulesContainer = document.getElementById('admin-formules-container');
  adminFormulesContainer.innerHTML = state.formules.length ? state.formules.map(f => `
    <div class="bg-white rounded-xl shadow p-5">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-lg text-stone-800">${f.name}</p>
          <p class="font-bold text-amber-600 text-md">${parseFloat(f.price).toFixed(2)}€</p>
        </div>
        <div class="flex gap-2">
          <button class="edit-formule-btn text-stone-400 hover:text-amber-600 transition" data-formule-id="${f.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
          </button>
          <button class="delete-formule-btn text-stone-400 hover:text-red-600 transition" data-formule-id="${f.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
      </div>
    </div>`).join('') : '<p class="text-center text-stone-500">Aucune formule créée.</p>';
};

export const renderAdminPromotions = () => {
  const adminPromosContainer = document.getElementById('admin-promos-container');
  adminPromosContainer.innerHTML = state.promotions.length ? state.promotions.map(p => `
    <div class="bg-white rounded-xl shadow p-5">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-lg text-stone-800">${p.description}</p>
          <p class="font-semibold text-amber-600 text-md">${p.discount_percentage}% de réduction</p>
          <p class="text-sm text-stone-500">Expire le: ${p.expires_at ? new Date(p.expires_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
          <p class="text-sm text-stone-500">Commandes max: ${p.max_orders || 'N/A'}</p>
        </div>
        <div class="flex gap-2">
          <button class="edit-promo-btn text-stone-400 hover:text-amber-600 transition" data-promo-id="${p.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
          </button>
          <button class="delete-promo-btn text-stone-400 hover:text-red-600 transition" data-promo-id="${p.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
      </div>
    </div>`).join('') : '<p class="text-center text-stone-500">Aucune promotion créée.</p>';
};

export const renderStats = (period = 'today') => {
  const statsContainer = document.getElementById('stats-tables-container');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
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

export const renderHistory = () => {
  const historyModalBody = document.getElementById('history-modal-body');
  historyModalBody.innerHTML = state.orders.length ? state.orders.map(order => {
    const itemsHtml = order.order_items.map(item => {
      if (item.products) return `<li>${item.quantity} x ${item.products.name}</li>`;
      if (item.formules) return `<li>${item.quantity} x ${item.formules.name} (${item.description})</li>`;
      return '';
    }).join('');
    const statusBadge = (status) => ({
      pending: `<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">En attente</span>`,
      confirmed: `<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Confirmée</span>`,
      refused: `<span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Refusée</span>`,
      delivered: `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Terminée</span>`
    }[order.status] || '');
    const actionButtons = `${order.status === 'delivered' ? `<button class="receipt-btn bg-stone-200 text-stone-700 text-sm font-semibold px-3 py-1 rounded-full hover:bg-stone-300 transition ml-2" data-order-id="${order.id}">Voir le reçu</button>` : ''}`;
    return `
      <div class="bg-stone-50 p-4 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-stone-800">Commande #${order.id.toString().slice(-4)} (Retrait à ${order.pickup_time.slice(0,5)})</p>
            <p class="text-sm text-stone-500">${new Date(order.created_at).toLocaleString('fr-FR')}</p>
          </div>
          ${statusBadge}
        </div>
        <ul class="list-disc list-inside text-sm text-stone-600 mt-2">${itemsHtml}</ul>
        ${order.status === 'refused' && order.refuse_reason ? `<p class="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">Motif: ${order.refuse_reason}</p>` : ''}
        <div class="mt-3 text-right">${actionButtons}</div>
      </div>`;
  }).join('') : '<p class="text-center text-stone-500">Vous n\'avez pas encore de commande.</p>';
  document.getElementById('history-modal').classList.remove('hidden');
};

export const renderReceipt = (order) => {
  document.getElementById('receipt-date').textContent = new Date(order.created_at).toLocaleDateString('fr-FR');
  document.getElementById('receipt-order-id').textContent = `#${order.id.toString().slice(-6).toUpperCase()}`;
  const itemsHtml = order.order_items.map(item => {
    let itemName = '';
    if (item.products) itemName = `${item.quantity}x ${item.products.name}`;
    else if (item.formules) { itemName = `${item.quantity}x ${item.formules.name}`; if (item.description) itemName += ` (${item.description})`; }
    return `<div class="flex justify-between"><span>${itemName}</span><span>${(item.price * item.quantity).toFixed(2)}&nbsp;€</span></div>`;
  }).join('');
  document.getElementById('receipt-items').innerHTML = itemsHtml;
  const subtotal_ttc = order.total_price;
  const tva = subtotal_ttc * 0.20;
  const total_ht = subtotal_ttc - tva;
  document.getElementById('receipt-subtotal').innerHTML = `${total_ht.toFixed(2)}&nbsp;€`;
  document.getElementById('receipt-tva').innerHTML = `${tva.toFixed(2)}&nbsp;€`;
  document.getElementById('receipt-total').innerHTML = `${subtotal_ttc.toFixed(2)}&nbsp;€`;
  const promoLine = document.getElementById('receipt-promo-line');
  if (order.discount_amount) {
    document.getElementById('receipt-discount').innerHTML = `- ${order.discount_amount.toFixed(2)}&nbsp;€`;
    promoLine.classList.remove('hidden');
  } else promoLine.classList.add('hidden');
  document.getElementById('receipt-modal').classList.remove('hidden');
};

export const openOrderModal = (formuleId, existingOrderItems = null) => {
      const formule = getFormule(formuleId);
      if (!formule) return;
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');
      const modalTotalPrice = document.getElementById('modal-total-price');
      const modalSubmitBtn = document.getElementById('modal-submit-btn');
      const orderModal = document.getElementById('order-modal');

      modalTitle.textContent = `Composer votre ${formule.name}`;
      modalBody.innerHTML = '';
      let currentSelections = {};
      if(existingOrderItems) existingOrderItems.forEach(item => currentSelections[item.category] = item.product_id);

      let productSelectionHtml = '';
      Object.entries(formule.eligible_products).forEach(([type, ids]) => {
        if (!ids || ids.length === 0) return;
        const products = state.products[type].filter(p => p.available && ids.includes(p.id));
        if(products.length === 0) return;
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        const grid = products.map(p => `<button class="p-3 border rounded-lg text-left transition bg-stone-50 border-stone-200 hover:border-amber-400" data-product-id="${p.id}" data-product-type="${type}"><p class="font-semibold text-stone-800">${p.name}</p></button>`).join('');
        productSelectionHtml += `<div><h4 class="text-lg font-semibold text-stone-700 mb-2">${typeName}</h4><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${grid}</div></div>`;
      });
      modalBody.innerHTML = productSelectionHtml;
      modalTotalPrice.textContent = `${parseFloat(formule.price).toFixed(2)}€`;

      if (!existingOrderItems) {
        Object.entries(formule.eligible_products).forEach(([type, ids]) => {
          if (!ids || ids.length === 0) return;
          const first = state.products[type].find(p => p.available && ids.includes(p.id));
          if (first) currentSelections[type] = first.id;
        });
      }
      Object.entries(currentSelections).forEach(([type, id]) => {
        const button = modalBody.querySelector(`button[data-product-id="${id}"]`);
        if (button) button.classList.add('bg-amber-100','border-amber-500','ring-2','ring-amber-500');
      });

      modalBody.onclick = e => {
        const button = e.target.closest('button[data-product-id]');
        if (!button) return;
        const { productId, productType } = button.dataset;
        modalBody.querySelectorAll(`button[data-product-type="${productType}"]`).forEach(btn => btn.classList.remove('bg-amber-100','border-amber-500','ring-2','ring-amber-500'));
        button.classList.add('bg-amber-100','border-amber-500','ring-2','ring-amber-500');
        currentSelections[productType] = parseInt(productId, 10);
      };

      modalSubmitBtn.onclick = () => {
        const requiredCategories = Object.keys(formule.eligible_products).filter(k => formule.eligible_products[k] && formule.eligible_products[k].length > 0);
        if (Object.keys(currentSelections).length < requiredCategories.length) return showToast("Veuillez sélectionner un article dans chaque catégorie.");
        const formuleItem = { type: 'formule', formule: formule, selectedProducts: Object.values(currentSelections).map(productId => getProduct(productId)), quantity: 1 };
        state.cart.push(formuleItem);
        updateCartBadge();
        orderModal.classList.add('hidden');
        showToast(`${formule.name} a été ajouté au panier.`);
      };
      orderModal.classList.remove('hidden');
    };

export const openFormuleModal = (formuleId = null) => {
      const formuleForm = document.getElementById('formule-form');
      const formuleModal = document.getElementById('formule-modal');
      const formuleModalTitle = document.getElementById('formule-modal-title');
      formuleForm.reset();
      document.getElementById('formule-id-input').value = '';
      const selectionContainer = document.getElementById('formule-products-selection');
      selectionContainer.innerHTML = '';
      const formuleToEdit = formuleId ? getFormule(formuleId) : null;
      if (formuleToEdit) {
        formuleModalTitle.textContent = 'Modifier une formule';
        document.getElementById('formule-id-input').value = formuleToEdit.id;
        document.getElementById('formule-name').value = formuleToEdit.name;
        document.getElementById('formule-price').value = formuleToEdit.price;
      } else { formuleModalTitle.textContent = 'Créer une formule'; }
      Object.entries(state.products).forEach(([category, products]) => {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        let checkboxesHTML = products.map(p => {
          const isChecked = formuleToEdit ? (formuleToEdit.eligible_products[category]?.includes(p.id)) : false;
          return `<label class="flex items-center gap-2 p-2 rounded-md hover:bg-stone-50"><input type="checkbox" name="${category}" value="${p.id}" ${isChecked ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"><span>${p.name}</span></label>`;
        }).join('');
        selectionContainer.innerHTML += `<div><h4 class="text-lg font-semibold text-stone-700 mb-2 border-b pb-1">${categoryName}</h4><div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">${checkboxesHTML}</div></div>`;
      });
      formuleModal.classList.remove('hidden');
    };

export const openPromoModal = (promoId = null) => {
      const promoForm = document.getElementById('promo-form');
      const promoModal = document.getElementById('promo-modal');
      promoForm.reset();
      document.getElementById('promo-id-input').value = '';
      const selectionContainer = document.getElementById('promo-items-selection');
      selectionContainer.innerHTML = '';
      const promoToEdit = promoId ? state.promotions.find(p => p.id === promoId) : null;
      if (promoToEdit) {
        document.getElementById('promo-id-input').value = promoToEdit.id;
        document.getElementById('promo-description').value = promoToEdit.description;
        document.getElementById('promo-discount').value = promoToEdit.discount_percentage;
        document.getElementById('promo-expires-at').value = promoToEdit.expires_at ? new Date(promoToEdit.expires_at).toISOString().split('T')[0] : '';
        document.getElementById('promo-max-orders').value = promoToEdit.max_orders || '';
        if (promoToEdit.expires_at) promoForm.querySelector('input[name="promo_limit_type"][value="date"]').checked = true;
        else if (promoToEdit.max_orders) promoForm.querySelector('input[name="promo_limit_type"][value="orders"]').checked = true;
      }
      const updateVisibility = () => {
        if (promoForm.querySelector('input[name="promo_limit_type"]:checked').value === 'date') {
          document.getElementById('promo-expires-at-container').classList.remove('hidden');
          document.getElementById('promo-max-orders-container').classList.add('hidden');
        } else {
          document.getElementById('promo-expires-at-container').classList.add('hidden');
          document.getElementById('promo-max-orders-container').classList.remove('hidden');
        }
      };
      promoForm.querySelectorAll('input[name="promo_limit_type"]').forEach(radio => radio.addEventListener('change', updateVisibility));
      updateVisibility();

      let itemsHtml = '<div><h4 class="text-lg font-semibold text-stone-700 mb-2 border-b pb-1">Produits éligibles</h4><div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">';
      Object.values(state.products).flat().forEach(p => {
        const isChecked = promoToEdit ? promoToEdit.promotion_products?.some(pp => pp.product_id === p.id) : false;
        itemsHtml += `<label class="flex items-center gap-2"><input type="checkbox" name="promo_products" value="${p.id}" ${isChecked ? 'checked' : ''}>${p.name}</label>`;
      });
      itemsHtml += '</div></div>';

      itemsHtml += '<div><h4 class="text-lg font-semibold text-stone-700 mb-2 border-b pb-1">Formules éligibles</h4><div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">';
      state.formules.forEach(f => {
        const isChecked = promoToEdit ? promoToEdit.promotion_formules?.some(pf => pf.formule_id === f.id) : false;
        itemsHtml += `<label class="flex items-center gap-2"><input type="checkbox" name="promo_formules" value="${f.id}" ${isChecked ? 'checked' : ''}>${f.name}</label>`;
      });
      itemsHtml += '</div></div>';

      selectionContainer.innerHTML = itemsHtml;
      promoModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    };