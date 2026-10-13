/**
 * ==============================================================================
 * FLIPKART CLONE - PURE VANILLA JAVASCRIPT
 * Strictly HTML5, CSS3, & Vanilla JavaScript (No Frameworks, No Libraries)
 * Designed for 0-2 Years Entry-Level & Web Content/CMS Authoring Role
 * ==============================================================================
 */

// Strict Mode for cleaner code and catching common mistakes
'use strict';

/* ==============================================================================
   1. SEED DATA & CONSTANTS
   ============================================================================== */

const INITIAL_CATEGORIES = [
  { id: 'all', name: 'Top Offers', icon: '🏷️' },
  { id: 'Mobiles', name: 'Mobiles', icon: '📱' },
  { id: 'Electronics', name: 'Electronics', icon: '💻' },
  { id: 'Fashion', name: 'Fashion', icon: '👕' },
  { id: 'Appliances', name: 'Appliances', icon: '📺' },
  { id: 'Home & Furniture', name: 'Home & Furniture', icon: '🛋️' },
  { id: 'Grocery', name: 'Grocery', icon: '🛒' }
];

const INITIAL_BANNERS = [
  {
    id: 1,
    tag: 'Big Billion Days',
    title: 'Flagship Smartphones at Best Prices',
    subtitle: 'From ₹12,999* | Extra Exchange Bonus up to ₹5,000',
    bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    graphic: '📱'
  },
  {
    id: 2,
    tag: 'Mega Electronics Carnival',
    title: 'Top Laptops & Tech Accessories',
    subtitle: 'Up to 45% Off on Core i5/i7 & Apple M-Series Laptops',
    bg: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    graphic: '💻'
  },
  {
    id: 3,
    tag: 'Fashion Fest',
    title: 'Trending Styles, Footwear & Apparel',
    subtitle: 'Under ₹999 | Top Brands: Puma, Levi\'s, Nike & More',
    bg: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)',
    graphic: '👟'
  },
  {
    id: 4,
    tag: 'Home & Living',
    title: 'Revamp Your Living Space & Kitchen',
    subtitle: 'Starting from ₹499 | Free Installation on Big Appliances',
    bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    graphic: '🛋️'
  }
];

