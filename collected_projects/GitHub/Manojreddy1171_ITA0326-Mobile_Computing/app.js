/**
 * ITA0326 - Mobile Computing Capstone
 * Smart B2B Mobile Wholesale Marketplace
 * 
 * Module 1: Smart Wholesale Price Negotiator
 * Module 2: Camera and Image Uploads
 * Module 3: Smart Group Buying & Demand Pooling
 */

// ============================================================================
// Initial Mock Catalog & Seed Data
// ============================================================================
const DEFAULT_PRODUCTS = [
  {
    id: "prod-101",
    name: "Royal Sona Masoori Rice (50kg Bag)",
    category: "grocery",
    seller: "Sri Balaji Wholesalers",
    sellerPhone: "+91 98765 43210",
    basePrice: 2200,
    moq: 40,
    unit: "Bag",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    description: "Export quality aged raw rice, 100% sortex cleaned, moisture < 12%. Direct mill packaging.",
    hasPool: true,
    poolId: "pool-01"
  },
  {
    id: "prod-102",
    name: "Pure Kachi Ghani Mustard Oil (15L Tin)",
    category: "grocery",
    seller: "Kisan Agro Distributors",
    sellerPhone: "+91 98765 11223",
    basePrice: 1850,
    moq: 25,
    unit: "Tin",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    description: "Cold-pressed traditional pungent mustard oil in food-grade tin containers.",
    hasPool: true,
    poolId: "pool-02"
  },
  {
    id: "prod-103",
    name: "Cotton Premium Crewneck T-Shirts (Pack of 50)",
    category: "apparel",
    seller: "Tirupur Knitwear Hub",
    sellerPhone: "+91 98765 99887",
    basePrice: 9500,
    moq: 10,
    unit: "Pack",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    description: "180 GSM bio-washed combed cotton, assorted size ratio (M:L:XL = 2:2:1).",
    hasPool: false
  },
  {
    id: "prod-104",
    name: "Herbal Antibacterial Bath Soap (Carton of 144)",
    category: "fmcg",
    seller: "Sri Balaji Wholesalers",
    sellerPhone: "+91 98765 43210",
    basePrice: 4320,
    moq: 15,
    unit: "Carton",
    image: "https://images.unsplash.com/photo-1607006314187-8ba342e431bb?auto=format&fit=crop&w=600&q=80",
    description: "Grade 1 TFM 76% neem & aloe vera formulation. Retail MRP ₹45 per bar.",
    hasPool: true,
    poolId: "pool-03"
  }
];

const DEFAULT_POOLS = [
  {
    id: "pool-01",
    productId: "prod-101",
    productName: "Royal Sona Masoori Rice (50kg Bag)",
    seller: "Sri Balaji Wholesalers",
    basePrice: 2200,
    targetQty: 100,
    currentQty: 70,
    deadlineHours: 14,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    tiers: [
      { minQty: 40, discountPct: 8, label: "8% OFF (40+)" },
      { minQty: 75, discountPct: 15, label: "15% OFF (75+)" },
      { minQty: 100, discountPct: 22, label: "22% OFF (100+)" }
    ],
    participants: [
      { name: "Sri Krishna Traders", qty: 30, initials: "SK" },
      { name: "Gupta Provision Store", qty: 25, initials: "GP" },
      { name: "Venkateshwara Mart", qty: 15, initials: "VM" }
    ]
  },
  {
    id: "pool-02",
    productId: "prod-102",
    productName: "Pure Kachi Ghani Mustard Oil (15L Tin)",
    seller: "Kisan Agro Distributors",
    basePrice: 1850,
    targetQty: 50,
    currentQty: 32,
    deadlineHours: 8,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    tiers: [
      { minQty: 20, discountPct: 6, label: "6% OFF (20+)" },
      { minQty: 35, discountPct: 12, label: "12% OFF (35+)" },
      { minQty: 50, discountPct: 18, label: "18% OFF (50+)" }
    ],
    participants: [
      { name: "Anand Oil Depot", qty: 12, initials: "AO" },
      { name: "Om Kirana Bazaar", qty: 20, initials: "OK" }
    ]
  },
  {
    id: "pool-03",
    productId: "prod-104",
    productName: "Herbal Antibacterial Bath Soap (Carton of 144)",
    seller: "Sri Balaji Wholesalers",
    basePrice: 4320,
    targetQty: 30,
    currentQty: 18,
    deadlineHours: 28,
    image: "https://images.unsplash.com/photo-1607006314187-8ba342e431bb?auto=format&fit=crop&w=600&q=80",
    tiers: [
      { minQty: 15, discountPct: 10, label: "10% OFF" },
      { minQty: 25, discountPct: 18, label: "18% OFF" },
      { minQty: 30, discountPct: 25, label: "25% OFF" }
    ],
    participants: [
      { name: "Metro Pharma Retail", qty: 10, initials: "MP" },
      { name: "Super Daily Needs", qty: 8, initials: "SD" }
    ]
  }
];

