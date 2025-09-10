import { state, supabaseClient } from './store.js';
import { getProduct, findApplicablePromotion } from './utils.js';
import { updateCartBadge, showToast, renderCart, showLoader, renderAll } from './ui.js';
import { loadInitialData } from './api.js';

export function addProductToCart(productId) {
  const product = getProduct(productId);
  if (!product) return;
  const cartItem = state.cart.find(item => item.type === 'product' && item.product.id === productId);
  if (cartItem) cartItem.quantity++; else state.cart.push({ type: 'product', product: product, quantity: 1 });
  updateCartBadge();
  showToast(`${product.name} a été ajouté au panier.`);
}

export function removeFromCart(cartItemIndex) {
  if (cartItemIndex > -1 && cartItemIndex < state.cart.length) {
    state.cart.splice(cartItemIndex, 1);
    updateCartBadge();
    renderCart();
  }
}

export async function handleCheckout() {
  if (state.cart.length === 0) return showToast("Votre panier est vide.");
  showLoader(true);
  try {
    const subtotal = state.cart.reduce((total, item) => {
      const price = item.type === 'product' ? item.product.price : item.formule.price;
      return total + (item.quantity * price);
    }, 0);

    const applicablePromo = findApplicablePromotion(state.cart);
    let discountAmount = 0;
    let finalTotal = subtotal;
    let promoId = null;
    if (applicablePromo) {
      discountAmount = subtotal * (applicablePromo.discount_percentage / 100);
      finalTotal = subtotal - discountAmount;
      promoId = applicablePromo.id;
    }

    const pickupTime = document.getElementById('cart-pickup-time').value;

    const { data: orderData, error: orderError } = await supabaseClient.from('orders').insert({
      user_id: state.currentUser.id,
      total_price: finalTotal,
      pickup_time: pickupTime,
      status: 'pending',
      promotion_id: promoId,
      discount_amount: discountAmount
    }).select().single();
    if (orderError) throw orderError;

    const orderItemsToInsert = state.cart.map(item => {
      if (item.type === 'product') {
        return { order_id: orderData.id, product_id: item.product.id, quantity: item.quantity, price: item.product.price, category: item.product.category };
      } else {
        return { order_id: orderData.id, formule_id: item.formule.id, quantity: item.quantity, price: item.formule.price, description: item.selectedProducts.map(p => p.name).join(', '), category: 'formule' };
      }
    });

    const { error: itemsError } = await supabaseClient.from('order_items').insert(orderItemsToInsert);
    if (itemsError) throw itemsError;

    state.cart = [];
    updateCartBadge();
    renderCart();
    document.getElementById('cart-modal').classList.add('hidden');
    await loadInitialData(false);
    renderAll();
    showToast("Commande passée avec succès !");
  } catch (error) {
    console.error('Checkout error:', error);
    showToast(`Erreur lors de la commande: ${error.message}`);
  } finally {
    showLoader(false);
  }
}