const INITIAL_PRODUCTS = [
  {
    id: 'prod_1',
    title: 'Apple iPhone 15 (Blue, 128 GB)',
    category: 'Mobiles',
    originalPrice: 79900,
    discountPrice: 65999,
    rating: 4.6,
    ratingCount: 14220,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=60',
    specs: [
      '128 GB ROM',
      '15.49 cm (6.1 inch) Super Retina XDR Display',
      '48MP + 12MP Dual Rear Camera | 12MP Front Camera',
      'A16 Bionic Chip, 6 Core Processor'
    ]
  },
  {
    id: 'prod_2',
    title: 'Samsung Galaxy S23 5G (Phantom Black, 128 GB)',
    category: 'Mobiles',
    originalPrice: 74999,
    discountPrice: 48999,
    rating: 4.5,
    ratingCount: 8940,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=60',
    specs: [
      '8 GB RAM | 128 GB ROM',
      '15.49 cm (6.1 inch) Full HD+ Dynamic AMOLED 2X',
      '50MP + 12MP + 10MP | 12MP Front Camera',
      'Snapdragon 8 Gen 2 Processor'
    ]
  },
  {
    id: 'prod_3',
    title: 'Apple MacBook Air M2 - (8 GB/256 GB SSD/macOS)',
    category: 'Electronics',
    originalPrice: 99900,
    discountPrice: 84990,
    rating: 4.7,
    ratingCount: 4210,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Apple M2 Processor',
      '8 GB Unified Memory | 256 GB SSD',
      '34.54 cm (13.6 Inch) Liquid Retina Display',
      'Mac OS Monterey with 18 Hours Battery Life'
    ]
  },
  {
    id: 'prod_4',
    title: 'Sony WH-1000XM5 Wireless Active Noise Cancelling Headphones',
    category: 'Electronics',
    originalPrice: 34990,
    discountPrice: 26990,
    rating: 4.6,
    ratingCount: 3120,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
    specs: [
      'With Mic: Yes',
      'Bluetooth version: 5.2 | Battery life: 30 hrs',
      'Industry-leading Active Noise Cancellation (ANC)',
      'Quick charge: 3 min charge for 3 hrs playback'
    ]
  },
  {
    id: 'prod_5',
    title: 'Nike Air Max Men\'s Running & Training Sneakers',
    category: 'Fashion',
    originalPrice: 8995,
    discountPrice: 4945,
    rating: 4.3,
    ratingCount: 1540,
    isAssured: false,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Color: University Red / White',
      'Outer Material: Mesh & Synthetic Leather',
      'Closure: Lace-Ups | Cushioning: Visible Max Air Unit',
      'Wipe with a clean dry cloth'
    ]
  },
  {
    id: 'prod_6',
    title: 'Men Slim Fit Solid Spread Collar Casual Cotton Shirt',
    category: 'Fashion',
    originalPrice: 2299,
    discountPrice: 799,
    rating: 4.1,
    ratingCount: 9840,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Fabric: 100% Breathable Cotton',
      'Fit: Slim Fit | Pattern: Solid Casual',
      'Collar: Spread Collar | Sleeve: Full Sleeve',
      'Machine Wash as per care tag'
    ]
  },
  {
    id: 'prod_7',
    title: 'LG 1.5 Ton 5 Star AI DUAL Inverter Split AC',
    category: 'Appliances',
    originalPrice: 75990,
    discountPrice: 46490,
    rating: 4.4,
    ratingCount: 5410,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Capacity: 1.5 Ton (Suitable for Medium rooms 111 to 150 sq ft)',
      '5 Star Energy Rating for Best-in-class Efficiency',
      'Copper Condenser Coil with Ocean Black Protection',
      '6-in-1 Convertible Cooling Mode'
    ]
  },
  {
    id: 'prod_8',
    title: 'Samsung 55 Inch Ultra HD (4K) Smart LED TV',
    category: 'Appliances',
    originalPrice: 62900,
    discountPrice: 42990,
    rating: 4.5,
    ratingCount: 6810,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Ultra HD (4K) 3840 x 2160 Pixels resolution',
      '20 W Sound Output | Dolby Digital Plus',
      'Supported Apps: Netflix, Prime Video, YouTube, Disney+ Hotstar',
      'Refresh Rate: 50 Hz | Crystal 4K Processor'
    ]
  },
  {
    id: 'prod_9',
    title: 'Solid Sheesham Wood Queen Size Bed with Storage',
    category: 'Home & Furniture',
    originalPrice: 45000,
    discountPrice: 22499,
    rating: 4.2,
    ratingCount: 1820,
    isAssured: false,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Material: 100% Seasoned Sheesham Wood',
      'Bed Size: Queen Size (78 x 60 Inches)',
      'Storage Type: Hydraulic Lift-on Storage Box',
      'Termite resistant with Natural Teak finish'
    ]
  },
  {
    id: 'prod_10',
    title: 'Ergonomic High-Back Executive Office Chair with Lumbar Support',
    category: 'Home & Furniture',
    originalPrice: 14999,
    discountPrice: 6890,
    rating: 4.3,
    ratingCount: 3910,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1580481077191-c2929e017290?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Adjustable Height with Heavy-Duty Gas Lift',
      'Breathable Mesh Back with Dynamic Lumbar Cushion',
      'Multi-lock Recline Mechanism (90 to 135 Degrees)',
      '360 Degree Smooth Nylon Castor Wheels'
    ]
  },
  {
    id: 'prod_11',
    title: 'Organic Cold Pressed Extra Virgin Olive Oil (1 Litre)',
    category: 'Grocery',
    originalPrice: 1599,
    discountPrice: 949,
    rating: 4.6,
    ratingCount: 4200,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Volume: 1 Litre Glass Bottle',
      'First Cold Pressed for Maximum Nutrient Preservation',
      'Rich in Anti-Oxidants & MUFA Fatty Acids',
      '100% Certified Organic & Chemical-Free'
    ]
  },
  {
    id: 'prod_12',
    title: 'California Premium Almonds & Cashews Combo (1 kg Pack)',
    category: 'Grocery',
    originalPrice: 1800,
    discountPrice: 1199,
    rating: 4.5,
    ratingCount: 12500,
    isAssured: true,
    image: 'https://images.unsplash.com/photo-1508061252445-5350f3ab0a55?w=500&auto=format&fit=crop&q=60',
    specs: [
      'Pack Contents: 500g Jumbo Almonds + 500g Whole Cashews',
      'Vacuum Packed for Long-lasting Freshness & Crunch',
      'Zero Trans Fat, Zero Cholesterol',
      'Immunity Boosting Daily Superfood'
    ]
  }
];

/* ==============================================================================
   2. APPLICATION STATE
   ============================================================================== */

const AppState = {
  products: [],
  banners: [],
  cart: [],
  wishlist: new Set(),
  activeCategory: 'all',
  searchQuery: '',
  maxPrice: 150000,
  minRating: 0,
  assuredOnly: false,
  sortBy: 'popularity',
  carouselIndex: 0,
  carouselTimer: null
};

/* ==============================================================================
   3. STORAGE HELPERS (Local Storage Persistence)
   ============================================================================== */

function loadSavedState() {
  try {
    const savedProducts = localStorage.getItem('fk_products');
    AppState.products = savedProducts ? JSON.parse(savedProducts) : [...INITIAL_PRODUCTS];

    const savedBanners = localStorage.getItem('fk_banners');
    AppState.banners = savedBanners ? JSON.parse(savedBanners) : [...INITIAL_BANNERS];

    const savedCart = localStorage.getItem('fk_cart');
    AppState.cart = savedCart ? JSON.parse(savedCart) : [];

    const savedWishlist = localStorage.getItem('fk_wishlist');
    AppState.wishlist = savedWishlist ? new Set(JSON.parse(savedWishlist)) : new Set();
  } catch (err) {
    console.warn('LocalStorage access restricted or corrupted. Using initial data.', err);
    AppState.products = [...INITIAL_PRODUCTS];
    AppState.banners = [...INITIAL_BANNERS];
    AppState.cart = [];
    AppState.wishlist = new Set();
  }
}

