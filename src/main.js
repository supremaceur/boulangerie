import { supabaseClient, state } from './store.js';
import { initAuth, handleLogin, handleSignup, handleGoogleLogin, handleLogout } from './auth.js';
import { loadInitialData } from './api.js';
import { addProductToCart, removeFromCart, handleCheckout } from './cart.js';
import { 
  renderCart, 
  renderHistory, 
  showLoader, 
  showToast, 
  showConfirmModal, 
  openOrderModal, 
  openFormuleModal, 
  openPromoModal,
  renderAdminOrders,
  renderAdminProducts,
  renderAdminFormules,
  renderAdminPromotions,
  renderAll,
  renderStats
} from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignupBtn = document.getElementById('show-signup-btn');
  const showLoginBtn = document.getElementById('show-login-btn');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const logoutBtns = [document.getElementById('logout-btn-customer'), document.getElementById('logout-btn-admin'), document.getElementById('logout-btn-customer-mobile')];
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const cartBtns = [document.getElementById('cart-btn-desktop'), document.getElementById('cart-btn-mobile')];
  const cartModal = document.getElementById('cart-modal');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const historyBtns = [document.getElementById('history-btn'), document.getElementById('history-btn-mobile')];
  const historyModal = document.getElementById('history-modal');
  const historyModalCloseBtn = document.getElementById('history-modal-close-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const refuseModal = document.getElementById('refuse-modal');
  const refuseReasonInput = document.getElementById('refuse-reason');
  const refuseCancelBtn = document.getElementById('refuse-cancel-btn');
  const refuseConfirmBtn = document.getElementById('refuse-confirm-btn');
  const productModal = document.getElementById('product-modal');
  const productModalCloseBtn = document.getElementById('product-modal-close-btn');
  const formuleModal = document.getElementById('formule-modal');
  const formuleModalCloseBtn = document.getElementById('formule-modal-close-btn');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const receiptModal = document.getElementById('receipt-modal');
  const receiptCloseBtn = document.getElementById('receipt-close-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotPasswordModalCloseBtn = document.getElementById('forgot-password-modal-close-btn');
  const resetPasswordModal = document.getElementById('reset-password-modal');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const addPromoBtn = document.getElementById('add-promo-btn');
  const promoModal = document.getElementById('promo-modal');
  const promoModalCloseBtn = document.getElementById('promo-modal-close-btn');
  const promoForm = document.getElementById('promo-form');
  const adminPromosContainer = document.getElementById('admin-promos-container');
  const statsTab = document.querySelector('#stats-tab');
  const ordersTabContent = document.getElementById('orders-tab');
  const adminOrderTabs = document.querySelectorAll('.admin-order-tab');
  const adminProductsContainer = document.getElementById('admin-products-container');
  const addProductBtn = document.getElementById('add-product-btn');
  const productForm = document.getElementById('product-form');
  const adminFormulesContainer = document.getElementById('admin-formules-container');
  const addFormuleBtn = document.getElementById('add-formule-btn');
  const formuleForm = document.getElementById('formule-form');

  // ===== LISTENERS =====
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
  showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

  googleLoginBtn.addEventListener('click', handleGoogleLogin);
  logoutBtns.forEach(btn => btn && btn.addEventListener('click', () => handleLogout(false)));
  hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // Cart modal
  cartBtns.forEach(btn => btn && btn.addEventListener('click', () => { renderCart(); cartModal.classList.remove('hidden'); }));
  document.getElementById('cart-body').addEventListener('click', e => {
    const removeFromCartBtn = e.target.closest('.remove-from-cart-btn');
    if (removeFromCartBtn) removeFromCart(parseInt(removeFromCartBtn.dataset.cartItemIndex, 10));
  });
  document.getElementById('cart-footer').addEventListener('click', e => { if (e.target.id === 'checkout-btn') handleCheckout(); });
  cartCloseBtn.addEventListener('click', () => cartModal.classList.add('hidden'));

  // History modal
  historyBtns.forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); renderHistory(); historyModal.classList.remove('hidden');}));
  historyModalCloseBtn.addEventListener('click', () => historyModal.classList.add('hidden'));

  // Other modals
  modalCloseBtn.addEventListener('click', () => document.getElementById('order-modal').classList.add('hidden'));
  refuseCancelBtn.addEventListener('click', () => refuseModal.classList.add('hidden'));
  productModalCloseBtn.addEventListener('click', () => productModal.classList.add('hidden'));
  formuleModalCloseBtn.addEventListener('click', () => formuleModal.classList.add('hidden'));
  confirmCancelBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
  receiptCloseBtn.addEventListener('click', () => receiptModal.classList.add('hidden'));
  forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); forgotPasswordModal.classList.remove('hidden'); });
  forgotPasswordModalCloseBtn?.addEventListener('click', () => { forgotPasswordModal.classList.add('hidden'); });

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-password-email').value;
    showLoader(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
      if (error) throw error;
      showToast("Un email de réinitialisation a été envoyé.");
      forgotPasswordModal.classList.add('hidden');
    } catch (error) {
      console.error('Forgot password error:', error);
      showToast(`Erreur: ${error.message}`);
    } finally { showLoader(false); }
  });

  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('reset-password-new').value;
    if (newPassword.length < 6) return showToast("Le mot de passe doit contenir au moins 6 caractères.");
    showLoader(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("Mot de passe réinitialisé avec succès !");
      resetPasswordModal.classList.add('hidden');
    } catch (error) {
      console.error('Reset password error:', error);
      showToast(`Erreur: ${error.message}`);
    } finally { showLoader(false); }
  });

  // CUSTOMER
  document.addEventListener('click', e => {
    const addToCartBtn = e.target.closest('.add-to-cart-btn');
    if (addToCartBtn) addProductToCart(parseInt(addToCartBtn.dataset.productId, 10));
    const orderBtn = e.target.closest('.order-btn');
    if (orderBtn) openOrderModal(parseInt(orderBtn.dataset.formuleId, 10));
  });

  // ADMIN: 
  document.addEventListener('click', async e => {
    const adminTab = e.target.closest('.admin-tab');
    if (!adminTab) return;
    e.preventDefault();
    const tabId = adminTab.dataset.tab;

    document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('bg-stone-700'); t.classList.add('hover:bg-stone-700'); });
    adminTab.classList.add('bg-stone-700'); adminTab.classList.remove('hover:bg-stone-700');

    document.querySelectorAll('.admin-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tabId}-tab`).classList.remove('hidden');

    if (tabId === 'orders') {
      showLoader(true);
      await loadInitialData(false);
      renderAdminOrders();
      showLoader(false);
    }
    if (tabId === 'stats') renderStats();
  });

  ordersTabContent.addEventListener('click', async e => {
    const confirmBtn = e.target.closest('.confirm-order-btn');
    const refuseBtn = e.target.closest('.refuse-order-btn');
    const deliverBtn = e.target.closest('.deliver-order-btn');

    if (confirmBtn) {
      const orderId = confirmBtn.dataset.orderId;
      const { error } = await supabaseClient.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
      if (error) showToast(`Erreur: ${error.message}`); else { await loadInitialData(false); renderAdminOrders(); }
    }
    if (refuseBtn) {
      const orderId = refuseBtn.dataset.orderId;
      refuseModal.classList.remove('hidden');
      refuseConfirmBtn.onclick = async () => {
        const reason = refuseReasonInput.value;
        const { error } = await supabaseClient.from('orders').update({ status: 'refused', refuse_reason: reason }).eq('id', orderId);
        if (error) showToast(`Erreur: ${error.message}`); else { await loadInitialData(false); renderAdminOrders(); }
        refuseReasonInput.value = '';
        refuseModal.classList.add('hidden');
      };
    }
    if (deliverBtn) {
      const orderId = deliverBtn.dataset.orderId;
      const { error } = await supabaseClient.from('orders').update({ status: 'delivered' }).eq('id', orderId);
      if (error) showToast(`Erreur: ${error.message}`); else { await loadInitialData(false); renderAdminOrders(); }
    }
  });

  adminOrderTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminOrderTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.orderTab === 'pending') { 
          document.getElementById('admin-orders-pending-container').classList.remove('hidden'); 
          document.getElementById('admin-orders-completed-container').classList.add('hidden'); 
      } else { 
          document.getElementById('admin-orders-pending-container').classList.add('hidden'); 
          document.getElementById('admin-orders-completed-container').classList.remove('hidden');
      }
    });
  });

  addProductBtn.addEventListener('click', () => { productForm.reset(); productModal.classList.remove('hidden'); });
  
  productForm.addEventListener('submit', async e => {
    e.preventDefault();
    const newProduct = { name: document.getElementById('product-name').value, price: parseFloat(document.getElementById('product-price').value), category: document.getElementById('product-category').value };
    showLoader(true);
    const { error } = await supabaseClient.from('products').insert(newProduct);
    if (error) { showToast(`Erreur: ${error.message}`); } else { showToast("Produit ajouté !"); }
    await loadInitialData(false);
    renderAdminProducts();
    productModal.classList.add('hidden');
    showLoader(false);
  });

  adminProductsContainer.addEventListener('click', async e => {
    const deleteBtn = e.target.closest('.delete-product-btn');
    if (deleteBtn) {
      const productId = deleteBtn.dataset.productId;
      showConfirmModal('Supprimer ce produit?', 'Cette action est irréversible.', async () => {
        showLoader(true);
        const { error } = await supabaseClient.from('products').delete().eq('id', productId);
        if (error) showToast(`Erreur: ${error.message}`); else showToast("Produit supprimé.");
        await loadInitialData(false);
        renderAdminProducts();
        renderAdminFormules();
        showLoader(false);
      });
    }
  });

  adminProductsContainer.addEventListener('change', async e => {
    if (e.target.classList.contains('toggle-product-btn')) {
      const { productId } = e.target.dataset;
      const isAvailable = e.target.checked;
      const { error } = await supabaseClient.from('products').update({ available: isAvailable }).eq('id', productId);
      if (error) { showToast(`Erreur: ${error.message}`); e.target.checked = !isAvailable; } else { showToast(`Disponibilité mise à jour.`); }
    }
  });

  addFormuleBtn.addEventListener('click', () => openFormuleModal());

  adminFormulesContainer.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-formule-btn');
    if (editBtn) openFormuleModal(parseInt(editBtn.dataset.formuleId, 10));
    const deleteBtn = e.target.closest('.delete-formule-btn');
    if (deleteBtn) {
      const formuleId = deleteBtn.dataset.formuleId;
      showConfirmModal('Supprimer cette formule?', 'Cette action est irréversible.', async () => {
        showLoader(true);
        await supabaseClient.from('formule_products').delete().eq('formule_id', formuleId);
        const { error } = await supabaseClient.from('formules').delete().eq('id', formuleId);
        if (error) showToast(`Erreur: ${error.message}`); else showToast("Formule supprimée.");
        await loadInitialData(false);
        renderAdminFormules();
        showLoader(false);
      });
    }
  });

  formuleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    const id_str = document.getElementById('formule-id-input').value;
    const id = id_str ? parseInt(id_str, 10) : null;
    const name = document.getElementById('formule-name').value;
    const price = parseFloat(document.getElementById('formule-price').value);
    const selectedProducts = Array.from(formuleForm.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));
    try {
      if (id) {
        const { error } = await supabaseClient.from('formules').update({ name, price }).eq('id', id);
        if (error) throw error;
        await supabaseClient.from('formule_products').delete().eq('formule_id', id);
        if (selectedProducts.length > 0) {
          const toInsert = selectedProducts.map(pid => ({ formule_id: id, product_id: pid }));
          const { error: insertError } = await supabaseClient.from('formule_products').insert(toInsert);
          if (insertError) throw insertError;
        }
      } else {
        const { data, error } = await supabaseClient.from('formules').insert({ name, price }).select().single();
        if (error) throw error;
        if (selectedProducts.length > 0) {
          const toInsert = selectedProducts.map(pid => ({ formule_id: data.id, product_id: pid }));
          const { error: insertError } = await supabaseClient.from('formule_products').insert(toInsert);
          if (insertError) throw insertError;
        }
      }
      showToast("Formule enregistrée !");
    } catch (error) {
      showToast(`Erreur: ${error.message}`); console.error("Error saving formule:", error);
    } finally {
      await loadInitialData(false);
      renderAdminFormules();
      formuleModal.classList.add('hidden');
      showLoader(false);
    }
  });

  addPromoBtn.addEventListener('click', () => openPromoModal());
  promoModalCloseBtn.addEventListener('click', () => { promoModal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); });

  promoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descriptionEl = promoForm.querySelector('#promo-description');
    if (!descriptionEl || !descriptionEl.value.trim()) { showToast("La description ne peut pas être vide."); return; }
    showLoader(true);
    const id = document.getElementById('promo-id-input').value;
    const promoData = { description: descriptionEl.value, discount_percentage: parseFloat(document.getElementById('promo-discount').value) };
    const limitType = promoForm.querySelector('input[name="promo_limit_type"]:checked').value;
    if (limitType === 'date') { const exp = document.getElementById('promo-expires-at').value; promoData.expires_at = exp || null; promoData.max_orders = null; }
    else { const mo = document.getElementById('promo-max-orders').value; promoData.max_orders = mo ? parseInt(mo, 10) : null; promoData.expires_at = null; }

    const selectedProducts = Array.from(promoForm.querySelectorAll('input[name="promo_products"]:checked')).map(cb => parseInt(cb.value, 10));
    const selectedFormules = Array.from(promoForm.querySelectorAll('input[name="promo_formules"]:checked')).map(cb => parseInt(cb.value, 10));

    try {
      if (id) {
        const { error } = await supabaseClient.from('promotions').update(promoData).eq('id', id);
        if (error) throw error;
        await supabaseClient.from('promotion_products').delete().eq('promotion_id', id);
        await supabaseClient.from('promotion_formules').delete().eq('promotion_id', id);
        if (selectedProducts.length) await supabaseClient.from('promotion_products').insert(selectedProducts.map(pid => ({ promotion_id: id, product_id: pid })));
        if (selectedFormules.length) await supabaseClient.from('promotion_formules').insert(selectedFormules.map(fid => ({ promotion_id: id, formule_id: fid })));
      } else {
        const { data, error } = await supabaseClient.from('promotions').insert(promoData).select().single();
        if (error) throw error;
        const newPromoId = data.id;
        if (selectedProducts.length) await supabaseClient.from('promotion_products').insert(selectedProducts.map(pid => ({ promotion_id: newPromoId, product_id: pid })));
        if (selectedFormules.length) await supabaseClient.from('promotion_formules').insert(selectedFormules.map(fid => ({ promotion_id: newPromoId, formule_id: fid })));
      }
      showToast("Promotion enregistrée !");
    } catch (error) {
      showToast(`Erreur: ${error.message}`); console.error("Error saving promotion:", error);
    } finally {
      await loadInitialData(false);
      renderAdminPromotions();
      promoModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      showLoader(false);
    }
  });

  adminPromosContainer.addEventListener('click', async e => {
    const editBtn = e.target.closest('.edit-promo-btn');
    if (editBtn) openPromoModal(parseInt(editBtn.dataset.promoId, 10));
    const deleteBtn = e.target.closest('.delete-promo-btn');
    if (deleteBtn) {
      const promoId = deleteBtn.dataset.promoId;
      showConfirmModal('Supprimer cette promotion?', 'Cette action est irréversible.', async () => {
        showLoader(true);
        const { error } = await supabaseClient.from('promotions').delete().eq('id', promoId);
        if (error) showToast(`Erreur: ${error.message}`); else showToast("Promotion supprimée.");
        await loadInitialData(false);
        renderAdminPromotions();
        showLoader(false);
      });
    }
  });

  statsTab.addEventListener('click', e => {
    if (e.target.classList.contains('stats-filter-btn')) {
      document.querySelectorAll('.stats-filter-btn').forEach(btn => { btn.classList.remove('bg-amber-600','text-white'); btn.classList.add('bg-stone-200','text-stone-700'); });
      e.target.classList.add('bg-amber-600','text-white'); e.target.classList.remove('bg-stone-200','text-stone-700');
      renderStats(e.target.dataset.period);
    }
  });

  window.addEventListener('focus', async () => {
    if (!state.currentUser) return;
    await loadInitialData(false);
    if (state.currentUser.role === 'admin') {
      const isOrdersVisible = !document.getElementById('orders-tab').classList.contains('hidden');
      if (isOrdersVisible) renderAdminOrders(); else renderAll();
    } else { renderAll(); }
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !state.currentUser) return;
    await loadInitialData(false);
    if (state.currentUser.role === 'admin') {
      const isOrdersVisible = !document.getElementById('orders-tab').classList.contains('hidden');
      if (isOrdersVisible) renderAdminOrders(); else renderAll();
    } else { renderAll(); }
  });

  // ===== BOOTSTRAP =====
  await initAuth();
});
