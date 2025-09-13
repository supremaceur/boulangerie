// Version de debug simplifiée pour customer.js
document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== DEBUG VERSION STARTED ===');

  // Configuration Supabase
  const SUPABASE_URL = 'https://zliusqwhpqzszjetvrpx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXVzcXdocHF6c3pqZXR2cnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE2MzgsImV4cCI6MjA3MjczNzYzOH0.Zb3InrWND0YpIUNHSHKDdPUxQzgihQOB2491VRb994E';
  
  console.log('Initializing Supabase client...');
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client created');

  // Test de connexion à la base de données
  try {
    console.log('Testing database connection...');
    const { data, error } = await supabaseClient.from('products').select('count').limit(1);
    if (error) {
      console.error('Database connection failed:', error);
    } else {
      console.log('Database connection successful');
    }
  } catch (err) {
    console.error('Database test error:', err);
  }

  // Vérifier l'authentification
  console.log('Checking authentication...');
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Auth error:', error);
      return;
    }
    
    if (!session) {
      console.log('No session found - redirecting to login');
      window.location.href = 'login.html';
      return;
    }
    
    console.log('User authenticated:', session.user.email);
  } catch (authError) {
    console.error('Auth check failed:', authError);
    return;
  }

  // Test de chargement des produits
  console.log('Loading products...');
  try {
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('*');
    
    if (error) {
      console.error('Products loading error:', error);
    } else {
      console.log('Products loaded successfully:', products.length, 'items');
      console.log('Sample products:', products.slice(0, 3));
      
      // Afficher les produits dans la console par catégorie
      const byCategory = {
        sandwich: products.filter(p => p.category === 'sandwich'),
        boisson: products.filter(p => p.category === 'boisson'),
        dessert: products.filter(p => p.category === 'dessert')
      };
      
      console.log('Products by category:');
      console.log('- Sandwichs:', byCategory.sandwich.length);
      console.log('- Boissons:', byCategory.boisson.length);
      console.log('- Desserts:', byCategory.dessert.length);
    }
  } catch (productError) {
    console.error('Product loading failed:', productError);
  }

  // Test de chargement des formules
  console.log('Loading formules...');
  try {
    const { data: formules, error } = await supabaseClient
      .from('formules')
      .select('*');
    
    if (error) {
      console.error('Formules loading error:', error);
    } else {
      console.log('Formules loaded successfully:', formules.length, 'items');
      console.log('Sample formules:', formules.slice(0, 3));
    }
  } catch (formuleError) {
    console.error('Formule loading failed:', formuleError);
  }

  // Vérifier les éléments DOM
  console.log('Checking DOM elements...');
  const elements = {
    'formules-container': document.getElementById('formules-container'),
    'products-container': document.getElementById('products-container'),
    'cart-btn-desktop': document.getElementById('cart-btn-desktop'),
    'cart-btn-mobile': document.getElementById('cart-btn-mobile'),
    'history-btn': document.getElementById('history-btn'),
    'logout-btn-customer': document.getElementById('logout-btn-customer'),
    'welcome-message': document.getElementById('welcome-message')
  };

  Object.entries(elements).forEach(([name, element]) => {
    if (element) {
      console.log(`✓ Found element: ${name}`);
    } else {
      console.error(`✗ Missing element: ${name}`);
    }
  });

  // Test simple d'affichage
  const formulesContainer = document.getElementById('formules-container');
  const productsContainer = document.getElementById('products-container');

  if (formulesContainer) {
    formulesContainer.innerHTML = '<div class="bg-white p-4 rounded">TEST: Formules container fonctionne</div>';
    console.log('✓ Formules container test successful');
  }

  if (productsContainer) {
    productsContainer.innerHTML = '<div class="bg-white p-4 rounded">TEST: Products container fonctionne</div>';
    console.log('✓ Products container test successful');
  }

  // Test des boutons
  const cartBtn = document.getElementById('cart-btn-desktop');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      console.log('Cart button clicked!');
      alert('Bouton panier fonctionne!');
    });
    console.log('✓ Cart button event listener added');
  }

  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('History button clicked!');
      alert('Bouton historique fonctionne!');
    });
    console.log('✓ History button event listener added');
  }

  const logoutBtn = document.getElementById('logout-btn-customer');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Logout button clicked!');
      if (confirm('Voulez-vous vraiment vous déconnecter?')) {
        supabaseClient.auth.signOut().then(() => {
          window.location.href = 'login.html';
        });
      }
    });
    console.log('✓ Logout button event listener added');
  }

  console.log('=== DEBUG VERSION COMPLETE ===');
  console.log('Si vous voyez ce message, le JavaScript fonctionne. Vérifiez la console pour les erreurs spécifiques.');
});