function persistCart() {
  try {
    localStorage.setItem('fk_cart', JSON.stringify(AppState.cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

function persistWishlist() {
  try {
    localStorage.setItem('fk_wishlist', JSON.stringify(Array.from(AppState.wishlist)));
  } catch (e) {
    console.error('Failed to save wishlist to localStorage', e);
  }
}

function persistProducts() {
  try {
    localStorage.setItem('fk_products', JSON.stringify(AppState.products));
  } catch (e) {
    console.error('Failed to save products to localStorage', e);
  }
}

function persistBanners() {
  try {
    localStorage.setItem('fk_banners', JSON.stringify(AppState.banners));
  } catch (e) {
    console.error('Failed to save banners to localStorage', e);
  }
}

/* ==============================================================================
   4. FORMATTING & UTILITY FUNCTIONS
   ============================================================================== */

// Indian Rupee currency format (e.g. ₹65,999)
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Calculate percentage discount
function calcDiscountPercent(original, discounted) {
  if (!original || original <= discounted) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2600);
}

/* ==============================================================================
   5. UI RENDERING MODULES
   ============================================================================== */

/**
 * Render Category Navigation Bar
 */
function renderCategoriesBar() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  container.innerHTML = '';

  INITIAL_CATEGORIES.forEach(cat => {
    const pill = document.createElement('div');
    pill.className = `category-pill ${AppState.activeCategory === cat.id ? 'active' : ''}`;
    pill.dataset.categoryId = cat.id;

    pill.innerHTML = `
      <div class="category-icon-box">${cat.icon}</div>
      <span class="category-name">${cat.name}</span>
    `;

    pill.addEventListener('click', () => {
      AppState.activeCategory = cat.id;
      // Also update sidebar category checkboxes if needed
      updateActiveCategoryPills();
      filterAndRenderProducts();
    });

    container.appendChild(pill);
  });
}

function updateActiveCategoryPills() {
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(p => {
    if (p.dataset.categoryId === AppState.activeCategory) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

/**
 * Render Sidebar Categories
 */
function renderSidebarCategories() {
  const container = document.getElementById('categoryFilterOptions');
  if (!container) return;

  container.innerHTML = '';

  INITIAL_CATEGORIES.filter(c => c.id !== 'all').forEach(cat => {
    const label = document.createElement('label');
    label.className = 'filter-checkbox-label';
    label.innerHTML = `
      <input type="checkbox" value="${cat.id}" class="category-checkbox" ${AppState.activeCategory === cat.id ? 'checked' : ''}>
      <span>${cat.name}</span>
    `;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        AppState.activeCategory = cat.id;
      } else if (AppState.activeCategory === cat.id) {
        AppState.activeCategory = 'all';
      }
      updateActiveCategoryPills();
      filterAndRenderProducts();
    });

    container.appendChild(label);
  });
}

/**
 * Render Hero Banner Carousel
 */
function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track || !dotsContainer) return;

  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  AppState.banners.forEach((banner, index) => {
    // Create Slide
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.style.background = banner.bg;
    slide.innerHTML = `
      <div class="carousel-content">
        <span class="carousel-tag">${banner.tag}</span>
        <h2 class="carousel-title">${banner.title}</h2>
        <p class="carousel-subtitle">${banner.subtitle}</p>
        <span class="carousel-cta">Explore Now</span>
      </div>
      <div class="carousel-graphic">${banner.graphic || '✨'}</div>
    `;

    slide.addEventListener('click', () => {
      showToast(`Showing deals for: ${banner.title}`, 'info');
    });

    track.appendChild(slide);

    // Create Dot
    const dot = document.createElement('div');
    dot.className = `carousel-dot ${index === AppState.carouselIndex ? 'active' : ''}`;
    dot.dataset.slideIndex = index;
    dot.addEventListener('click', () => {
      goToSlide(index);
    });
    dotsContainer.appendChild(dot);
  });

  updateSlidePosition();
}

function goToSlide(index) {
  if (index < 0) {
    AppState.carouselIndex = AppState.banners.length - 1;
  } else if (index >= AppState.banners.length) {
    AppState.carouselIndex = 0;
  } else {
    AppState.carouselIndex = index;
  }
  updateSlidePosition();
}