const DEFAULT_NEGOTIATIONS = [
  {
    id: "NEG-8092",
    productId: "prod-103",
    productName: "Cotton Premium Crewneck T-Shirts (Pack of 50)",
    buyerName: "Rajesh Stores (You)",
    sellerName: "Tirupur Knitwear Hub",
    listPrice: 9500,
    offeredPrice: 8800,
    offeredQty: 15,
    status: "countered", // pending, countered, accepted, rejected
    lastUpdated: "12 mins ago",
    counterPrice: 9000,
    counterQty: 15,
    counterNote: "Can supply at ₹9,000/pack if payment is cleared upon dispatch.",
    history: [
      { by: "Buyer", action: "Offered ₹8,800/pack for 15 packs", time: "25m ago" },
      { by: "Seller", action: "Countered at ₹9,000/pack for 15 packs", time: "12m ago" }
    ]
  }
];

// ============================================================================
// State Management
// ============================================================================
class MarketplaceState {
  constructor() {
    this.currentRole = localStorage.getItem("mm_role") || "buyer"; // 'buyer' or 'seller'
    this.products = JSON.parse(localStorage.getItem("mm_products")) || DEFAULT_PRODUCTS;
    this.pools = JSON.parse(localStorage.getItem("mm_pools")) || DEFAULT_POOLS;
    this.negotiations = JSON.parse(localStorage.getItem("mm_negotiations")) || DEFAULT_NEGOTIATIONS;
    this.activeTab = "catalog";
  }

  save() {
    localStorage.setItem("mm_role", this.currentRole);
    localStorage.setItem("mm_products", JSON.stringify(this.products));
    localStorage.setItem("mm_pools", JSON.stringify(this.pools));
    localStorage.setItem("mm_negotiations", JSON.stringify(this.negotiations));
  }

  reset() {
    localStorage.removeItem("mm_role");
    localStorage.removeItem("mm_products");
    localStorage.removeItem("mm_pools");
    localStorage.removeItem("mm_negotiations");
    this.currentRole = "buyer";
    this.products = [...DEFAULT_PRODUCTS];
    this.pools = [...DEFAULT_POOLS];
    this.negotiations = [...DEFAULT_NEGOTIATIONS];
    this.save();
  }
}

const state = new MarketplaceState();

// ============================================================================
// Audio Feedback Engine (Subtle Web Audio API chimes)
// ============================================================================
class AudioFeedback {
  static playChime(type = "click") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "camera") {
        osc.type = "square";
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }
}

// ============================================================================
// UI Controllers & Rendering
// ============================================================================

