// Dynamic copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// Navbar — transparent at top, solid on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// Mobile menu toggle
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}

// Sticky "Book Now" button
(function () {
  const btn        = document.getElementById('stickyBook');
  const servicesEl = document.getElementById('services');
  const bookingEl  = document.getElementById('booking');
  if (!btn || !servicesEl) return;
  window.addEventListener('scroll', function () {
    const pastPackages = servicesEl.getBoundingClientRect().bottom < 0;
    const inBooking    = bookingEl
      && bookingEl.getBoundingClientRect().top  < window.innerHeight
      && bookingEl.getBoundingClientRect().bottom > 0;
    btn.classList.toggle('show', pastPackages && !inBooking);
  }, { passive: true });
})();

// Smooth scroll for all anchor links (offset for fixed navbar)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Scroll-in animation for cards and elements
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.package-card, .addon-card, .step, .gallery-item, .area-item').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// ===== BEFORE / AFTER SLIDERS =====
document.querySelectorAll('[data-slider]').forEach(slider => {
  let dragging = false;

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    let pct = Math.min(Math.max((x - rect.left) / rect.width, 0.02), 0.98);
    const before = slider.querySelector('.ba-before');
    const handle = slider.querySelector('.ba-handle');
    before.style.clipPath = `inset(0 ${(1 - pct) * 100}% 0 0)`;
    handle.style.left = `${pct * 100}%`;
  }

  slider.addEventListener('mousedown', e => { dragging = true; setPosition(e.clientX); });
  window.addEventListener('mousemove', e => { if (dragging) setPosition(e.clientX); });
  window.addEventListener('mouseup', () => { dragging = false; });

  slider.addEventListener('touchstart', e => { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
  slider.addEventListener('touchmove', e => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
  slider.addEventListener('touchend', () => { dragging = false; });
});

// ===== BOOKING WIZARD =====
(function () {
  const SERVICES = [
    { id: 'interior', name: 'Interior Detail',                    price: 200, duration: '3-4 Hours', desc: 'Complete interior transformation - steam cleaning, shampooing, odor removal & more' },
    { id: 'premium',  name: 'Premium Interior + Exterior Detail', price: 299, duration: '4-5 Hours', desc: 'Everything in Interior plus exterior hand wash, wheels, tire shine, spray wax & more', popular: true },
    { id: 'ultimate', name: 'Ultimate Detail Package',            price: 499, duration: 'Full Day',  desc: 'The complete package - full detail plus clay bar & hand wax, engine bay & priority treatment' },
  ];

  const ADDONS = [
    { id: 'pet-hair',  name: 'Excessive Pet Hair Removal',       price: 60,  desc: 'Removes deeply embedded pet hair from carpets, seats, and hard-to-reach areas',           cat: 'Interior' },
    { id: 'ozone',     name: 'Ozone Odor Treatment',             price: 100, desc: 'Eliminates stubborn odors at the source - smoke, food, and mildew smells',                 cat: 'Interior' },
    { id: 'childseat', name: 'Child Seat / Car Seat Cleaning',   price: 30,  desc: 'Deep cleaning & sanitization of child seats - remove dirt, spills, and bacteria',          cat: 'Interior' },
    { id: 'leather',   name: 'Leather Conditioning',             price: 60,  desc: 'Deep clean + pH-balanced conditioner + UV protectant for leather surfaces',                cat: 'Interior' },
    { id: 'clay',      name: 'Clay Bar Treatment + Hand Wax',    price: 100, desc: 'Removes embedded contaminants, restores smooth glass-like finish and improves shine',      cat: 'Exterior' },
    { id: 'engine',    name: 'Engine Bay Detail',                price: 75,  desc: 'Safe deep clean and dressing to remove buildup and restore a like-new engine appearance',  cat: 'Exterior' },
    { id: 'headlight', name: 'Headlight Restoration',            price: 120, desc: 'Restores clarity to foggy or oxidized headlights for improved appearance and visibility',  cat: 'Exterior' },
    { id: 'sealant',   name: 'Sealant Protection',               price: 70,  desc: 'Long-lasting shine & paint protection sealant application',                                cat: 'Exterior' },
  ];

  const STEP_NAMES = ['Service', 'Date', 'Time', 'Details'];

  const state = { step: 1, serviceId: null, vehicleSize: 'standard', addonIds: new Set(), childSeatQty: 1, date: null, time: null, hasWater: null, hasPower: null };
  let calMonth = new Date().getMonth();
  let calYear  = new Date().getFullYear();

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function getService() { return SERVICES.find(s => s.id === state.serviceId) || null; }
  function getTotal() {
    let t = 0;
    const svc = getService();
    if (svc) t += svc.price;
    if (state.vehicleSize === 'large') t += 50;
    state.addonIds.forEach(id => {
      const a = ADDONS.find(x => x.id === id);
      if (a) t += id === 'childseat' ? a.price * state.childSeatQty : a.price;
    });
    return t;
  }

  function updateHeader() {
    document.getElementById('wizStepNum').textContent = state.step;
    document.getElementById('wizStepName').textContent = STEP_NAMES[state.step - 1];
    const _total = '$' + getTotal().toLocaleString();
    document.getElementById('wizTotal').textContent = _total;
    const _ft = document.getElementById('wizFooterTotal');
    if (_ft) _ft.textContent = _total;
    document.getElementById('wizBack').style.visibility = state.step === 1 ? 'hidden' : 'visible';
    document.getElementById('wizNext').textContent = state.step === 4 ? 'Confirm Booking →' : 'Continue →';
    document.querySelectorAll('.wiz-prog-item').forEach(el => {
      const s = +el.dataset.step;
      el.classList.toggle('active', s === state.step);
      el.classList.toggle('done', s < state.step);
    });
  }

  function renderStep() {
    updateHeader();
    const body = document.getElementById('wizBody');
    body.style.animation = 'none';
    void body.offsetWidth;
    body.style.animation = 'wizStepIn 0.3s ease';
    if (state.step === 1) renderServiceStep(body);
    else if (state.step === 2) renderDateStep(body);
    else if (state.step === 3) renderTimeStep(body);
    else renderDetailsStep(body);
  }

  // --- Step 1: Service ---
  function renderServiceStep(body) {
    body.innerHTML = `
      <div class="wiz-section">
        <p class="wiz-section-tag">01 / Vehicle Size</p>
        <h2 class="wiz-heading">How big is your <em class="wiz-em">vehicle?</em></h2>
        <p class="wiz-sub">Helps us price your service correctly.</p>
        <div class="wiz-vehicle-grid">
          <div class="wiz-vehicle-card${state.vehicleSize === 'standard' ? ' selected' : ''}" onclick="wizSelectVehicleSize('standard')">
            <div class="wiz-vehicle-radio${state.vehicleSize === 'standard' ? ' active' : ''}"></div>
            <div class="wiz-vehicle-info">
              <p class="wiz-vehicle-name">Standard Vehicle</p>
              <p class="wiz-vehicle-desc">Sedan, coupe, hatchback, compact SUV (up to 5 seats)</p>
            </div>
            <p class="wiz-vehicle-price">Included</p>
          </div>
          <div class="wiz-vehicle-card${state.vehicleSize === 'large' ? ' selected' : ''}" onclick="wizSelectVehicleSize('large')">
            <div class="wiz-vehicle-radio${state.vehicleSize === 'large' ? ' active' : ''}"></div>
            <div class="wiz-vehicle-info">
              <p class="wiz-vehicle-name">Oversized / 3rd Row Vehicle</p>
              <p class="wiz-vehicle-desc">Full-size SUV, minivan, truck, 3-row vehicle</p>
            </div>
            <p class="wiz-vehicle-price">+$50</p>
          </div>
        </div>
      </div>
      <div class="wiz-section">
        <p class="wiz-section-tag">02 / Pick Your Service</p>
        <h2 class="wiz-heading">Which detail <em class="wiz-em">suits you?</em></h2>
        <div class="wiz-packages">
          ${SERVICES.map(s => `
            <div class="wiz-pkg-card${state.serviceId === s.id ? ' selected' : ''}" onclick="wizSelectService('${s.id}')">
              ${s.popular ? '<div class="wiz-popular-badge">Most Popular</div>' : ''}
              <div class="wiz-pkg-top">
                <div>
                  <p class="wiz-pkg-name">${esc(s.name)}</p>
                  <p class="wiz-pkg-dur">${esc(s.duration)}</p>
                </div>
                <p class="wiz-pkg-price">$${s.price}</p>
              </div>
              <p class="wiz-pkg-desc">${esc(s.desc)}</p>
            </div>`).join('')}
        </div>
      </div>
      <div class="wiz-section">
        <p class="wiz-section-tag">03 / Add-Ons</p>
        <h2 class="wiz-heading">Want extras? <em class="wiz-em">(optional)</em></h2>
        <div class="wiz-addons">
          ${(() => {
            let currentCat = null;
            return ADDONS.map(a => {
              let html = '';
              if (a.cat !== currentCat) {
                currentCat = a.cat;
                html += `<p class="wiz-addon-cat">${esc(a.cat)}</p>`;
              }
              const sel = state.addonIds.has(a.id);
              if (a.id === 'childseat') {
                const qty = state.childSeatQty;
                html += `<div class="wiz-addon${sel ? ' selected' : ''}" onclick="wizToggleAddon('childseat')">
                  <div class="wiz-addon-toggle${sel ? ' active' : ''}">${sel ? '&#10003;' : '+'}</div>
                  <div class="wiz-addon-info">
                    <p class="wiz-addon-name">${esc(a.name)}</p>
                    <p class="wiz-addon-desc">${esc(a.desc)}</p>
                  </div>
                  ${sel
                    ? `<div class="wiz-addon-right" onclick="event.stopPropagation()">
                        <div class="wiz-qty-ctrl">
                          <button class="wiz-qty-btn" onclick="wizSetChildSeatQty(${qty - 1})" ${qty <= 1 ? 'disabled' : ''}>-</button>
                          <span class="wiz-qty-num">${qty}</span>
                          <button class="wiz-qty-btn" onclick="wizSetChildSeatQty(${qty + 1})">+</button>
                        </div>
                        <p class="wiz-addon-price">+$${a.price * qty}</p>
                      </div>`
                    : `<p class="wiz-addon-price">+$${a.price} <span class="wiz-addon-each">each</span></p>`
                  }
                </div>`;
              } else {
                html += `<div class="wiz-addon${sel ? ' selected' : ''}" onclick="wizToggleAddon('${a.id}')">
                  <div class="wiz-addon-toggle${sel ? ' active' : ''}">${sel ? '&#10003;' : '+'}</div>
                  <div class="wiz-addon-info">
                    <p class="wiz-addon-name">${esc(a.name)}</p>
                    <p class="wiz-addon-desc">${esc(a.desc)}</p>
                  </div>
                  <p class="wiz-addon-price">+$${a.price}</p>
                </div>`;
              }
              return html;
            }).join('');
          })()}
        </div>
      </div>`;
  }

  window.wizSelectService     = function (id)   { state.serviceId = id; renderStep(); };
  window.wizSelectVehicleSize = function (size)  { state.vehicleSize = size; renderStep(); };
  window.wizToggleAddon = function (id) {
    if (state.addonIds.has(id)) {
      state.addonIds.delete(id);
      if (id === 'childseat') state.childSeatQty = 1;
    } else {
      state.addonIds.add(id);
    }
    renderStep();
  };

  window.wizSetChildSeatQty = function (qty) {
    state.childSeatQty = Math.max(1, qty);
    renderStep();
  };

  // --- Step 2: Date ---
  function renderDateStep(body) {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstDay     = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
    let cells = Array(firstDay).fill('<div class="cal-cell empty"></div>').join('');
    for (let d = 1; d <= daysInMonth; d++) {
      const date  = new Date(calYear, calMonth, d);
      const isPast  = date < today;
      const isSel   = state.date && state.date.getFullYear() === calYear && state.date.getMonth() === calMonth && state.date.getDate() === d;
      cells += `<div class="cal-cell${isPast ? ' past' : ' available'}${isSel ? ' selected' : ''}"${!isPast ? ` onclick="wizSelectDate(${calYear},${calMonth},${d})"` : ''}>${d}</div>`;
    }
    body.innerHTML = `
      <div class="wiz-section">
        <p class="wiz-section-tag">When Works For You?</p>
        <h2 class="wiz-heading">Pick a <em class="wiz-em">date.</em></h2>
        <p class="wiz-sub">Open every day, 7 AM to 7 PM. Pick any available date to continue.</p>
        <div class="wiz-cal-wrap">
          <div class="wiz-cal">
            <div class="cal-nav">
              <button class="cal-nav-btn" onclick="wizCalPrev()">&#8249;</button>
              <span class="cal-month-label">${MONTHS[calMonth]} ${calYear}</span>
              <button class="cal-nav-btn" onclick="wizCalNext()">&#8250;</button>
            </div>
            <div class="cal-grid">
              ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
              ${cells}
            </div>
          </div>
          <p class="cal-note">Greyed-out days are in the past. Pick any open day to continue.</p>
        </div>
      </div>`;
  }

  window.wizSelectDate = function (y, m, d) { state.date = new Date(y, m, d); calMonth = m; calYear = y; state.step = 3; renderStep(); scrollToWiz(); };
  window.wizCalPrev    = function () { if (--calMonth < 0) { calMonth = 11; calYear--; } renderDateStep(document.getElementById('wizBody')); };
  window.wizCalNext    = function () { if (++calMonth > 11) { calMonth = 0; calYear++; } renderDateStep(document.getElementById('wizBody')); };

  // --- Step 3: Time ---
  async function renderTimeStep(body) {
    const slots = [];
    for (let h = 7; h <= 19; h++) {
      for (const m of [0, 30]) {
        if (h === 19 && m === 30) break;
        const ampm = h < 12 ? 'AM' : 'PM';
        const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
        slots.push({ label: `${h12}:${m === 0 ? '00' : '30'} ${ampm}`, h, m });
      }
    }

    const nowAZ       = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
    const todayAZ     = new Date(nowAZ.getFullYear(), nowAZ.getMonth(), nowAZ.getDate());
    const selectedDay = state.date ? new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()) : null;
    const isToday     = selectedDay && selectedDay.getTime() === todayAZ.getTime();
    const cutoffMins  = isToday ? nowAZ.getHours() * 60 + nowAZ.getMinutes() + 90 : -1;

    if (isToday && state.time) {
      const sel = slots.find(s => s.label === state.time);
      if (sel && sel.h * 60 + sel.m < cutoffMins) state.time = null;
    }

    const allUnavailable = isToday && slots.every(s => s.h * 60 + s.m < cutoffMins);
    const dateStr = state.date ? state.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase() : '';

    body.innerHTML = `<div class="wiz-section"><p class="wiz-section-tag">${esc(dateStr)}</p><h2 class="wiz-heading">Pick a <em class="wiz-em">time.</em></h2><p class="wiz-sub" style="text-align:center;padding:24px 0;">Checking availability...</p></div>`;

    const takenSlots = new Set();
    try {
      const d = state.date;
      const isoDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const res = await fetch('https://wjtjsfopysjtpkooxyje.supabase.co/rest/v1/rpc/get_taken_slots', {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable_KTN_kS0acmCrDHKd0PV87g_OgYKL15s',
          'Authorization': 'Bearer sb_publishable_KTN_kS0acmCrDHKd0PV87g_OgYKL15s',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_business_id: 'f7c3a2e1-b8d4-4f6e-9c1a-5d7b3e8f2a4c', p_date: isoDate }),
      });
      const data = await res.json();
      (data || []).forEach(row => {
        const [hh, mm] = row.time_slot.split(':').map(Number);
        const ampm = hh < 12 ? 'AM' : 'PM';
        const h12  = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
        takenSlots.add(`${h12}:${mm === 0 ? '00' : '30'} ${ampm}`);
      });
    } catch(e) { /* fail silently */ }

    body.innerHTML = `
      <div class="wiz-section">
        <p class="wiz-section-tag">${esc(dateStr)}</p>
        <h2 class="wiz-heading">Pick a <em class="wiz-em">time.</em></h2>
        ${allUnavailable
          ? `<p class="wiz-sub">No same-day slots remaining - please go back and choose a different date.</p>`
          : `<p class="wiz-sub">Choose your start window. Service takes 3-5 hours depending on your package.${isToday ? ' Same-day bookings require 2 hours notice.' : ''}</p>`
        }
        <div class="wiz-slots">
          ${slots.map(({ label, h, m }) => {
            const pastSlot = isToday && (h * 60 + m) < cutoffMins;
            const taken    = takenSlots.has(label);
            const isSel    = state.time === label;
            if (pastSlot) return `<div class="wiz-slot past"><p class="slot-time">${label}</p><p class="slot-status">UNAVAILABLE</p></div>`;
            if (taken)    return `<div class="wiz-slot booked"><p class="slot-time">${label}</p><p class="slot-status">BOOKED</p></div>`;
            return `<div class="wiz-slot${isSel ? ' selected' : ' available'}" onclick="wizSelectTime('${label}')">
                      <p class="slot-time">${label}</p>
                      <p class="slot-status">${isSel ? 'SELECTED' : 'AVAILABLE'}</p>
                    </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  window.wizSelectTime = function (slot) {
    state.time = slot;
    document.querySelectorAll('.wiz-slot.available, .wiz-slot.selected').forEach(el => {
      const timeEl   = el.querySelector('.slot-time');
      const statusEl = el.querySelector('.slot-status');
      if (!timeEl) return;
      const isSel = timeEl.textContent.trim() === slot;
      el.className   = `wiz-slot ${isSel ? 'selected' : 'available'}`;
      statusEl.textContent = isSel ? 'SELECTED' : 'AVAILABLE';
    });
  };

  function accessBtns(field, current) {
    return [
      { val: 'true', label: 'Yes' },
      { val: 'false', label: 'No' },
    ].map(({ val, label }) => {
      const active = (current === true && val === 'true') || (current === false && val === 'false');
      const border = active ? '#E07B2A' : '#1A2D4A';
      const bg     = active ? '#E07B2A' : '#0C1422';
      const color  = active ? '#07090F' : '#7A8FAD';
      const weight = active ? '700' : '500';
      return `<button type="button" class="wiz-access-btn" data-field="${field}" data-val="${val}" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid ${border};background:${bg};color:${color};font-size:13px;font-weight:${weight};cursor:pointer;transition:all 0.15s;">${label}</button>`;
    }).join('');
  }

  // --- Step 4: Details ---
  function renderDetailsStep(body) {
    const svc           = getService();
    const selectedAddons = ADDONS.filter(a => state.addonIds.has(a.id));
    const dateStr       = state.date ? state.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    body.innerHTML = `
      <div class="wiz-section">
        <p class="wiz-section-tag">Last Step</p>
        <h2 class="wiz-heading">Tell us about <em class="wiz-em">you.</em></h2>
        <p class="wiz-sub">We'll text you within 1 hour to confirm your appointment. No payment required.</p>
        <div class="wiz-details-form">
          <div class="wiz-details-group">
            <p class="wiz-details-num">01</p>
            <div>
              <h3 class="wiz-details-title">Your contact</h3>
              <div class="wiz-fields-row">
                <div class="wiz-field"><label>Full Name</label><input type="text" id="wiz_name" placeholder="John Smith"></div>
                <div class="wiz-field"><label>Phone</label><input type="tel" id="wiz_phone" placeholder="(602) 000-0000"></div>
              </div>
              <div class="wiz-fields-row">
                <div class="wiz-field"><label>Email</label><input type="email" id="wiz_email" placeholder="you@example.com"></div>
              </div>
            </div>
          </div>
          <div class="wiz-details-group">
            <p class="wiz-details-num">02</p>
            <div>
              <h3 class="wiz-details-title">Your vehicle</h3>
              <div class="wiz-fields-row">
                <div class="wiz-field"><label>Year, Make &amp; Model</label><input type="text" id="wiz_vehicle" placeholder="e.g. 2022 Toyota Camry"></div>
              </div>
            </div>
          </div>
          <div class="wiz-details-group">
            <p class="wiz-details-num">03</p>
            <div>
              <h3 class="wiz-details-title">Where we come</h3>
              <div class="wiz-fields-row">
                <div class="wiz-field wiz-field-addr">
                  <label>Service Address</label>
                  <input type="text" id="wiz_location" placeholder="Start typing your address..." autocomplete="off">
                  <div class="wiz-addr-suggestions" id="wiz_addr_suggestions"></div>
                </div>
              </div>
              <div class="wiz-fields-row">
                <div class="wiz-field"><label>Unit / Apt # <span class="wiz-optional">(optional)</span></label><input type="text" id="wiz_unit" placeholder="Apt 4B, Unit 200, Suite 100..."></div>
              </div>
              <div class="wiz-fields-row">
                <div class="wiz-field"><label>Notes <span class="wiz-optional">(optional)</span></label><input type="text" id="wiz_notes" placeholder="Pet hair, gate codes, parking notes..."></div>
              </div>
            </div>
          </div>
          <div class="wiz-details-group">
            <p class="wiz-details-num">04</p>
            <div>
              <h3 class="wiz-details-title">Property access</h3>
              <p style="font-size:13px;color:#7A8FAD;margin:2px 0 16px;">Helps our tech prepare - not always required, just good to know.</p>
              <div class="wiz-fields-row">
                <div class="wiz-field">
                  <label>Water access on site?</label>
                  <div style="display:flex;gap:8px;margin-top:10px;">${accessBtns('water', state.hasWater)}</div>
                </div>
                <div class="wiz-field">
                  <label>Power / electricity on site?</label>
                  <div style="display:flex;gap:8px;margin-top:10px;">${accessBtns('power', state.hasPower)}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="wiz-order-summary">
            <p class="wiz-summary-label">Order Summary</p>
            <div class="wiz-summary-lines">
              ${svc ? `<div class="wiz-summary-line"><span>${esc(svc.name)}</span><span>$${svc.price}</span></div>` : ''}
              ${state.vehicleSize === 'large' ? `<div class="wiz-summary-line"><span>+ Oversized / 3rd Row Vehicle</span><span>+$50</span></div>` : ''}
              ${selectedAddons.map(a => {
                const price = a.id === 'childseat' ? a.price * state.childSeatQty : a.price;
                const label = a.id === 'childseat' ? `${esc(a.name)} x${state.childSeatQty}` : esc(a.name);
                return `<div class="wiz-summary-line"><span>+ ${label}</span><span>+$${price}</span></div>`;
              }).join('')}
              ${dateStr ? `<div class="wiz-summary-line datetime"><span>${esc(dateStr)}${state.time ? ' · ' + state.time : ''}</span></div>` : ''}
            </div>
            <div class="wiz-summary-total">
              <span>Estimated Total</span>
              <span class="wiz-summary-total-val">$${getTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>`;
    setupDetailsStep();
  }

  function setupDetailsStep() {
    const phoneEl = document.getElementById('wiz_phone');
    if (phoneEl) {
      phoneEl.addEventListener('input', function () {
        const digits = this.value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 3)      this.value = digits;
        else if (digits.length <= 6) this.value = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
        else                         this.value = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      });
    }

    const addrEl    = document.getElementById('wiz_location');
    const suggestEl = document.getElementById('wiz_addr_suggestions');
    if (!addrEl || !suggestEl) return;
    let debounce;
    addrEl.addEventListener('input', function () {
      clearTimeout(debounce);
      const q = this.value.trim();
      if (q.length < 4) { suggestEl.style.display = 'none'; suggestEl.innerHTML = ''; return; }
      debounce = setTimeout(() => {
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lat=33.35&lon=-111.84&lang=en`)
          .then(r => r.json())
          .then(data => {
            const items = (data.features || []).filter(f => f.properties.country === 'United States');
            if (!items.length) { suggestEl.style.display = 'none'; return; }
            suggestEl.innerHTML = items.map(f => {
              const p = f.properties;
              const line1 = [p.housenumber, p.street].filter(Boolean).join(' ');
              const line2 = [p.city, p.state, p.postcode].filter(Boolean).join(', ');
              const full  = [line1, line2].filter(Boolean).join(', ');
              return `<div class="wiz-addr-option" data-addr="${full.replace(/"/g,'&quot;')}">${full}</div>`;
            }).join('');
            suggestEl.style.display = 'block';
            suggestEl.querySelectorAll('.wiz-addr-option').forEach(el => {
              el.addEventListener('mousedown', function (e) {
                e.preventDefault();
                addrEl.value = this.dataset.addr;
                suggestEl.style.display = 'none';
              });
            });
          }).catch(() => { suggestEl.style.display = 'none'; });
      }, 350);
    });
    addrEl.addEventListener('blur', () => setTimeout(() => { suggestEl.style.display = 'none'; }, 150));

    document.querySelectorAll('.wiz-access-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const field  = this.dataset.field;
        const rawVal = this.dataset.val;
        const val    = rawVal === 'true' ? true : rawVal === 'false' ? false : null;
        if (field === 'water') state.hasWater = val;
        else                   state.hasPower = val;
        document.querySelectorAll(`.wiz-access-btn[data-field="${field}"]`).forEach(b => {
          const active = b.dataset.val === rawVal;
          b.style.borderColor = active ? '#E07B2A' : '#1A2D4A';
          b.style.background  = active ? '#E07B2A' : '#0C1422';
          b.style.color       = active ? '#07090F' : '#7A8FAD';
          b.style.fontWeight  = active ? '700'     : '500';
        });
      });
    });
  }

  // --- Navigation ---
  function scrollToWiz() {
    const el = document.getElementById('booking');
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  }

  function showAlert(msg) {
    let el = document.getElementById('wizAlertBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wizAlertBanner';
      el.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#EF4444;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  window.wizGoBack = function () {
    if (state.step > 1) { state.step--; renderStep(); scrollToWiz(); }
  };

  window.wizGoNext = function () {
    if (state.step === 1) {
      if (!state.serviceId) { showAlert('Please select a service package.'); return; }
      state.step = 2;
    } else if (state.step === 2) {
      if (!state.date) { showAlert('Please select a date.'); return; }
      state.step = 3;
    } else if (state.step === 3) {
      if (!state.time) { showAlert('Please select a time slot.'); return; }
      state.step = 4;
    } else {
      wizSubmit(); return;
    }
    renderStep(); scrollToWiz();
  };

  // --- Submit ---
  async function wizSubmit() {
    const name       = (document.getElementById('wiz_name').value     || '').trim();
    const phone      = (document.getElementById('wiz_phone').value    || '').trim();
    const email      = (document.getElementById('wiz_email').value    || '').trim();
    const vehicle    = (document.getElementById('wiz_vehicle').value  || '').trim();
    const streetAddr = (document.getElementById('wiz_location').value || '').trim();
    const unit       = (document.getElementById('wiz_unit')?.value    || '').trim();
    const location   = unit ? `${streetAddr}, ${unit}` : streetAddr;
    const notes      = (document.getElementById('wiz_notes').value    || '').trim();

    if (!name || !phone || !email) { showAlert('Please fill in your name, phone, and email.'); return; }
    if (!vehicle)                   { showAlert('Please enter your vehicle info (year, make & model).'); return; }
    if (!location)                  { showAlert('Please enter your service address.'); return; }

    const nextBtn = document.getElementById('wizNext');
    nextBtn.textContent = 'Submitting...';
    nextBtn.disabled    = true;

    const svc              = getService();
    const selectedAddons   = ADDONS.filter(a => state.addonIds.has(a.id));
    const vehicleSizeLabel = state.vehicleSize === 'large' ? 'Oversized / 3rd Row Vehicle (+$50)' : 'Standard Vehicle';
    const addonsLabel      = selectedAddons.length
      ? selectedAddons.map(a => {
          if (a.id === 'childseat') return `${a.name} x${state.childSeatQty} (+$${a.price * state.childSeatQty})`;
          return `${a.name} (+$${a.price})`;
        }).join(', ')
      : 'None';
    const dateLabel  = state.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dateShort  = state.date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

    localStorage.setItem('sonoran_booking', JSON.stringify({
      name,
      phone,
      service:      svc ? svc.name : '',
      vehicle_size: state.vehicleSize === 'large' ? 'Oversized / 3rd Row Vehicle (+$50)' : '',
      vehicle:      vehicle || '',
      addons:       addonsLabel !== 'None' ? addonsLabel : '',
      date:         dateShort,
      time:         state.time,
      total:        getTotal(),
    }));

    const formBody = new URLSearchParams({
      'form-name':      'bookings',
      company:          'Sonoran Mobile Car Detailing',
      name, phone, email,
      service:          svc ? `${svc.name} - $${svc.price}` : '',
      vehicle_size:     vehicleSizeLabel,
      vehicle:          vehicle || 'Not specified',
      addons:           addonsLabel,
      date:             dateLabel,
      time:             state.time,
      location,
      notes:            notes || 'None',
      estimated_total:  '$' + getTotal(),
    });
    navigator.sendBeacon('/', new Blob([formBody.toString()], { type: 'application/x-www-form-urlencoded' }));

    // Customer confirmation email via Brevo
    const _svcLabel = svc ? `${svc.name} - $${svc.price}` : '';
    const _total    = '$' + getTotal();
    const _dateTime = `${dateLabel} at ${state.time}`;
    const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Booking Confirmed</title></head><body bgcolor="#07090F" style="margin:0;padding:0;background-color:#07090F;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#07090F" style="background-color:#07090F;"><tr><td align="center" bgcolor="#07090F" style="padding:32px 16px;background-color:#07090F;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;"><tr><td align="center" bgcolor="#0C1422" style="background-color:#0C1422;border-radius:12px 12px 0 0;padding:36px 40px;border-bottom:2px solid #E07B2A;"><img src="https://sonoranmobilecardetailing.com/logo.png" alt="Sonoran Mobile Car Detailing" width="160" style="display:block;margin:0 auto;max-width:160px;"></td></tr><tr><td align="center" bgcolor="#0C1422" style="background-color:#0C1422;padding:40px 40px 32px;"><p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E07B2A;">Booking Confirmed</p><h1 style="margin:0 0 16px;font-size:34px;font-weight:700;color:#ffffff;line-height:1.2;">We appreciate <span style="color:#E07B2A;font-style:italic;">you.</span></h1><p style="margin:0;font-size:16px;color:#BEC9DC;line-height:1.7;">Hi ${name}, your booking is all set.<br>We'll reach out within <strong style="color:#ffffff;">1 business hour</strong> to confirm your appointment.</p></td></tr><tr><td bgcolor="#0C1422" style="background-color:#0C1422;padding:0 40px;"><div style="height:1px;background-color:#1A2D4A;"></div></td></tr><tr><td bgcolor="#0C1422" style="background-color:#0C1422;padding:32px 40px;"><p style="margin:0 0 20px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E07B2A;">Your Booking Details</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0C1422" style="padding:12px 0;border-bottom:1px solid #1A2D4A;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#7A8FAD;width:40%;">Service</td><td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${_svcLabel}</td></tr></table></td></tr><tr><td bgcolor="#0C1422" style="padding:12px 0;border-bottom:1px solid #1A2D4A;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#7A8FAD;width:40%;">Vehicle</td><td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${vehicle || 'Not specified'}</td></tr></table></td></tr><tr><td bgcolor="#0C1422" style="padding:12px 0;border-bottom:1px solid #1A2D4A;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#7A8FAD;width:40%;">Date &amp; Time</td><td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${_dateTime}</td></tr></table></td></tr><tr><td bgcolor="#0C1422" style="padding:12px 0;border-bottom:1px solid #1A2D4A;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#7A8FAD;width:40%;">Location</td><td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${location}</td></tr></table></td></tr><tr><td bgcolor="#0C1422" style="padding:12px 0;border-bottom:1px solid #1A2D4A;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#7A8FAD;width:40%;">Add-Ons</td><td style="font-size:13px;color:#ffffff;font-weight:600;text-align:right;">${addonsLabel}</td></tr></table></td></tr><tr><td bgcolor="#0C1422" style="padding:16px 0 4px;background-color:#0C1422;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7A8FAD;">Estimated Total</td><td style="font-size:28px;font-weight:700;color:#E07B2A;text-align:right;">${_total}</td></tr></table></td></tr></table><p style="margin:12px 0 0;font-size:12px;color:#7A8FAD;line-height:1.6;">* Final pricing may vary based on vehicle condition, pet hair, stains, and biohazard cleanup.</p></td></tr><tr><td bgcolor="#0C1422" style="background-color:#0C1422;padding:0 40px;"><div style="height:1px;background-color:#1A2D4A;"></div></td></tr><tr><td bgcolor="#0C1422" style="background-color:#0C1422;padding:32px 40px;"><p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#E07B2A;">What Happens Next</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" bgcolor="#0C1422" style="padding:8px 0;background-color:#0C1422;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:18px;color:#E07B2A;padding-right:12px;line-height:1;">&#9312;</td><td style="font-size:14px;color:#BEC9DC;line-height:1.6;">We'll text or call you within <strong style="color:#ffffff;">1 business hour</strong> to confirm your appointment time.</td></tr></table></td></tr><tr><td valign="top" bgcolor="#0C1422" style="padding:8px 0;background-color:#0C1422;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:18px;color:#E07B2A;padding-right:12px;line-height:1;">&#9313;</td><td style="font-size:14px;color:#BEC9DC;line-height:1.6;">Our detailer arrives at your location with all supplies - <strong style="color:#ffffff;">no payment needed upfront.</strong></td></tr></table></td></tr><tr><td valign="top" bgcolor="#0C1422" style="padding:8px 0;background-color:#0C1422;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:18px;color:#E07B2A;padding-right:12px;line-height:1;">&#9314;</td><td style="font-size:14px;color:#BEC9DC;line-height:1.6;">Sit back and enjoy a <strong style="color:#ffffff;">showroom-quality detail</strong> right at your door.</td></tr></table></td></tr></table></td></tr><tr><td align="center" bgcolor="#0C1422" style="background-color:#0C1422;padding:8px 40px 40px;"><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td bgcolor="#E07B2A" style="border-radius:6px;background-color:#E07B2A;"><a href="tel:+16027554331" style="display:inline-block;background-color:#E07B2A;color:#07090F;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Call Us: (602) 755-4331</a></td></tr></table></td></tr><tr><td align="center" bgcolor="#050810" style="background-color:#050810;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #1A2D4A;"><p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#ffffff;">Sonoran Mobile Car Detailing</p><p style="margin:0 0 6px;font-size:12px;color:#7A8FAD;">Phoenix East Valley, AZ &nbsp;&middot;&nbsp; Mon-Sun 7AM-7PM</p><p style="margin:0;font-size:12px;color:#7A8FAD;"><a href="tel:6027554331" style="color:#7A8FAD;text-decoration:none;">(602) 755-4331</a>&nbsp;&middot;&nbsp;<a href="https://sonoranmobilecardetailing.com" style="color:#7A8FAD;text-decoration:none;">sonoranmobilecardetailing.com</a></p></td></tr></table></td></tr></table></body></html>`;

    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        subject: 'Your Booking is Confirmed - Sonoran Mobile Car Detailing',
        htmlContent: emailHtml,
      }),
    }).then(r => {
      if (!r.ok) r.text().then(t => console.error('Email send failed:', r.status, t))
    }).catch(err => console.error('Email fetch error:', err));

    // Internal notification email
    const internalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>New Booking</title></head><body style="background:#07090F;font-family:Arial,sans-serif;color:#fff;padding:24px;"><h2 style="color:#E07B2A;">New Booking - Sonoran Mobile Car Detailing</h2><table style="width:100%;max-width:500px;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#7A8FAD;width:40%;">Name</td><td style="padding:8px 0;color:#fff;font-weight:600;">${name}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Phone</td><td style="padding:8px 0;color:#fff;font-weight:600;">${phone}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Email</td><td style="padding:8px 0;color:#fff;font-weight:600;">${email}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Service</td><td style="padding:8px 0;color:#fff;font-weight:600;">${svc ? svc.name : ''} - $${svc ? svc.price : 0}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Vehicle</td><td style="padding:8px 0;color:#fff;font-weight:600;">${vehicle}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Vehicle Size</td><td style="padding:8px 0;color:#fff;font-weight:600;">${vehicleSizeLabel}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Add-Ons</td><td style="padding:8px 0;color:#fff;font-weight:600;">${addonsLabel}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Date &amp; Time</td><td style="padding:8px 0;color:#fff;font-weight:600;">${dateLabel} at ${state.time}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Address</td><td style="padding:8px 0;color:#fff;font-weight:600;">${location}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Notes</td><td style="padding:8px 0;color:#fff;font-weight:600;">${notes || 'None'}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Water Access</td><td style="padding:8px 0;color:#fff;font-weight:600;">${state.hasWater === true ? 'Yes' : state.hasWater === false ? 'No' : 'Not specified'}</td></tr><tr><td style="padding:8px 0;color:#7A8FAD;">Power Access</td><td style="padding:8px 0;color:#fff;font-weight:600;">${state.hasPower === true ? 'Yes' : state.hasPower === false ? 'No' : 'Not specified'}</td></tr><tr><td style="padding:12px 0 4px;color:#7A8FAD;font-weight:700;font-size:16px;">TOTAL</td><td style="padding:12px 0 4px;color:#E07B2A;font-weight:700;font-size:24px;">$${getTotal()}</td></tr></table></body></html>`;

    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'arizonamobilecardetailing@gmail.com',
        name: 'AZ MCD Team',
        subject: `New Booking: ${name} - Sonoran - ${dateShort} at ${state.time}`,
        htmlContent: internalHtml,
      }),
    }).catch(() => {});

    // Sync to Supabase admin portal
    const _isoDate = `${state.date.getFullYear()}-${String(state.date.getMonth()+1).padStart(2,'0')}-${String(state.date.getDate()).padStart(2,'0')}`;
    const _tm = state.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let _h = _tm ? parseInt(_tm[1]) : 9, _m = _tm ? parseInt(_tm[2]) : 0, _ap = _tm ? _tm[3].toUpperCase() : 'AM';
    if (_ap === 'PM' && _h !== 12) _h += 12; if (_ap === 'AM' && _h === 12) _h = 0;
    const _slot = `${String(_h).padStart(2,'0')}:${String(_m).padStart(2,'0')}`;
    const _addons = selectedAddons.map(a => ({ name: a.name, price: a.price, qty: a.id === 'childseat' ? (state.childSeatQty || 1) : 1 }));
    if (state.vehicleSize === 'large') _addons.unshift({ name: 'Oversized Vehicle / 3rd Row Fee', price: 50, qty: 1 });
    fetch('https://wjtjsfopysjtpkooxyje.supabase.co/rest/v1/bookings', {
      method: 'POST',
      keepalive: true,
      headers: {
        'apikey': 'sb_publishable_KTN_kS0acmCrDHKd0PV87g_OgYKL15s',
        'Authorization': 'Bearer sb_publishable_KTN_kS0acmCrDHKd0PV87g_OgYKL15s',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        business_id:      'f7c3a2e1-b8d4-4f6e-9c1a-5d7b3e8f2a4c',
        customer_name:    name,
        customer_email:   email,
        customer_phone:   phone,
        vehicle_make:     vehicle,
        service_address:  location,
        service_name:     svc ? svc.name : 'Unknown',
        service_price:    svc ? svc.price : 0,
        addons:           _addons,
        total:            getTotal(),
        notes:            notes || null,
        date:             _isoDate,
        time_slot:        _slot,
        status:           'pending',
        payment_status:   'not_paid',
        has_water_access: state.hasWater,
        has_power_access: state.hasPower,
      }),
    }).catch(() => {});

    window.location.href = 'thank-you.html';
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('wizBody')) return;
    renderStep();
    document.getElementById('wizBack').addEventListener('click', wizGoBack);
    document.getElementById('wizNext').addEventListener('click', wizGoNext);
  });
})();