function updateSlidePosition() {
  const track = document.getElementById('carouselTrack');
  if (track) {
    track.style.transform = `translateX(-${AppState.carouselIndex * 100}%)`;
  }

  const dots = document.querySelectorAll('.carousel-dot');
  dots.forEach((dot, idx) => {
    if (idx === AppState.carouselIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function startCarouselAutoplay() {
  stopCarouselAutoplay();
  AppState.carouselTimer = setInterval(() => {
    goToSlide(AppState.carouselIndex + 1);
  }, 4500);
}

function stopCarouselAutoplay() {
  if (AppState.carouselTimer) {
    clearInterval(AppState.carouselTimer);
    AppState.carouselTimer = null;
  }
}

/**
 * Filter & Sort Products
 */
function getFilteredAndSortedProducts() {
  let list = AppState.products.filter(item => {
    // 1. Category Filter
    if (AppState.activeCategory !== 'all' && item.category !== AppState.activeCategory) {
      return false;
    }

    // 2. Search Query (Title & Category)
    if (AppState.searchQuery.trim() !== '') {
      const q = AppState.searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }

    // 3. Price Filter
    if (item.discountPrice > AppState.maxPrice) {
      return false;
    }

    // 4. Rating Filter
    if (item.rating < AppState.minRating) {
      return false;
    }

    // 5. Assured Filter
    if (AppState.assuredOnly && !item.isAssured) {
      return false;
    }

    return true;
  });

  // Sorting
  switch (AppState.sortBy) {
    case 'price-low':
      list.sort((a, b) => a.discountPrice - b.discountPrice);
      break;
    case 'price-high':
      list.sort((a, b) => b.discountPrice - a.discountPrice);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'discount':
      list.sort((a, b) => {
        const discA = calcDiscountPercent(a.originalPrice, a.discountPrice);
        const discB = calcDiscountPercent(b.originalPrice, b.discountPrice);
        return discB - discA;
      });
      break;
    case 'popularity':
    default:
      list.sort((a, b) => b.ratingCount - a.ratingCount);
      break;
  }

  return list;
}

/**
 * Render Product Cards Grid
 */
function filterAndRenderProducts() {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');
  const countSummary = document.getElementById('productCountSummary');
  const chipsContainer = document.getElementById('activeFilterChips');

  if (!grid) return;

  const filtered = getFilteredAndSortedProducts();

  // Update Count Summary
  if (countSummary) {
    countSummary.textContent = `Showing ${filtered.length} of ${AppState.products.length} products`;
  }

  // Active Filter Chips
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    if (AppState.activeCategory !== 'all') {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `${AppState.activeCategory} <span>&times;</span>`;
      chip.addEventListener('click', () => {
        AppState.activeCategory = 'all';
        updateActiveCategoryPills();
        filterAndRenderProducts();
      });
      chipsContainer.appendChild(chip);
    }
    if (AppState.searchQuery) {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `"${AppState.searchQuery}" <span>&times;</span>`;
      chip.addEventListener('click', () => {
        AppState.searchQuery = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        filterAndRenderProducts();
      });
      chipsContainer.appendChild(chip);
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = '';

  filtered.forEach(product => {
    const discount = calcDiscountPercent(product.originalPrice, product.discountPrice);
    const isWishlisted = AppState.wishlist.has(product.id);

    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.id = product.id;

    card.innerHTML = `
      <!-- Wishlist Toggle -->
      <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" aria-label="Add to wishlist" data-wishlist-id="${product.id}">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </button>

      <!-- Image Box -->
      <div class="product-image-box" data-action="quickview" data-product-id="${product.id}">
        <img 
          src="${product.image}" 
          alt="${product.title}" 
          class="product-image" 
          loading="lazy"
          onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';"
        >
      </div>

      <!-- Info Area -->
      <div class="product-info">
        <span class="product-category-tag">${product.category}</span>
        <h3 class="product-title" data-action="quickview" data-product-id="${product.id}" title="${product.title}">
          ${product.title}
        </h3>

        <!-- Rating & Assured -->
        <div class="rating-assured-row">
          <span class="rating-badge">
            ${product.rating.toFixed(1)} ★
          </span>
          <span class="rating-count">(${product.ratingCount.toLocaleString('en-IN')})</span>
          ${product.isAssured ? `
            <span class="fk-assured-tag" style="margin-left:auto; font-size:11px;">
              f-Assured
            </span>
          ` : ''}
        </div>

        <!-- Prices -->
        <div class="product-price-row">
          <span class="current-price">${formatCurrency(product.discountPrice)}</span>
          <span class="original-price">${formatCurrency(product.originalPrice)}</span>
          <span class="discount-percent">${discount}% off</span>
        </div>

        <div class="product-delivery-badge">Free Delivery</div>

        <!-- Action Buttons -->
        <div class="product-actions">
          <button class="btn-add-cart" data-cart-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            Add to Cart
          </button>
          <button class="btn-quick-view" data-action="quickview" data-product-id="${product.id}">
            Details
          </button>
        </div>
      </div>
    `;

    // Event Delegations on Card
    // 1. Wishlist Button
    const wishBtn = card.querySelector('.wishlist-btn');
    wishBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(product.id, wishBtn);
    });

    // 2. Add to Cart Button
    const addCartBtn = card.querySelector('.btn-add-cart');
    addCartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(product.id);
    });

    // 3. Quick View Trigger
    const quickViewTriggers = card.querySelectorAll('[data-action="quickview"]');
    quickViewTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        openQuickViewModal(product.id);
      });
    });

    grid.appendChild(card);
  });
}

/**
 * Toggle Wishlist
 */
function toggleWishlist(productId, buttonElement) {
  if (AppState.wishlist.has(productId)) {
    AppState.wishlist.delete(productId);
    buttonElement.classList.remove('active');
    showToast('Removed from Wishlist', 'info');
  } else {
    AppState.wishlist.add(productId);
    buttonElement.classList.add('active');
    showToast('Added to your Wishlist!', 'success');
  }
  persistWishlist();
}