// --- Clocks and Timers ---
function updateClock() {
  const now = new Date();
  const hrs = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const clockEl = document.getElementById("statusClock");
  if (clockEl) clockEl.textContent = `${hrs}:${mins}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Toast Notifications ---
function showToast(message, type = "normal") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : "ℹ"}</span> <span>${message}</span>`;
  container.appendChild(toast);
  AudioFeedback.playChime(type === "success" ? "success" : "click");
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Role Switcher ---
function setRole(newRole) {
  state.currentRole = newRole;
  state.save();

  const buyerBtn = document.getElementById("btnRoleBuyer");
  const sellerBtn = document.getElementById("btnRoleSeller");
  const greeting = document.getElementById("userGreeting");
  const cameraNotice = document.getElementById("cameraRoleNotice");

  if (newRole === "buyer") {
    buyerBtn.classList.add("active");
    sellerBtn.classList.remove("active");
    greeting.innerHTML = "Buyer &bull; Rajesh Kirana Stores";
    cameraNotice.textContent = "Buyer Visual Inspection Mode";
  } else {
    sellerBtn.classList.add("active");
    buyerBtn.classList.remove("active");
    greeting.innerHTML = "Seller &bull; Sri Balaji Wholesalers";
    cameraNotice.textContent = "Seller Batch Upload Active";
  }

  renderCatalog();
  renderNegotiations();
  renderPools();
  showToast(`Switched active view to ${newRole.toUpperCase()} mode`);
}

// --- Tab Navigation ---
function switchTab(tabName) {
  state.activeTab = tabName;
  AudioFeedback.playChime("click");

  // Update top module nav tabs
  document.querySelectorAll(".module-nav .nav-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Update bottom bar tabs
  document.querySelectorAll(".app-bottom-bar .nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.nav === tabName);
  });

  // Show corresponding screen
  document.querySelectorAll(".screen-tab").forEach(screen => {
    screen.classList.remove("active");
  });

  const targetTab = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (targetTab) {
    targetTab.classList.add("active");
  }

  // Scroll to top of app body
  const body = document.getElementById("appBody");
  if (body) body.scrollTop = 0;
}

// ============================================================================
// Renderers
// ============================================================================

// --- Catalog Renderer ---
function renderCatalog() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const activePill = document.querySelector(".category-pills .pill.active")?.dataset.category || "all";

  const filtered = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.seller.toLowerCase().includes(searchTerm);
    const matchesCategory = activePill === "all" || p.category === activePill;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🔍</div>
        <h4>No wholesale items found</h4>
        <p>Try searching with another keyword or pick another category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="card-media">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="card-tag">${p.category}</span>
        ${p.hasPool ? '<span class="pool-active-badge">Group Pool Active</span>' : ''}
        <button class="btn-inspect-overlay" onclick="openInspectionModal('${p.id}')" title="Module 2: High-Res Inspection Zoom">
          <span>🔍 Inspect Visual</span>
        </button>
      </div>

      <div class="card-content">
        <div class="seller-info">
          <span>🏬 ${p.seller}</span>
          <span>${p.unit}</span>
        </div>

        <h4 class="product-title">${p.name}</h4>
        
        <div class="price-row">
          <div class="unit-price">₹${p.basePrice.toLocaleString()} <span style="font-size:11px;font-weight:normal;color:#64748b">/${p.unit}</span></div>
          <div class="moq-info">MOQ: ${p.moq} ${p.unit}s</div>
        </div>

        <p style="font-size: 11px; color: #64748b; line-height: 1.35; margin-top: 2px;">
          ${p.description}
        </p>

        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="openNegotiatorModal('${p.id}')">
            <span>🤝 Negotiate (M1)</span>
          </button>
          ${p.hasPool ? `
            <button class="btn btn-primary btn-sm" onclick="openPoolModal('${p.poolId}')">
              <span>👥 Join Pool (M3)</span>
            </button>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="showToast('Direct order registered with distributor', 'success')">
              <span>📦 Buy Direct</span>
            </button>
          `}
        </div>
      </div>
    </div>
  `).join("");
}

// --- Module 1: Negotiations Renderer ---
function renderNegotiations() {
  const container = document.getElementById("negotiationList");
  const emptyState = document.getElementById("emptyNegotiations");
  const badgeCount = document.getElementById("activeNegotiationCount");

  if (!container) return;

  const count = state.negotiations.length;
  if (badgeCount) badgeCount.textContent = count;

  if (count === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = state.negotiations.map(neg => {
    const isSeller = state.currentRole === "seller";
    const totalOffered = neg.offeredPrice * neg.offeredQty;
    const totalList = neg.listPrice * neg.offeredQty;
    const savings = totalList - totalOffered;

    let statusClass = "pending";
    let statusText = "Pending Review";
    if (neg.status === "countered") {
      statusClass = "countered";
      statusText = "Counter Offered";
    } else if (neg.status === "accepted") {
      statusClass = "accepted";
      statusText = "Deal Locked ✓";
    } else if (neg.status === "rejected") {
      statusClass = "rejected";
      statusText = "Declined";
    }

    return `
      <div class="neg-card" id="card-${neg.id}">
        <div class="neg-header">
          <div>
            <span class="neg-session-id">${neg.id} &bull; ${neg.lastUpdated}</span>
            <h4 class="neg-prod-title">${neg.productName}</h4>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">
              Buyer: <strong>${neg.buyerName}</strong> | Seller: <strong>${neg.sellerName}</strong>
            </div>
          </div>
          <span class="status-chip ${statusClass}">${statusText}</span>
        </div>

        <div class="neg-comparison">
          <div>
            <span class="cmp-label">List Price</span>
            <span class="cmp-val">₹${neg.listPrice.toLocaleString()}</span>
          </div>
          <div>
            <span class="cmp-label">Offered Price</span>
            <span class="cmp-val highlight">₹${neg.offeredPrice.toLocaleString()}</span>
          </div>
          <div>
            <span class="cmp-label">Qty / Savings</span>
            <span class="cmp-val text-success">${neg.offeredQty}u (-₹${savings.toLocaleString()})</span>
          </div>
        </div>

        <!-- Timeline of offers -->
        <div class="neg-timeline">
          ${neg.history.map((step, idx) => `
            <div class="timeline-step ${idx === neg.history.length - 1 ? 'latest' : ''}">
              <strong>${step.by}:</strong> ${step.action}
              <span class="timeline-time">${step.time}</span>
            </div>
          `).join("")}
        </div>

        ${neg.status === "accepted" ? `
          <div class="deal-locked-banner">
            <span>🔒</span>
            <div>
              <strong>Wholesale Contract Locked!</strong>
              <div>Unit Price: ₹${neg.offeredPrice.toLocaleString()} &bull; Total Value: ₹${totalOffered.toLocaleString()}</div>
            </div>
          </div>
        ` : ''}

        ${neg.status === "countered" && !isSeller ? `
          <div class="counter-action-box">
            <div style="font-size:12px;font-weight:700;color:#1e3a8a;">
              Seller Counter-Offer: ₹${neg.counterPrice.toLocaleString()} / unit (${neg.counterQty} units)
            </div>
            <p style="font-size:11px;color:#475569;margin-bottom:4px;">"${neg.counterNote}"</p>
            <div class="counter-btns">
              <button class="btn btn-primary btn-sm" onclick="acceptCounterOffer('${neg.id}')">
                <span>Accept ₹${neg.counterPrice.toLocaleString()} (Lock Deal)</span>
              </button>
              <button class="btn btn-outline btn-sm" onclick="rejectOffer('${neg.id}')">
                <span>Decline</span>
              </button>
            </div>
          </div>
        ` : ''}

        ${neg.status === "pending" && isSeller ? `
          <div class="counter-action-box">
            <span style="font-size:11px;font-weight:700;color:#0f172a;">Seller Action Response:</span>
            <div class="counter-inputs">
              <input type="number" id="sellerCounterPrice-${neg.id}" placeholder="Counter Price ₹" value="${Math.round((neg.listPrice + neg.offeredPrice) / 2)}">
              <input type="number" id="sellerCounterQty-${neg.id}" placeholder="Min Qty" value="${neg.offeredQty}">
            </div>
            <div class="counter-btns">
              <button class="btn btn-primary btn-sm" onclick="submitSellerCounter('${neg.id}')">
                <span>Send Counter-Offer</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="acceptDirectOffer('${neg.id}')">
                <span>Accept Buyer Offer</span>
              </button>
              <button class="btn btn-outline btn-sm" onclick="rejectOffer('${neg.id}')">
                <span>Reject</span>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

// --- Module 3: Group Pools Renderer ---
function renderPools() {
  const container = document.getElementById("poolsContainer");
  const countBadge = document.getElementById("activePoolsCount");
  if (!container) return;

  if (countBadge) countBadge.textContent = state.pools.length;

  container.innerHTML = state.pools.map(pool => {
    const pct = Math.min(100, Math.round((pool.currentQty / pool.targetQty) * 100));
    
    // Determine active unlocked tier
    let activeTier = null;
    let nextTier = null;
    pool.tiers.forEach(tier => {
      if (pool.currentQty >= tier.minQty) {
        activeTier = tier;
      } else if (!nextTier) {
        nextTier = tier;
      }
    });

    return `
      <div class="pool-card" data-pool-id="${pool.id}">
        <div class="pool-card-header">
          <div class="pool-title-group">
            <img src="${pool.image}" alt="${pool.productName}" class="pool-thumb">
            <div>
              <h4 class="pool-item-name">${pool.productName}</h4>
              <span class="pool-seller-tag">Wholesaler: ${pool.seller} &bull; Base: ₹${pool.basePrice.toLocaleString()}</span>
            </div>
          </div>
          <span class="pool-countdown">⏳ ${pool.deadlineHours}h left</span>
        </div>

        <div class="pool-progress-section">
          <div class="progress-header">
            <span>Pool Aggregate: <strong>${pool.currentQty} / ${pool.targetQty} units</strong></span>
            <strong class="text-primary">${pct}% toward Full MOQ</strong>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>

          <div class="tier-steps">
            ${pool.tiers.map(t => {
              const isUnlocked = pool.currentQty >= t.minQty;
              return `
                <div class="tier-step ${isUnlocked ? 'unlocked' : ''}">
                  <span class="tier-discount">${t.discountPct}% OFF</span>
                  <span>${t.minQty}+ units</span>
                  ${isUnlocked ? '<div style="font-size:9px;color:#059669;font-weight:bold;">UNLOCKED ✓</div>' : ''}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="co-buyers-row">
          <div class="buyer-avatars">
            ${pool.participants.map(part => `
              <div class="buyer-avatar-bubble" title="${part.name} pledged ${part.qty} units">${part.initials}</div>
            `).join("")}
            <span style="margin-left: 8px; font-weight: 600;">${pool.participants.length} retailers participating</span>
          </div>

          <button class="btn btn-primary btn-sm" onclick="openPoolModal('${pool.id}')">
            <span>+ Join Pool (M3)</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================================================
// Module 1: Price Negotiator Interactivity
// ============================================================================
let currentNegotiatingProduct = null;

function openNegotiatorModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  currentNegotiatingProduct = product;

  document.getElementById("negModalTitle").textContent = `B2B Negotiate: ${product.name}`;
  document.getElementById("negModalImg").src = product.image;
  document.getElementById("negModalProdName").textContent = product.name;
  document.getElementById("negModalListPrice").textContent = `₹${product.basePrice.toLocaleString()}`;
  document.getElementById("negModalMOQ").textContent = product.moq;

  // Set default initial offer slightly below base price
  const offerPriceInput = document.getElementById("offerUnitPrice");
  const offerQtyInput = document.getElementById("offerQty");
  offerPriceInput.value = Math.round(product.basePrice * 0.92);
  offerQtyInput.value = product.moq;

  updateNegotiatorModalCalculations();
  document.getElementById("negotiatorModal").style.display = "flex";
  AudioFeedback.playChime("click");
}

function updateNegotiatorModalCalculations() {
  if (!currentNegotiatingProduct) return;
  const qty = parseInt(document.getElementById("offerQty").value) || 1;
  const unitPrice = parseFloat(document.getElementById("offerUnitPrice").value) || 0;

  const totalProposed = qty * unitPrice;
  const totalList = qty * currentNegotiatingProduct.basePrice;
  const diff = totalList - totalProposed;
  const pct = Math.round((diff / totalList) * 100);

  document.getElementById("proposedTotal").textContent = `₹${totalProposed.toLocaleString()}`;
  document.getElementById("listTotal").textContent = `₹${totalList.toLocaleString()}`;

  const savingsWrap = document.getElementById("savingsPreview");
  if (diff > 0) {
    savingsWrap.innerHTML = `Projected Savings: <span class="savings-amount text-success">₹${diff.toLocaleString()} (${pct}% off)</span>`;
  } else if (diff < 0) {
    savingsWrap.innerHTML = `<span class="savings-amount text-primary">Premium Offer: +₹${Math.abs(diff).toLocaleString()}</span>`;
  } else {
    savingsWrap.innerHTML = `<span class="savings-amount">At regular list price</span>`;
  }
}

function submitBuyerOffer() {
  if (!currentNegotiatingProduct) return;
  const qty = parseInt(document.getElementById("offerQty").value) || 1;
  const unitPrice = parseFloat(document.getElementById("offerUnitPrice").value) || 0;
  const note = document.getElementById("offerNote").value.trim();

  const newNeg = {
    id: `NEG-${Math.floor(1000 + Math.random() * 9000)}`,
    productId: currentNegotiatingProduct.id,
    productName: currentNegotiatingProduct.name,
    buyerName: state.currentRole === "buyer" ? "Rajesh Stores (You)" : "Rajesh Stores",
    sellerName: currentNegotiatingProduct.seller,
    listPrice: currentNegotiatingProduct.basePrice,
    offeredPrice: unitPrice,
    offeredQty: qty,
    status: "pending",
    lastUpdated: "Just now",
    history: [
      {
        by: "Buyer",
        action: `Proposed ₹${unitPrice.toLocaleString()}/unit for ${qty} units${note ? ` ("${note}")` : ""}`,
        time: "Just now"
      }
    ]
  };

  state.negotiations.unshift(newNeg);
  state.save();

  document.getElementById("negotiatorModal").style.display = "none";
  switchTab("negotiator");
  renderNegotiations();
  showToast(`Negotiation offer transmitted to ${currentNegotiatingProduct.seller}!`, "success");
}

function submitSellerCounter(negId) {
  const neg = state.negotiations.find(n => n.id === negId);
  if (!neg) return;

  const counterPrice = parseFloat(document.getElementById(`sellerCounterPrice-${negId}`).value) || neg.offeredPrice;
  const counterQty = parseInt(document.getElementById(`sellerCounterQty-${negId}`).value) || neg.offeredQty;

  neg.status = "countered";
  neg.counterPrice = counterPrice;
  neg.counterQty = counterQty;
  neg.counterNote = "Special wholesale clearance rate for bulk settlement.";
  neg.lastUpdated = "Just now";
  neg.history.push({
    by: "Seller (Balaji Wholesalers)",
    action: `Countered with ₹${counterPrice.toLocaleString()}/unit for min ${counterQty} units`,
    time: "Just now"
  });

  state.save();
  renderNegotiations();
  showToast(`Counter-offer submitted to buyer at ₹${counterPrice.toLocaleString()}!`, "success");
}

function acceptDirectOffer(negId) {
  const neg = state.negotiations.find(n => n.id === negId);
  if (!neg) return;
  neg.status = "accepted";
  neg.lastUpdated = "Just now";
  neg.history.push({
    by: "Seller",
    action: `Accepted buyer's proposed offer of ₹${neg.offeredPrice.toLocaleString()}/unit!`,
    time: "Just now"
  });
  state.save();
  renderNegotiations();
  showToast(`Deal locked at ₹${neg.offeredPrice.toLocaleString()}! Wholesale contract generated.`, "success");
}

function acceptCounterOffer(negId) {
  const neg = state.negotiations.find(n => n.id === negId);
  if (!neg) return;
  neg.offeredPrice = neg.counterPrice;
  neg.offeredQty = neg.counterQty;
  neg.status = "accepted";
  neg.lastUpdated = "Just now";
  neg.history.push({
    by: "Buyer",
    action: `Accepted seller counter-offer at ₹${neg.counterPrice.toLocaleString()}/unit. Deal Locked!`,
    time: "Just now"
  });
  state.save();
  renderNegotiations();
  showToast(`Counter accepted! Wholesale order locked at ₹${neg.counterPrice.toLocaleString()}!`, "success");
}

function rejectOffer(negId) {
  const neg = state.negotiations.find(n => n.id === negId);
  if (!neg) return;
  neg.status = "rejected";
  neg.lastUpdated = "Just now";
  neg.history.push({
    by: state.currentRole === "seller" ? "Seller" : "Buyer",
    action: "Closed negotiation without agreement.",
    time: "Just now"
  });
  state.save();
  renderNegotiations();
  showToast("Negotiation session marked as closed.", "warning");
}

// ============================================================================
// Module 3: Group Demand Pooling Interactivity
// ============================================================================
let currentActivePool = null;

function openPoolModal(poolId) {
  const pool = state.pools.find(p => p.id === poolId);
  if (!pool) return;
  currentActivePool = pool;

  document.getElementById("poolModalTitle").textContent = pool.productName;
  document.getElementById("poolModalDesc").textContent = `Wholesaler: ${pool.seller}. Combine order to reach ${pool.targetQty} MOQ target.`;
  document.getElementById("poolModalImg").src = pool.image;
  document.getElementById("poolModalCurrentQty").textContent = pool.currentQty;
  document.getElementById("poolModalTargetQty").textContent = pool.targetQty;

  const pct = Math.min(100, Math.round((pool.currentQty / pool.targetQty) * 100));
  document.getElementById("poolModalProgressBar").style.width = `${pct}%`;

  updatePoolModalCalculations();
  document.getElementById("poolModal").style.display = "flex";
  AudioFeedback.playChime("click");
}

function updatePoolModalCalculations() {
  if (!currentActivePool) return;
  const pledgeQty = parseInt(document.getElementById("poolPledgeQty").value) || 5;

  // Calculate highest unlocked discount tier
  const projectedQty = currentActivePool.currentQty + pledgeQty;
  let highestTier = currentActivePool.tiers[0];
  currentActivePool.tiers.forEach(t => {
    if (projectedQty >= t.minQty) {
      highestTier = t;
    }
  });

  const discountedUnit = Math.round(currentActivePool.basePrice * (1 - highestTier.discountPct / 100));
  const totalCost = discountedUnit * pledgeQty;

  document.getElementById("poolLockedPrice").textContent = `₹${discountedUnit.toLocaleString()} / unit (${highestTier.discountPct}% OFF)`;
  document.getElementById("poolTotalCost").textContent = `₹${totalCost.toLocaleString()}`;
  document.getElementById("poolModalNextDiscount").textContent = `${highestTier.discountPct}% Tier Active`;
}

function confirmJoinPool() {
  if (!currentActivePool) return;
  const pledgeQty = parseInt(document.getElementById("poolPledgeQty").value) || 5;

  currentActivePool.currentQty += pledgeQty;
  currentActivePool.participants.push({
    name: "Rajesh Stores (You)",
    qty: pledgeQty,
    initials: "RS"
  });

  state.save();
  document.getElementById("poolModal").style.display = "none";
  renderPools();
  showToast(`Successfully joined group pool with ${pledgeQty} units!`, "success");
}

function simulateCoBuyer() {
  if (state.pools.length === 0) return;
  const targetPool = state.pools[0];
  const simBuyers = [
    { name: "Balaji Supermarket", qty: 15, initials: "BS" },
    { name: "Pawan Kirana Mart", qty: 10, initials: "PK" },
    { name: "Shivani Provisions", qty: 20, initials: "SP" }
  ];
  const randomBuyer = simBuyers[Math.floor(Math.random() * simBuyers.length)];

  targetPool.currentQty = Math.min(targetPool.targetQty, targetPool.currentQty + randomBuyer.qty);
  targetPool.participants.push(randomBuyer);

  state.save();
  renderPools();
  showToast(`Co-Buyer Alert: ${randomBuyer.name} just pooled +${randomBuyer.qty} units!`, "success");
}

// ============================================================================
// Module 2: Camera & Visual Listing Engine
// ============================================================================
let videoStream = null;
let currentCapturedDataUrl = null;

async function startCamera() {
  const video = document.getElementById("liveCameraStream");
  const placeholder = document.getElementById("viewfinderPlaceholder");
  const btnStart = document.getElementById("btnStartCamera");
  const btnSnap = document.getElementById("btnSnapPhoto");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    video.srcObject = videoStream;
    video.style.display = "block";
    placeholder.style.display = "none";
    btnStart.style.display = "none";
    btnSnap.style.display = "inline-flex";
    showToast("Live camera viewfinder active", "success");
  } catch (err) {
    console.warn("Camera stream unavailable, using simulated capture", err);
    // Fallback: load a crisp high-res wholesale lot photo sample
    loadSamplePhotoFallback();
  }
}

function snapPhoto() {
  const video = document.getElementById("liveCameraStream");
  const canvas = document.getElementById("snapshotCanvas");
  const preview = document.getElementById("capturedPhotoPreview");
  const btnSnap = document.getElementById("btnSnapPhoto");
  const btnStart = document.getElementById("btnStartCamera");

  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  currentCapturedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
  preview.src = currentCapturedDataUrl;
  preview.style.display = "block";
  video.style.display = "none";

  // Stop camera tracks
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }

  btnSnap.style.display = "none";
  btnStart.style.display = "inline-flex";
  btnStart.querySelector("span").textContent = "📷 Retake Photo";

  AudioFeedback.playChime("camera");
  displayImageDiagnostics(canvas.width, canvas.height, currentCapturedDataUrl.length);
  showToast("Wholesale batch photo captured & verified!", "success");
}

