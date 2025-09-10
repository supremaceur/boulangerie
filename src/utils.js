import { state } from './store.js';

export const getProduct = (id) => Object.values(state.products).flat().find(p => p.id === id);
export const getFormule = (id) => state.formules.find(f => f.id === id);

export function findApplicablePromotion(cart) {
    let bestPromo = null;
    if (!state.promotions || state.promotions.length === 0) return null;
    const now = new Date();
    for (const promo of state.promotions) {
      if (promo.expires_at && new Date(promo.expires_at) < now) continue;
      if (promo.max_orders && promo.usage_count >= promo.max_orders) continue;
      let isEligible = false;
      for (const item of cart) {
        if (item.type === 'product') {
          if (promo.promotion_products?.some(pp => pp.product_id === item.product.id)) { isEligible = true; break; }
        } else if (item.type === 'formule') {
          if (promo.promotion_formules?.some(pf => pf.formule_id === item.formule.id)) { isEligible = true; break; }
        }
      }
      if (isEligible) {
        if (!bestPromo || promo.discount_percentage > bestPromo.discount_percentage) bestPromo = promo;
      }
    }
    return bestPromo;
}