/* ==============================================================================
   6. SHOPPING CART ENGINE
   ============================================================================== */

/**
 * Add Product to Cart
 */
function addToCart(productId, qty = 1) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const existing = AppState.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    AppState.cart.push({
      id: product.id,
      title: product.title,
      price: product.discountPrice,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: qty
    });
  }

  persistCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`Added "${product.title.slice(0, 24)}..." to Cart!`, 'success');
}

/**
 * Update Cart Badge Count
 */
function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  const headerCount = document.getElementById('cartTotalItemsHeader');
  const totalCount = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (badge) {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'flex' : 'none';
  }
  if (headerCount) {
    headerCount.textContent = totalCount;
  }
}

/**
 * Render Cart Drawer Content & Bill Breakdown
 */
function renderCartDrawer() {
  const emptyView = document.getElementById('cartEmptyView');
  const filledView = document.getElementById('cartFilledView');
  const container = document.getElementById('cartItemsContainer');

  if (!container || !emptyView || !filledView) return;

  if (AppState.cart.length === 0) {
    emptyView.classList.remove('hidden');
    filledView.classList.add('hidden');
    return;
  }

  emptyView.classList.add('hidden');
  filledView.classList.remove('hidden');
  container.innerHTML = '';

  let totalOriginalPrice = 0;
  let totalDiscountPrice = 0;
  let totalItemsCount = 0;

  AppState.cart.forEach(item => {
    totalOriginalPrice += (item.originalPrice * item.quantity);
    totalDiscountPrice += (item.price * item.quantity);
    totalItemsCount += item.quantity;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <div class="cart-item-img-box">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img">
      </div>
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.title}</h4>
        <div class="cart-item-price-row">
          <span class="current-price">${formatCurrency(item.price)}</span>
          <span class="original-price">${formatCurrency(item.originalPrice)}</span>
          <span class="discount-percent">${calcDiscountPercent(item.originalPrice, item.price)}% off</span>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">-</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-item-btn" data-action="remove" data-id="${item.id}">REMOVE</button>
        </div>
      </div>
    `;

    // Quantity Handlers
    const decBtn = row.querySelector('[data-action="decrease"]');
    const incBtn = row.querySelector('[data-action="increase"]');
    const remBtn = row.querySelector('[data-action="remove"]');

    decBtn.addEventListener('click', () => changeCartItemQty(item.id, -1));
    incBtn.addEventListener('click', () => changeCartItemQty(item.id, 1));
    remBtn.addEventListener('click', () => removeCartItem(item.id));

    container.appendChild(row);
  });

  // Calculation values
  const totalDiscount = totalOriginalPrice - totalDiscountPrice;

  // Bill Breakdown in summary card
  document.getElementById('summaryTotalQty').textContent = totalItemsCount;
  document.getElementById('summaryOriginalPrice').textContent = formatCurrency(totalOriginalPrice);
  document.getElementById('summaryDiscount').textContent = `- ${formatCurrency(totalDiscount)}`;
  document.getElementById('summaryFinalAmount').textContent = formatCurrency(totalDiscountPrice);
  document.getElementById('summarySavingsTag').textContent = `You will save ${formatCurrency(totalDiscount)} on this order`;
}

function changeCartItemQty(productId, delta) {
  const itemIndex = AppState.cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) return;

  const currentItem = AppState.cart[itemIndex];
  const newQty = currentItem.quantity + delta;

  if (newQty <= 0) {
    AppState.cart.splice(itemIndex, 1);
    showToast('Item removed from cart', 'info');
  } else {
    currentItem.quantity = newQty;
  }

  persistCart();
  updateCartBadge();
  renderCartDrawer();
}

function removeCartItem(productId) {
  AppState.cart = AppState.cart.filter(i => i.id !== productId);
  persistCart();
  updateCartBadge();
  renderCartDrawer();
  showToast('Item removed from cart', 'info');
}

/* ==============================================================================
   7. PRODUCT DETAIL QUICK VIEW MODAL
   ============================================================================== */

function openQuickViewModal(productId) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickViewBackdrop');
  const content = document.getElementById('quickViewContent');
  if (!modal || !content) return;

  const discount = calcDiscountPercent(product.originalPrice, product.discountPrice);

  content.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-img-box">
        <img src="${product.image}" alt="${product.title}" class="quickview-img">
      </div>
      <div class="quickview-info">
        <span class="product-category-tag">${product.category}</span>
        <h2>${product.title}</h2>

        <div class="rating-assured-row" style="margin-bottom: 12px;">
          <span class="rating-badge">${product.rating.toFixed(1)} ★</span>
          <span class="rating-count">(${product.ratingCount.toLocaleString('en-IN')} Ratings & Reviews)</span>
          ${product.isAssured ? '<span class="fk-assured-tag" style="margin-left:8px;">f-Assured</span>' : ''}
        </div>

        <div class="product-price-row" style="margin-bottom: 16px;">
          <span class="current-price" style="font-size: 24px;">${formatCurrency(product.discountPrice)}</span>
          <span class="original-price" style="font-size: 16px;">${formatCurrency(product.originalPrice)}</span>
          <span class="discount-percent" style="font-size: 16px;">${discount}% off</span>
        </div>

        <!-- Available Offers -->
        <div class="quickview-offers">
          <strong>Available Offers</strong>
          <p>🏷️ Bank Offer: 5% Unlimited Cashback on Flipkart Axis Bank Card</p>
          <p>🏷️ Special Price: Extra ₹1,500 off on exchange of older device</p>
          <p>🏷️ Partner Offer: Buy this item and get ₹500 off on your next purchase</p>
        </div>

        <!-- Specifications -->
        <div class="quickview-specs-box">
          <h4>Key Specifications</h4>
          <ul class="quickview-specs-list">
            ${product.specs && product.specs.length > 0 
              ? product.specs.map(s => `<li>${s}</li>`).join('')
              : '<li>Standard Manufacturer Warranty (1 Year) Included</li>'}
          </ul>
        </div>

        <div class="quickview-actions">
          <button class="btn-primary" id="modalAddToCartBtn" style="background-color: var(--accent-orange); flex:1;">
            ADD TO CART
          </button>
          <button class="btn-primary" id="modalBuyNowBtn" style="background-color: #fb641b; flex:1;">
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  `;

  // Modal Buttons
  document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
    addToCart(product.id);
    modal.classList.add('hidden');
  });

  document.getElementById('modalBuyNowBtn').addEventListener('click', () => {
    addToCart(product.id);
    modal.classList.add('hidden');
    document.getElementById('cartModalBackdrop').classList.remove('hidden');
  });

  modal.classList.remove('hidden');
}