function loadSamplePhotoFallback() {
  const preview = document.getElementById("capturedPhotoPreview");
  const placeholder = document.getElementById("viewfinderPlaceholder");
  const sampleUrl = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80";

  currentCapturedDataUrl = sampleUrl;
  preview.src = sampleUrl;
  preview.style.display = "block";
  placeholder.style.display = "none";

  displayImageDiagnostics(1920, 1080, 1420000);
  showToast("Demonstration batch lot loaded from high-res camera archive");
}

function handleGalleryUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentCapturedDataUrl = evt.target.result;
    const preview = document.getElementById("capturedPhotoPreview");
    const placeholder = document.getElementById("viewfinderPlaceholder");
    preview.src = currentCapturedDataUrl;
    preview.style.display = "block";
    placeholder.style.display = "none";

    const img = new Image();
    img.onload = function() {
      displayImageDiagnostics(img.width, img.height, file.size);
    };
    img.src = currentCapturedDataUrl;

    AudioFeedback.playChime("camera");
    showToast(`Loaded ${file.name} for quality inspection`, "success");
  };
  reader.readAsDataURL(file);
}

function displayImageDiagnostics(width, height, bytes) {
  const diagBox = document.getElementById("imageDiagnostics");
  const newListingForm = document.getElementById("newListingForm");

  diagBox.style.display = "grid";
  newListingForm.style.display = "flex";

  const rawKb = Math.round(bytes / 1024);
  const compressedKb = Math.round(rawKb * 0.42);

  document.getElementById("diagResolution").textContent = `${width}x${height}`;
  document.getElementById("diagRawSize").textContent = `${rawKb} KB`;
  document.getElementById("diagCompressed").textContent = `${compressedKb} KB (WebP)`;
  document.getElementById("diagQuality").textContent = "98% (Pass)";
}

