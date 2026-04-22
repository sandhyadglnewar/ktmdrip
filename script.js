

/* ── HELPERS ── */
const fmt = n => `NPR ${n.toLocaleString()}`;

/* ── DATA ── */
const MEN = [
  { id:101, name:"Oversized Graphic Tee",   price:2800, tag:"New",       img:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=85" },
  { id:102, name:"Slim Fit Chinos",          price:3500, tag:"Popular",   img:"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=85" },
  { id:103, name:"Bomber Jacket",            price:6800, tag:"Featured",  img:"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=85" },
  { id:104, name:"Cargo Utility Pants",      price:4200, tag:"New",       img:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=85" },
  { id:105, name:"Ribbed Polo Shirt",        price:2600, tag:"Bestseller",img:"https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&q=85" },
  { id:106, name:"Raw Denim Jacket",         price:5500, tag:"New",       img:"https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=85" },
  { id:107, name:"Linen Summer Shirt",       price:3200, tag:"Seasonal",  img:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=85" },
  { id:108, name:"Athletic Joggers",         price:3000, tag:"Comfort",   img:"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=85" },
  { id:109, name:"Merino Knit Sweater",      price:4800, tag:"Premium",   img:"https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&q=85" },
  { id:110, name:"Classic Trench Coat",      price:8500, tag:"Signature", img:"https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=85" },
];

const WOMEN = [
  { id:201, name:"Wrap Midi Dress",          price:4500, tag:"Bestseller",img:"https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=85" },
  { id:202, name:"Linen Wide-Leg Trousers",  price:4500, tag:"Popular",   img:"https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=85" },
  { id:203, name:"Structured Blazer",        price:7200, tag:"Featured",  img:"https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=85" },
  { id:204, name:"Ribbed Knit Cardigan",     price:3900, tag:"Cozy",      img:"https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=85" },
  { id:205, name:"Silk Slip Dress",          price:5200, tag:"New",       img:"https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?w=600&q=85" },
  { id:206, name:"Cropped Leather Jacket",   price:8900, tag:"Signature", img:"https://images.unsplash.com/photo-1548549557-dbe9946621da?w=600&q=85" },
  { id:207, name:"Flowy Maxi Skirt",         price:3600, tag:"New",       img:"https://images.unsplash.com/photo-1583496661160-fb5974ca5176?w=600&q=85" },
  { id:208, name:"Off-Shoulder Top",         price:2800, tag:"Summer",    img:"https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=85" },
  { id:209, name:"Tailored Bermuda Shorts",  price:2900, tag:"Casual",    img:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=85" },
  { id:210, name:"Belted Trench Coat",       price:8200, tag:"Premium",   img:"https://images.unsplash.com/photo-1554568218-0f1715e72254?w=600&q=85" },
];

const SALE = [
  { ...MEN[2],    id:301, salePrice:4599, discount:32 },
  { ...MEN[8],    id:302, salePrice:3199, discount:33 },
  { ...MEN[3],    id:303, salePrice:2799, discount:33 },
  { ...MEN[1],    id:304, salePrice:2299, discount:34 },
  { ...MEN[5],    id:305, salePrice:3499, discount:36 },
  { ...WOMEN[2],  id:306, salePrice:4799, discount:33 },
  { ...WOMEN[5],  id:307, salePrice:5899, discount:34 },
  { ...WOMEN[6],  id:308, salePrice:2299, discount:36 },
  { ...WOMEN[0],  id:309, salePrice:2899, discount:36 },
  { ...WOMEN[4],  id:310, salePrice:3299, discount:37 },
  { ...MEN[9],    id:311, salePrice:5499, discount:35 },
  { ...WOMEN[9],  id:312, salePrice:5199, discount:37 },
];

/* ── STATE ── */
let cart        = [];
let menFilter   = 'All';
let womenFilter = 'All';
let saleSort    = 'discount';

/* ══════════════════════════════════════════
   CARD HTML BUILDER
══════════════════════════════════════════ */
function cardHTML(p) {
  const isSale = !!p.salePrice;

  const tagHTML = isSale
    ? `<span class="card-tag sale-tag">−${p.discount}% OFF</span>`
    : `<span class="card-tag">${p.tag}</span>`;

  const priceHTML = isSale
    ? `<div class="card-prices">
         <span class="card-sale-price">${fmt(p.salePrice)}</span>
         <span class="card-orig-price">${fmt(p.price)}</span>
       </div>`
    : `<p class="card-price">${fmt(p.price)}</p>`;

  return `
    <div class="card" id="card-${p.id}">
      <div class="card-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy"/>
        ${tagHTML}
        <div class="card-atc">
          <button id="atc-${p.id}" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
      <div class="card-body">
        <p class="card-name">${p.name}</p>
        ${priceHTML}
      </div>
    </div>`;
}

function renderGrid(containerId, products) {
  document.getElementById(containerId).innerHTML = products.map(cardHTML).join('');
}

/* ══════════════════════════════════════════
   FILTER & SORT
══════════════════════════════════════════ */
const MEN_TAGS    = ['All','New','Bestseller','Premium','Signature','Featured','Popular','Seasonal','Comfort'];
const WOMEN_TAGS  = ['All','New','Bestseller','Premium','Signature','Featured','Popular','Cozy','Summer','Casual'];

function initMenFilters() {
  document.getElementById('men-filters').innerHTML = MEN_TAGS.map(t =>
    `<button class="filter-btn ${menFilter === t ? 'active' : ''}" onclick="setMenFilter('${t}')">${t}</button>`
  ).join('');
}

function setMenFilter(t) {
  menFilter = t;
  initMenFilters();
  const filtered = t === 'All' ? MEN : MEN.filter(p => p.tag === t);
  renderGrid('men-grid', filtered);
  document.getElementById('men-count').textContent = `${filtered.length} products`;
}

function initWomenFilters() {
  document.getElementById('women-filters').innerHTML = WOMEN_TAGS.map(t =>
    `<button class="filter-btn ${womenFilter === t ? 'active' : ''}" onclick="setWomenFilter('${t}')">${t}</button>`
  ).join('');
}

function setWomenFilter(t) {
  womenFilter = t;
  initWomenFilters();
  const filtered = t === 'All' ? WOMEN : WOMEN.filter(p => p.tag === t);
  renderGrid('women-grid', filtered);
  document.getElementById('women-count').textContent = `${filtered.length} products`;
}

function initSaleSort() {
  document.getElementById('sale-sort').innerHTML = [
    ['discount', 'Highest Discount'],
    ['price',    'Lowest Price'],
  ].map(([v, l]) =>
    `<button class="filter-btn ${saleSort === v ? 'active' : ''}" onclick="setSaleSort('${v}')">${l}</button>`
  ).join('');
}

function setSaleSort(v) {
  saleSort = v;
  initSaleSort();
  const sorted = [...SALE].sort((a, b) =>
    v === 'discount' ? b.discount - a.discount : a.salePrice - b.salePrice
  );
  renderGrid('sale-grid', sorted);
}

/* ══════════════════════════════════════════
   CART
══════════════════════════════════════════ */
function getAllProducts() {
  return [...MEN, ...WOMEN, ...SALE];
}

function getProduct(id) {
  return getAllProducts().find(p => p.id === id);
}

function addToCart(id) {
  const p = getProduct(id);
  if (!p) return;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }

  updateCartUI();

  // Button feedback
  const btn = document.getElementById('atc-' + id);
  if (btn) {
    btn.textContent = '✓ Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = 'Add to Cart';
      btn.classList.remove('added');
    }, 1200);
  }

  toggleCart(true);
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) cart = cart.filter(i => i.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const total    = cart.reduce((s, i) => s + (i.salePrice || i.price) * i.qty, 0);
  const count    = cart.reduce((s, i) => s + i.qty, 0);
  const countEl  = document.getElementById('cartCount');
  const bodyEl   = document.getElementById('drawerBody');
  const footEl   = document.getElementById('drawerFoot');
  const titleEl  = document.getElementById('drawerTitle');

  // Badge
  countEl.textContent  = count;
  countEl.style.display = count > 0 ? 'flex' : 'none';

  // Drawer title
  titleEl.textContent = count > 0 ? `Your Cart (${count})` : 'Your Cart';

  if (cart.length === 0) {
    bodyEl.innerHTML = `
      <div class="cart-empty">
        <svg width="52" height="52" fill="none" stroke="#ddd" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p style="margin-top:16px">Your cart is empty</p>
      </div>`;
    footEl.style.display = 'none';
  } else {
    bodyEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}"/>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-cat">${item.tag || 'KTMDrip'}</p>
          <div class="cart-item-row">
            <div class="qty-ctrl">
              <button onclick="updateQty(${item.id}, -1)">−</button>
              <span>${item.qty}</span>
              <button onclick="updateQty(${item.id}, 1)">+</button>
            </div>
            <span class="cart-item-price">${fmt((item.salePrice || item.price) * item.qty)}</span>
          </div>
        </div>
      </div>`).join('');

    document.getElementById('drawerSubtotal').textContent = fmt(total);
    document.getElementById('drawerTotal').textContent    = fmt(total);
    footEl.style.display = 'block';
  }
}

function toggleCart(open) {
  document.getElementById('drawer').classList.toggle('open', open);
  document.getElementById('overlay').classList.toggle('open', open);
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function goTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  document.getElementById('page-' + page).classList.add('active');
  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.page === page)
  );
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════
   NEWSLETTER
══════════════════════════════════════════ */
function subscribe() {
  const val = document.getElementById('emailInput').value.trim();
  if (val.includes('@')) {
    document.getElementById('newsletter-wrap').innerHTML =
      `<div class="subscribed-msg">✓ You're on the list! Welcome to KTMDrip.</div>`;
  }
}

/* ══════════════════════════════════════════
   INIT — runs on page load
══════════════════════════════════════════ */
(function init() {
  // Home: featured (2 men + 2 women) & new arrivals (next 2 each)
  renderGrid('featured-grid',    [...MEN.slice(0, 2), ...WOMEN.slice(0, 2)]);
  renderGrid('new-arrivals-grid', [...MEN.slice(2, 4), ...WOMEN.slice(2, 4)]);

  // Men page
  initMenFilters();
  renderGrid('men-grid', MEN);
  document.getElementById('men-count').textContent = `${MEN.length} products`;

  // Women page
  initWomenFilters();
  renderGrid('women-grid', WOMEN);
  document.getElementById('women-count').textContent = `${WOMEN.length} products`;

  // Sale page — default: highest discount first
  initSaleSort();
  renderGrid('sale-grid', [...SALE].sort((a, b) => b.discount - a.discount));

  // Cart UI
  updateCartUI();
})();