/* ==============================================================================
   8. CMS / WEB CONTENT MANAGEMENT SIMULATOR MODULE
   Demonstrates Candidate's CMS & Web Authoring Capability:
   "Familiarity with web content management software and website authoring tools"
   ============================================================================== */

function setupCmsModule() {
  const cmsModal = document.getElementById('cmsModalBackdrop');
  const openCmsBtn = document.getElementById('openCmsModalBtn');
  const closeCmsBtn = document.getElementById('closeCmsBtn');
  const tabs = document.querySelectorAll('.cms-tab');

  if (openCmsBtn) {
    openCmsBtn.addEventListener('click', () => {
      cmsModal.classList.remove('hidden');
    });
  }

  if (closeCmsBtn) {
    closeCmsBtn.addEventListener('click', () => {
      cmsModal.classList.add('hidden');
    });
  }

  // Tabs switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetTabId = tab.dataset.tab;
      document.getElementById('addProductTab').classList.toggle('hidden', targetTabId !== 'addProduct');
      document.getElementById('manageBannerTab').classList.toggle('hidden', targetTabId !== 'manageBanner');
      document.getElementById('resetDataTab').classList.toggle('hidden', targetTabId !== 'resetData');
    });
  });

  // Handle Add Product Form
  const addProductForm = document.getElementById('cmsAddProductForm');
  if (addProductForm) {
    addProductForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('cmsTitle').value.trim();
      const category = document.getElementById('cmsCategory').value;
      const originalPrice = parseFloat(document.getElementById('cmsOriginalPrice').value);
      const discountPrice = parseFloat(document.getElementById('cmsDiscountPrice').value);
      const rating = parseFloat(document.getElementById('cmsRating').value) || 4.2;
      const imageUrl = document.getElementById('cmsImageUrl').value.trim() || 
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
      const specsRaw = document.getElementById('cmsSpecs').value.trim();
      const isAssured = document.getElementById('cmsIsAssured').checked;

      const newProduct = {
        id: 'prod_' + Date.now(),
        title: title,
        category: category,
        originalPrice: originalPrice,
        discountPrice: discountPrice,
        rating: rating,
        ratingCount: Math.floor(Math.random() * 500) + 12,
        isAssured: isAssured,
        image: imageUrl,
        specs: specsRaw ? specsRaw.split(',').map(s => s.trim()) : ['Verified Quality', 'Fast Shipping Available']
      };

      // Add to beginning of products array
      AppState.products.unshift(newProduct);
      persistProducts();
      filterAndRenderProducts();

      addProductForm.reset();
      cmsModal.classList.add('hidden');
      showToast(`CMS: Published "${title}" to Catalog!`, 'success');
    });
  }

  // Handle Add Banner Form
  const addBannerForm = document.getElementById('cmsAddBannerForm');
  if (addBannerForm) {
    addBannerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('cmsBannerTitle').value.trim();
      const subtitle = document.getElementById('cmsBannerSubtitle').value.trim();
      const bg = document.getElementById('cmsBannerBg').value;

      const newBanner = {
        id: Date.now(),
        tag: 'Exclusive Promo',
        title: title,
        subtitle: subtitle,
        bg: bg,
        graphic: '🎉'
      };

      AppState.banners.push(newBanner);
      persistBanners();
      renderCarousel();

      addBannerForm.reset();
      cmsModal.classList.add('hidden');
      showToast('CMS: New promotional banner published!', 'success');
    });
  }

  // Handle Reset Catalog
  const resetBtn = document.getElementById('resetCatalogSeedBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('fk_products');
      localStorage.removeItem('fk_banners');
      localStorage.removeItem('fk_cart');
      localStorage.removeItem('fk_wishlist');

      AppState.products = [...INITIAL_PRODUCTS];
      AppState.banners = [...INITIAL_BANNERS];
      AppState.cart = [];
      AppState.wishlist = new Set();

      renderCarousel();
      renderCategoriesBar();
      renderSidebarCategories();
      filterAndRenderProducts();
      updateCartBadge();
      renderCartDrawer();

      cmsModal.classList.add('hidden');
      showToast('Catalog restored to default seed state!', 'info');
    });
  }
}