function publishNewListing() {
  const name = document.getElementById("newProdName").value.trim();
  const category = document.getElementById("newProdCategory").value;
  const price = parseFloat(document.getElementById("newProdPrice").value);
  const moq = parseInt(document.getElementById("newProdMOQ").value);
  const allowPool = document.getElementById("newProdAllowPool").value === "yes";

  if (!name || isNaN(price) || isNaN(moq)) {
    alert("Please provide valid product name, base price, and minimum order quantity.");
    return;
  }

  const newId = `prod-${Date.now().toString().slice(-4)}`;
  const newProduct = {
    id: newId,
    name: name,
    category: category,
    seller: state.currentRole === "seller" ? "Sri Balaji Wholesalers" : "Verified Distributor",
    sellerPhone: "+91 98765 00000",
    basePrice: price,
    moq: moq,
    unit: "Unit",
    image: currentCapturedDataUrl || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
    description: "Verified direct warehouse batch. Geotagged high-res inspection images attached.",
    hasPool: allowPool
  };

  if (allowPool) {
    const poolId = `pool-${Date.now().toString().slice(-3)}`;
    newProduct.poolId = poolId;
    state.pools.unshift({
      id: poolId,
      productId: newId,
      productName: name,
      seller: newProduct.seller,
      basePrice: price,
      targetQty: moq * 2,
      currentQty: Math.round(moq * 0.4),
      deadlineHours: 24,
      image: newProduct.image,
      tiers: [
        { minQty: moq, discountPct: 8, label: "8% OFF" },
        { minQty: Math.round(moq * 1.5), discountPct: 15, label: "15% OFF" },
        { minQty: moq * 2, discountPct: 22, label: "22% OFF" }
      ],
      participants: [
        { name: "Initial Pool Initiator", qty: Math.round(moq * 0.4), initials: "IP" }
      ]
    });
  }

  state.products.unshift(newProduct);
  state.save();

  // Reset form
  document.getElementById("newProdName").value = "";
  document.getElementById("newProdPrice").value = "";
  document.getElementById("newProdMOQ").value = "";
  document.getElementById("newListingForm").style.display = "none";
  document.getElementById("imageDiagnostics").style.display = "none";

  switchTab("catalog");
  renderCatalog();
  showToast(`Published "${name}" to wholesale catalog!`, "success");
}

