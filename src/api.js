import { supabaseClient, state } from './store.js';
import { getProduct } from './utils.js';

export async function loadInitialData() {
  try {
    // Profile
    if (state.currentUser) {
      const { data, error } = await supabaseClient.from('profiles').select('first_name, last_name').eq('id', state.currentUser.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      state.userProfile = data;
    }
    // Products
    const { data: productsData, error: productsError } = await supabaseClient.from('products').select('*');
    if (productsError) throw productsError;
    state.products = { sandwichs: [], boissons: [], desserts: [] };
    productsData.forEach(p => {
      if (!state.products[p.category]) state.products[p.category] = [];
      state.products[p.category].push(p);
    });
    // Formules + eligible
    const { data: formulesData, error: formulesError } = await supabaseClient.from('formules').select('*, formule_products(product_id)');
    if (formulesError) throw formulesError;
    state.formules = formulesData.map(f => {
      const eligible_products = { sandwichs: [], boissons: [], desserts: [] };
      if (f.formule_products) {
        f.formule_products.forEach(fp => {
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
      let query = supabaseClient.from('orders').select('*, order_items(*, products(*), formules(*))');
      if (state.currentUser.role !== 'admin') { query = query.eq('user_id', state.currentUser.id); }
      const { data: ordersData, error: ordersError } = await query.order('created_at', { ascending: false });
      if (ordersError) throw ordersError;
      state.orders = ordersData;
    }
    // Promotions
    const { data: promosData, error: promosError } = await supabaseClient.from('promotions').select('*, promotion_products(product_id), promotion_formules(formule_id)');
    if (promosError) throw promosError;
    state.promotions = promosData;
    // usage_count
    for (const promo of state.promotions) {
      const { data: count, error: countError } = await supabaseClient.rpc('get_promotion_usage_count', { p_promotion_id: promo.id });
      if (!countError) promo.usage_count = count;
    }
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}