/* ==============================================================================
   9. DEALS COUNTDOWN TIMER MODULE
   ============================================================================== */

function setupDealsCountdownTimer() {
  const timerElem = document.getElementById('dealTimer');
  if (!timerElem) return;

  // Set target 16 hours ahead
  let remainingSeconds = 16 * 3600 + 42 * 60 + 15;

  setInterval(() => {
    if (remainingSeconds <= 0) {
      remainingSeconds = 24 * 3600; // Reset for next day's sale
    }
    remainingSeconds--;

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    timerElem.textContent = `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)} Left`;
  }, 1000);
}

/* ==============================================================================
   10. SEARCH AUTOCOMPLETE & LIVE FILTERING
   ============================================================================== */

function setupSearchEngine() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const suggestionsBox = document.getElementById('searchSuggestions');

  if (!searchInput || !suggestionsBox) return;

  function performSearch() {
    AppState.searchQuery = searchInput.value.trim();
    suggestionsBox.classList.add('hidden');
    filterAndRenderProducts();
  }

  // Live input handler with suggestions dropdown
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();

    if (val.length < 2) {
      suggestionsBox.classList.add('hidden');
      AppState.searchQuery = '';
      filterAndRenderProducts();
      return;
    }

    // Find matches
    const matches = AppState.products.filter(p => 
      p.title.toLowerCase().includes(val) || 
      p.category.toLowerCase().includes(val)
    ).slice(0, 5);

    if (matches.length > 0) {
      suggestionsBox.innerHTML = '';
      matches.forEach(item => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.setAttribute('role', 'option');
        li.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>${item.title}</span>
        `;
        li.addEventListener('click', () => {
          searchInput.value = item.title;
          AppState.searchQuery = item.title;
          suggestionsBox.classList.add('hidden');
          filterAndRenderProducts();
        });
        suggestionsBox.appendChild(li);
      });
      suggestionsBox.classList.remove('hidden');
    } else {
      suggestionsBox.classList.add('hidden');
    }

    // Direct live update
    AppState.searchQuery = val;
    filterAndRenderProducts();
  });

  // Enter Key Handler
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  // Close suggestions if clicked outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add('hidden');
    }
  });
}

/* ==============================================================================
   11. EVENT LISTENERS & MODAL CONTROLLERS
   ============================================================================== */

function setupEventListeners() {
  // Brand Home Click
  const homeBrandLink = document.getElementById('homeBrandLink');
  if (homeBrandLink) {
    homeBrandLink.addEventListener('click', (e) => {
      e.preventDefault();
      AppState.activeCategory = 'all';
      AppState.searchQuery = '';
      AppState.maxPrice = 150000;
      AppState.minRating = 0;
      AppState.assuredOnly = false;
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
      const priceRange = document.getElementById('priceRange');
      if (priceRange) priceRange.value = 150000;
      const priceDisplay = document.getElementById('priceDisplay');
      if (priceDisplay) priceDisplay.textContent = '₹1,50,000';
      updateActiveCategoryPills();
      filterAndRenderProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Carousel Controls
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');
  const carouselContainer = document.getElementById('carouselContainer');

  if (prevSlideBtn) {
    prevSlideBtn.addEventListener('click', () => {
      goToSlide(AppState.carouselIndex - 1);
    });
  }

  if (nextSlideBtn) {
    nextSlideBtn.addEventListener('click', () => {
      goToSlide(AppState.carouselIndex + 1);
    });
  }

  if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', stopCarouselAutoplay);
    carouselContainer.addEventListener('mouseleave', startCarouselAutoplay);
  }

  // Price Slider Listener
  const priceRange = document.getElementById('priceRange');
  const priceDisplay = document.getElementById('priceDisplay');
  if (priceRange && priceDisplay) {
    priceRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      AppState.maxPrice = val;
      priceDisplay.textContent = formatCurrency(val);
      filterAndRenderProducts();
    });
  }

  // Rating Radios
  const ratingRadios = document.querySelectorAll('.rating-radio');
  ratingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      AppState.minRating = parseFloat(e.target.value) || 0;
      filterAndRenderProducts();
    });
  });

  // Assured Checkbox
  const assuredFilter = document.getElementById('assuredFilter');
  if (assuredFilter) {
    assuredFilter.addEventListener('change', (e) => {
      AppState.assuredOnly = e.target.checked;
      filterAndRenderProducts();
    });
  }

  // Clear Filters Button
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const resetFiltersEmptyBtn = document.getElementById('resetFiltersEmptyBtn');

  const resetAllFilters = () => {
    AppState.activeCategory = 'all';
    AppState.searchQuery = '';
    AppState.maxPrice = 150000;
    AppState.minRating = 0;
    AppState.assuredOnly = false;
    AppState.sortBy = 'popularity';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    if (priceRange) {
      priceRange.value = 150000;
      priceDisplay.textContent = '₹1,50,000';
    }

    if (assuredFilter) assuredFilter.checked = false;

    document.querySelectorAll('.rating-radio').forEach(r => {
      if (r.value === '0') r.checked = true;
    });

    document.querySelectorAll('.category-checkbox').forEach(cb => {
      cb.checked = false;
    });

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === 'popularity');
    });

    updateActiveCategoryPills();
    filterAndRenderProducts();
    showToast('Filters cleared', 'info');
  };

  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', resetAllFilters);
  if (resetFiltersEmptyBtn) resetFiltersEmptyBtn.addEventListener('click', resetAllFilters);

  // Sorting Options
  const sortButtons = document.querySelectorAll('.sort-btn');
  sortButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sortButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.sortBy = btn.dataset.sort;
      filterAndRenderProducts();
    });
  });

  // Cart Modal Toggle
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartBackdrop = document.getElementById('cartModalBackdrop');
  const shopNowCartBtn = document.getElementById('shopNowCartBtn');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  if (openCartBtn && cartBackdrop) {
    openCartBtn.addEventListener('click', () => {
      renderCartDrawer();
      cartBackdrop.classList.remove('hidden');
    });
  }

  if (closeCartBtn && cartBackdrop) {
    closeCartBtn.addEventListener('click', () => {
      cartBackdrop.classList.add('hidden');
    });
  }

  if (shopNowCartBtn && cartBackdrop) {
    shopNowCartBtn.addEventListener('click', () => {
      cartBackdrop.classList.add('hidden');
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  }

  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', () => {
      if (AppState.cart.length === 0) return;
      showToast('🎉 Order Placed Successfully! Thank you for shopping on Flipkart.', 'success');
      AppState.cart = [];
      persistCart();
      updateCartBadge();
      renderCartDrawer();
      setTimeout(() => {
        cartBackdrop.classList.add('hidden');
      }, 1500);
    });
  }

  // Quick View Close Button
  const closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
  const quickViewBackdrop = document.getElementById('quickViewBackdrop');
  if (closeQuickViewBtn && quickViewBackdrop) {
    closeQuickViewBtn.addEventListener('click', () => {
      quickViewBackdrop.classList.add('hidden');
    });
  }

  // Login Modal
  const openLoginBtn = document.getElementById('openLoginModalBtn');
  const closeLoginBtn = document.getElementById('closeLoginModalBtn');
  const loginBackdrop = document.getElementById('loginModalBackdrop');
  const loginForm = document.getElementById('loginForm');
  const guestUserBtn = document.getElementById('guestUserBtn');

  if (openLoginBtn && loginBackdrop) {
    openLoginBtn.addEventListener('click', () => {
      loginBackdrop.classList.remove('hidden');
    });
  }

  if (closeLoginBtn && loginBackdrop) {
    closeLoginBtn.addEventListener('click', () => {
      loginBackdrop.classList.add('hidden');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = document.getElementById('loginIdentifier').value;
      loginBackdrop.classList.add('hidden');
      showToast(`OTP successfully sent to ${identifier}!`, 'success');
      openLoginBtn.textContent = 'My Account';
    });
  }

  if (guestUserBtn) {
    guestUserBtn.addEventListener('click', () => {
      loginBackdrop.classList.add('hidden');
      showToast('Logged in as Guest User', 'info');
      openLoginBtn.textContent = 'My Account';
    });
  }

  // Backdrop click to dismiss modals
  [cartBackdrop, quickViewBackdrop, loginBackdrop, document.getElementById('cmsModalBackdrop')].forEach(backdrop => {
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    }
  });

  // Global Keyboard (Escape closes open modal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [cartBackdrop, quickViewBackdrop, loginBackdrop, document.getElementById('cmsModalBackdrop')].forEach(m => {
        if (m) m.classList.add('hidden');
      });
    }
  });

  // View All Deals button
  const viewAllDealsBtn = document.getElementById('viewAllDealsBtn');
  if (viewAllDealsBtn) {
    viewAllDealsBtn.addEventListener('click', () => {
      AppState.sortBy = 'discount';
      sortButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.sort === 'discount');
      });
      filterAndRenderProducts();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    });
  }
}

/* ==============================================================================
   12. APPLICATION INITIALIZATION
   ============================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load LocalStorage & state
  loadSavedState();

  // 2. Render UI Components
  renderCategoriesBar();
  renderSidebarCategories();
  renderCarousel();
  filterAndRenderProducts();
  updateCartBadge();
  setupDealsCountdownTimer();

  // 3. Initialize Interactive Modules
  startCarouselAutoplay();
  setupSearchEngine();
  setupCmsModule();
  setupEventListeners();

  console.log('✅ Flipkart Clone initialized strictly with Vanilla HTML5, CSS3 & JavaScript.');
});