// --- High-Resolution Visual Inspection Modal (Module 2) ---
let currentZoom = 1;

function openInspectionModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("imageInspectionModal");
  const img = document.getElementById("inspectFullImg");
  const title = document.getElementById("inspectTitle");

  title.textContent = `Visual Audit: ${product.name}`;
  img.src = product.image;
  currentZoom = 1;
  applyZoom();

  modal.style.display = "flex";
  AudioFeedback.playChime("click");
}

function applyZoom() {
  const img = document.getElementById("inspectFullImg");
  const zoomText = document.getElementById("zoomLevelText");
  if (img) img.style.transform = `scale(${currentZoom})`;
  if (zoomText) zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
}

// ============================================================================
// Event Listeners & Bootstrapping
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Setup Role Switches
  document.getElementById("btnRoleBuyer").addEventListener("click", () => setRole("buyer"));
  document.getElementById("btnRoleSeller").addEventListener("click", () => setRole("seller"));

  // Viewport Frame Toggle (Phone frame vs Full Width)
  const wrapper = document.getElementById("viewportWrapper");
  const btnPhone = document.getElementById("btnTogglePhone");
  const btnFull = document.getElementById("btnToggleFull");

  btnPhone.addEventListener("click", () => {
    wrapper.classList.remove("full-mode");
    wrapper.classList.add("phone-mode");
    btnPhone.classList.add("active");
    btnFull.classList.remove("active");
  });

  btnFull.addEventListener("click", () => {
    wrapper.classList.remove("phone-mode");
    wrapper.classList.add("full-mode");
    btnFull.classList.add("active");
    btnPhone.classList.remove("active");
  });

  // Top Module Nav Buttons
  document.querySelectorAll(".module-nav .nav-tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Bottom Navigation Bar
  document.querySelectorAll(".app-bottom-bar .nav-item").forEach(item => {
    item.addEventListener("click", () => switchTab(item.dataset.nav));
  });

  // Search input & category pills
  document.getElementById("searchInput").addEventListener("input", renderCatalog);
  document.querySelectorAll(".category-pills .pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".category-pills .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      renderCatalog();
    });
  });

  // Reset Demo Data
  document.getElementById("btnResetData").addEventListener("click", () => {
    if (confirm("Reset all Capstone demo data to original state?")) {
      state.reset();
      setRole("buyer");
      renderCatalog();
      renderNegotiations();
      renderPools();
      showToast("Marketplace data reset to initial seed values.");
    }
  });

  // Module 1: Stepper and calculator events
  document.getElementById("btnDecQty").addEventListener("click", () => {
    const input = document.getElementById("offerQty");
    input.value = Math.max(5, (parseInt(input.value) || 10) - 5);
    updateNegotiatorModalCalculations();
  });

  document.getElementById("btnIncQty").addEventListener("click", () => {
    const input = document.getElementById("offerQty");
    input.value = (parseInt(input.value) || 10) + 5;
    updateNegotiatorModalCalculations();
  });

  document.getElementById("offerQty").addEventListener("input", updateNegotiatorModalCalculations);
  document.getElementById("offerUnitPrice").addEventListener("input", updateNegotiatorModalCalculations);
  document.getElementById("btnSubmitOffer").addEventListener("click", submitBuyerOffer);
  document.getElementById("btnCloseNegModal").addEventListener("click", () => {
    document.getElementById("negotiatorModal").style.display = "none";
  });

  // Module 3: Group pool modal events
  document.getElementById("btnDecPoolQty").addEventListener("click", () => {
    const input = document.getElementById("poolPledgeQty");
    input.value = Math.max(1, (parseInt(input.value) || 5) - 5);
    updatePoolModalCalculations();
  });

  document.getElementById("btnIncPoolQty").addEventListener("click", () => {
    const input = document.getElementById("poolPledgeQty");
    input.value = (parseInt(input.value) || 5) + 5;
    updatePoolModalCalculations();
  });

  document.getElementById("poolPledgeQty").addEventListener("input", updatePoolModalCalculations);
  document.getElementById("btnConfirmJoinPool").addEventListener("click", confirmJoinPool);
  document.getElementById("btnClosePoolModal").addEventListener("click", () => {
    document.getElementById("poolModal").style.display = "none";
  });
  document.getElementById("btnSimulateBuyer").addEventListener("click", simulateCoBuyer);

  // Module 2: Camera events
  document.getElementById("btnStartCamera").addEventListener("click", startCamera);
  document.getElementById("btnSnapPhoto").addEventListener("click", snapPhoto);
  document.getElementById("fileInputGallery").addEventListener("change", handleGalleryUpload);
  document.getElementById("btnPublishListing").addEventListener("click", publishNewListing);

  // Inspection Zoom controls
  document.getElementById("btnZoomIn").addEventListener("click", () => {
    currentZoom = Math.min(3, currentZoom + 0.35);
    applyZoom();
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    currentZoom = Math.max(0.7, currentZoom - 0.35);
    applyZoom();
  });
  document.getElementById("btnResetZoom").addEventListener("click", () => {
    currentZoom = 1;
    applyZoom();
  });
  document.getElementById("btnCloseInspectModal").addEventListener("click", () => {
    document.getElementById("imageInspectionModal").style.display = "none";
  });

  // Initial load
  setRole(state.currentRole);
  renderCatalog();
  renderNegotiations();
  renderPools();
});
