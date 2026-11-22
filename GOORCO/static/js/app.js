/**
 * GOORCO Luxury Hair Salon & Barber Web Platform
 * Client, GOORCO Jobs & Employee Staff Portal Frontend Application
 */

// ── Theme System ─────────────────────────────────────────────────────────────
window.setTheme = function(theme) {
  const validThemes = ['light', 'royal', 'dark'];
  if (!validThemes.includes(theme)) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('goorco_theme', theme);
  document.querySelectorAll('.theme-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-val') === theme);
  });
};

(function initTheme() {
  const saved = localStorage.getItem('goorco_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

const AppState = {
  currentLocation: localStorage.getItem('goorco_location') || 'casablanca',
  currentPortal: 'client', // 'client' or 'jobs'
  serviceCategoryFilter: 'all', // 'all', 'coiffure', 'esthetique', 'bien_etre'
  cart: JSON.parse(localStorage.getItem('goorco_cart') || '[]'),
  services: [],
  providers: [],
  products: [],
  jobs: [],
  locations: [],
  employee: JSON.parse(localStorage.getItem('goorco_employee') || 'null'),
  employeeAppointments: [],
  employeeFilter: 'all', // 'all', 'today', 'active', 'completed'
  jobsCityFilter: 'all', // 'all', 'casablanca', 'cote_divoire'
  bookingState: {
    locationId: 'casablanca',
    serviceId: null,
    serviceObj: null,
    providerId: null,
    providerObj: null,
    date: '',
    time: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    reminderChannel: 'whatsapp',
    notes: ''
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // 0. Theme init — sync button active states
  setTheme(localStorage.getItem('goorco_theme') || 'dark');

  // 1. Language init
  const savedLang = localStorage.getItem('goorco_lang') || 'fr';
  setLanguage(savedLang);

  // 2. Fetch initial data
  await loadLocations();
  await refreshLocationData();

  // 3. Setup event listeners
  setupNavListeners();
  setupLocationSwitchers();
  setupPortalSwitchers();
  setupBookingWizard();
  setupCartAndCheckout();
  setupJobApplicationModal();
  setupStaffPortal();
  updateCartBadge();

  // 4. Restore last view / section & session on reload/refresh
  restoreLastViewAndSession();

  // Handle language change re-render
  window.addEventListener('languageChanged', () => {
    renderServices();
    renderProducts();
    renderJobs();
    renderProvidersInWizard();
    updateLocationDisplay();
    updateLocationButtons();
    if (AppState.employee) {
      renderEmployeeAppointmentsList();
    }
  });
});

// Load Locations metadata
async function loadLocations() {
  try {
    const res = await fetch('/api/locations');
    const data = await res.json();
    AppState.locations = data.locations || [];
    updateLocationDisplay();
  } catch (err) {
    console.error('Error fetching locations:', err);
  }
}

// Refresh data when location changes
async function refreshLocationData() {
  const loc = AppState.currentLocation;
  AppState.bookingState.locationId = loc;
  localStorage.setItem('goorco_location', loc);

  updateLocationButtons();
  updateLocationDisplay();

  // Fetch parallel
  try {
    const [servRes, provRes, prodRes, jobsRes] = await Promise.all([
      fetch(`/api/services?location=${loc}`),
      fetch(`/api/providers?location=${loc}`),
      fetch(`/api/products?location=${loc}`),
      fetch(`/api/jobs`) // Fetch all jobs for complete candidate visibility
    ]);

    const servData = await servRes.json();
    const provData = await provRes.json();
    const prodData = await prodRes.json();
    const jobsData = await jobsRes.json();

    AppState.services = servData.services || [];
    AppState.providers = provData.providers || [];
    AppState.products = prodData.products || [];
    AppState.jobs = jobsData.jobs || [];

    renderServices();
    renderProducts();
    renderJobs();
    renderProvidersInWizard();
    populateServiceSelectInWizard();
    renderSelectedPrestationCard();
  } catch (err) {
    console.error('Error refreshing location data:', err);
  }
}

function updateLocationButtons() {
  document.querySelectorAll('.branch-pill-btn, .hero-country-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.location === AppState.currentLocation);
  });
  document.querySelectorAll('.location-box-card').forEach(card => {
    card.classList.toggle('active', card.dataset.location === AppState.currentLocation);
  });
  updateWizardLocationUI();
}

function updateWizardLocationUI() {
  const isCasa = AppState.currentLocation === 'casablanca';
  const cardCasa = document.getElementById('wizardLocCardCasa');
  const cardAbi = document.getElementById('wizardLocCardAbidjan');
  const badgeCasa = document.getElementById('wizardLocBadgeCasa');
  const badgeAbi = document.getElementById('wizardLocBadgeAbidjan');

  if (cardCasa) {
    cardCasa.classList.toggle('selected', isCasa);
    if (badgeCasa) {
      badgeCasa.innerHTML = isCasa ? `<span class="badge-tag badge-gold" style="font-size: 0.75rem;">✓ ${currentLang === 'ar' ? 'محدد حالياً' : 'Actif'}</span>` : '';
    }
  }
  if (cardAbi) {
    cardAbi.classList.toggle('selected', !isCasa);
    if (badgeAbi) {
      badgeAbi.innerHTML = !isCasa ? `<span class="badge-tag badge-emerald" style="font-size: 0.75rem;">✓ ${currentLang === 'ar' ? 'محدد حالياً' : 'Actif'}</span>` : '';
    }
  }
}

window.selectWizardLocation = function(locId) {
  if (AppState.currentLocation !== locId) {
    AppState.currentLocation = locId;
    AppState.activeStarProviderId = null;
    if (AppState.selectedFiches) AppState.selectedFiches.clear();
    refreshLocationData();
    showToast(currentLang === 'ar' ? 'تم اختيار الصالون بنجاح' : (locId === 'casablanca' ? 'Salon Maroc (Casablanca) sélectionné' : 'Salon Côte d’Ivoire (Abidjan) sélectionné'), 'info');
  }
  updateWizardLocationUI();
  goToBookingStep(2);
};

function updateLocationDisplay() {
  const locObj = AppState.locations.find(l => l.id === AppState.currentLocation);
  if (!locObj) return;

  const isCasa = AppState.currentLocation === 'casablanca';

  const indicatorEl = document.getElementById('heroLocationIndicator');
  if (indicatorEl) {
    const cityName = isCasa ? (currentLang === 'ar' ? 'الدار البيضاء' : 'Casablanca') : (currentLang === 'ar' ? 'أبيدجان' : 'Abidjan');
    const currency = isCasa ? 'MAD (درهم)' : 'FCFA (فرنك سيفا)';
    indicatorEl.innerHTML = `
      <span style="font-size: 1.2rem;">${isCasa ? '🇲🇦' : '🇨🇮'}</span>
      <strong>GOORCO ${cityName}</strong> &bull; <span style="color: var(--gold-light);">${currency}</span>
    `;
  }

  const noticeText = document.getElementById('activeLocationNoticeText');
  if (noticeText) {
    const locName = currentLang === 'ar' ? locObj.name_ar : (currentLang === 'en' ? locObj.name_en : locObj.name_fr);
    const address = currentLang === 'ar' ? locObj.address_ar : (currentLang === 'en' ? locObj.address_en : locObj.address_fr);
    noticeText.innerHTML = `
      <h4>${locName} (${locObj.currency})</h4>
      <p>${address} &bull; 📞 ${locObj.phone}</p>
    `;
  }
}

// Setup Switchers
function setupLocationSwitchers() {
  document.querySelectorAll('[data-switch-location]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetLoc = e.currentTarget.getAttribute('data-switch-location');
      if (targetLoc && targetLoc !== AppState.currentLocation) {
        AppState.currentLocation = targetLoc;
        AppState.activeStarProviderId = null;
        if (AppState.selectedFiches) AppState.selectedFiches.clear();
        refreshLocationData();
        showToast(currentLang === 'ar' ? 'تم تحويل الفرع بنجاح' : (targetLoc === 'casablanca' ? 'Salon Maroc (Casablanca) sélectionné' : 'Salon Côte d’Ivoire (Abidjan) sélectionné'), 'success');
      }
    });
  });
}

function setupPortalSwitchers() {
  const clientBtn = document.getElementById('portalClientBtn');
  const jobsBtn = document.getElementById('portalJobsBtn');
  const clientViews = document.querySelectorAll('.portal-client-view');
  const jobsViews = document.querySelectorAll('.portal-jobs-view');

  window.setPortalMode = function(mode) {
    AppState.currentPortal = mode;
    localStorage.setItem('goorco_portal', mode);
    if (clientBtn && jobsBtn) {
      clientBtn.classList.toggle('active', mode === 'client');
      jobsBtn.classList.toggle('active', mode === 'jobs');
    }
    clientViews.forEach(el => el.style.display = (mode === 'client') ? 'block' : 'none');
    jobsViews.forEach(el => el.style.display = (mode === 'jobs') ? 'block' : 'none');
  };

  if (clientBtn) {
    clientBtn.addEventListener('click', () => {
      window.setPortalMode('client');
      localStorage.setItem('goorco_active_view', '#hero');
      history.replaceState(null, null, '#hero');
      setTimeout(() => {
        const target = document.getElementById('servicesSection') || document.getElementById('hero');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
  }

  if (jobsBtn) {
    jobsBtn.addEventListener('click', () => {
      window.setPortalMode('jobs');
      localStorage.setItem('goorco_jobs_subtab', 'staff');
      localStorage.setItem('goorco_active_view', '#subViewStaff');
      history.replaceState(null, null, '#subViewStaff');
      const staffSubBtn = document.getElementById('subTabStaffBtn');
      if (staffSubBtn) staffSubBtn.click();
      setTimeout(() => {
        const target = document.getElementById('subViewStaff') || document.getElementById('jobsSection');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    });
  }

  // Quick CTA in Hero
  const heroJobsBtn = document.getElementById('heroJobsBtn');
  if (heroJobsBtn) {
    heroJobsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.setPortalMode('jobs');
      localStorage.setItem('goorco_jobs_subtab', 'careers');
      localStorage.setItem('goorco_active_view', '#jobsSection');
      history.replaceState(null, null, '#jobsSection');
      const careersBtn = document.getElementById('subTabCareersBtn');
      if (careersBtn) careersBtn.click();
      document.getElementById('jobsSection').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Quick Staff Shortcut button in top bar
  const quickStaffBtn = document.getElementById('quickStaffShortcutBtn');
  if (quickStaffBtn) {
    quickStaffBtn.addEventListener('click', () => {
      window.setPortalMode('jobs');
      localStorage.setItem('goorco_jobs_subtab', 'staff');
      localStorage.setItem('goorco_active_view', '#subViewStaff');
      history.replaceState(null, null, '#subViewStaff');
      const staffSubBtn = document.getElementById('subTabStaffBtn');
      if (staffSubBtn) staffSubBtn.click();
      document.getElementById('jobsSection').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function setupNavListeners() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;

      localStorage.setItem('goorco_active_view', href);
      history.replaceState(null, null, href);

      if (href === '#jobsSection') {
        e.preventDefault();
        window.setPortalMode('jobs');
        localStorage.setItem('goorco_jobs_subtab', 'careers');
        const careersBtn = document.getElementById('subTabCareersBtn');
        if (careersBtn) careersBtn.click();
        const target = document.querySelector('#jobsSection');
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 50);
        }
        return;
      }
      // Switch back to client portal if in jobs view
      if (AppState.currentPortal !== 'client') {
        window.setPortalMode('client');
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  setupScrollSpy();
}

function setupScrollSpy() {
  const sections = document.querySelectorAll('section[id], #subViewStaff');
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && AppState.currentPortal === 'client') {
        const id = entry.target.id;
        localStorage.setItem('goorco_active_view', '#' + id);
        history.replaceState(null, null, '#' + id);

        document.querySelectorAll('.nav-links a').forEach(a => {
          const h = a.getAttribute('href');
          a.classList.toggle('active', h === '#' + id);
        });
      }
    });
  }, {
    threshold: 0.35
  });

  sections.forEach(sec => observer.observe(sec));
}

// ----------------------------------------------------
// GOORSTAR CERTIFIED PROS & TECHNICAL SHEETS RENDERING
// ----------------------------------------------------
AppState.activeStarProviderId = null;
AppState.selectedFiches = new Set();
AppState.currentStarPro = null;

window.filterServicesCategory = function(cat) {
  AppState.serviceCategoryFilter = cat;
  document.querySelectorAll('.service-category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-service-cat') === cat);
  });
  renderServices();
};

window.switchStarProvider = function(providerId) {
  AppState.activeStarProviderId = providerId;
  AppState.selectedFiches.clear();
  renderServices();
};

window.toggleFicheSelection = function(ficheId) {
  if (AppState.selectedFiches.has(ficheId)) {
    AppState.selectedFiches.delete(ficheId);
  } else {
    AppState.selectedFiches.add(ficheId);
  }
  updateFichesUI();
};

function updateFichesUI() {
  const count = AppState.selectedFiches.size;
  const label = document.getElementById('bookBtnLabel');
  
  // Highlight cards
  document.querySelectorAll('.goorstar-fiche-card').forEach(card => {
    const id = card.getAttribute('data-fiche-id');
    const isSelected = AppState.selectedFiches.has(id);
    card.classList.toggle('selected', isSelected);
    const cb = card.querySelector('.goorstar-checkbox');
    if (cb) cb.checked = isSelected;
  });

  if (label) {
    if (count === 0) {
      label.textContent = currentLang === 'ar' ? 'حجز موعد' : 'Prendre Rendez-vous';
    } else if (count === 1) {
      label.textContent = currentLang === 'ar' ? 'حجز الموعد (خدمة واحدة)' : 'Prendre Rendez-vous (1 prestation)';
    } else {
      label.textContent = currentLang === 'ar' ? `حجز الموعد (${count} خدمات)` : `Prendre Rendez-vous (${count} prestations)`;
    }
  }
}

function renderServices() {
  const container = document.getElementById('servicesContainer');
  if (!container) return;

  if (!AppState.providers || AppState.providers.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.05rem;">Chargement des professionnels certifiés...</div>`;
    return;
  }

  // Filter providers strictly according to CURRENT LOCATION / POSITION
  const loc = AppState.currentLocation || 'casablanca';
  const starProviders = AppState.providers.filter(p => p.location_id === loc && p.fiches_json);
  const allProvidersList = starProviders.length > 0 ? starProviders : AppState.providers.filter(p => p.location_id === loc);

  // Active provider according to location:
  let activePro = allProvidersList.find(p => p.id === AppState.activeStarProviderId);
  if (!activePro) {
    if (loc === 'casablanca') {
      activePro = allProvidersList.find(p => p.name === 'Karim El Fassi') || allProvidersList[0];
    } else {
      activePro = allProvidersList.find(p => p.name === 'Krikris') || allProvidersList[0];
    }
    AppState.activeStarProviderId = activePro ? activePro.id : null;
  }
  AppState.currentStarPro = activePro;

  if (!activePro) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Aucun professionnel disponible.</div>`;
    return;
  }

  // Parse fiches
  let fiches = [];
  try {
    fiches = typeof activePro.fiches_json === 'string' ? JSON.parse(activePro.fiches_json) : (activePro.fiches_json || []);
  } catch (e) {
    fiches = [];
  }

  // Filter fiches by active category
  const catFilter = AppState.serviceCategoryFilter || 'all';
  const filteredFiches = catFilter === 'all' ? fiches : fiches.filter(f => f.category === catFilter);

  // Badge text
  const badgeText = currentLang === 'ar' ? 'معتمد(ة) GOORCO ✓' : (activePro.name === 'Krikris' ? '✔ Certifiée GOORCO' : '✔ Certifié GOORCO');
  const ratingVal = activePro.rating ? activePro.rating.toFixed(1).replace('.', ',') : '4,9';
  const reviewsCount = activePro.reviews_count || 48;
  const reviewsText = currentLang === 'ar' ? `(${reviewsCount} تقييم)` : `(${reviewsCount} avis)`;
  const zoneText = activePro.zone || (activePro.location_id === 'casablanca' ? 'Casablanca • Quartier Gauthier • Salon VIP' : 'Abidjan • Marcory Remblais • Salon VIP');
  const reposText = activePro.repos || (activePro.location_id === 'casablanca' ? 'Dimanche' : 'Lundi');
  const availableTodayText = currentLang === 'ar' ? 'متاح اليوم 🟢' : "Disponible aujourd'hui 🟢";
  const salonName = activePro.salon_name || (activePro.location_id === 'casablanca' ? 'GOORCO Casablanca Prestige' : 'GOORCO Abidjan Riviera');
  const addressText = activePro.address || (activePro.location_id === 'casablanca' ? '45 Boulevard d\'Anfa, Quartier Gauthier, Casablanca' : 'Boulevard Latrille, Riviera Bonoumin (Face Glacier), Cocody, Abidjan');
  const phoneText = activePro.phone || '';
  const emailText = activePro.email || '';

  // Build pro chips if multiple
  const chipsHtml = allProvidersList.length > 1 ? `
    <div class="goorstar-selector-bar">
      ${allProvidersList.map(p => {
        const isActive = p.id === activePro.id;
        return `
          <button class="goorstar-pro-chip ${isActive ? 'active' : ''}" onclick="switchStarProvider(${p.id})">
            <img src="${p.image_url}" alt="${p.name}">
            <span>${p.name}</span>
          </button>
        `;
      }).join('')}
    </div>
  ` : '';

  // Render cards
  const fichesHtml = filteredFiches.length > 0 ? filteredFiches.map(f => {
    const isSelected = AppState.selectedFiches.has(f.id);
    const subtitleHtml = f.subtitle ? `<div class="goorstar-fiche-subtitle">${f.subtitle}</div>` : '';
    const imagesHtml = (f.images || []).map(img => `
      <img src="${img}" alt="${f.name}" class="goorstar-gallery-img" loading="lazy" onerror="this.src='/images/hero-braids.svg'">
    `).join('');

    const displayPrice = loc === 'casablanca' ? (f.price_range_mad || f.price_range) : (f.price_range_fcfa || f.price_range);

    return `
      <div class="goorstar-fiche-card ${isSelected ? 'selected' : ''}" data-fiche-id="${f.id}" onclick="toggleFicheSelection('${f.id}')">
        <div class="goorstar-gallery-strip">
          ${imagesHtml}
        </div>
        <div class="goorstar-fiche-bottom">
          <div class="goorstar-fiche-info">
            <h4 class="goorstar-fiche-title">
              <span>${f.icon || '✂️'}</span>
              <span>${f.name}</span>
            </h4>
            <div class="goorstar-fiche-rating-row" style="display: flex; align-items: center; gap: 8px; margin: 4px 0; flex-wrap: wrap;">
              <span class="goorstar-fiche-rating" style="margin: 0;">⭐ ${ratingVal}</span>
              <span class="goorstar-reviews" style="color: var(--text-muted); font-size: 0.82rem;">(${reviewsText})</span>
              ${f.subtitle ? `<span style="color: var(--text-muted); font-size: 0.82rem;">•</span><span class="goorstar-fiche-subtitle" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">${f.subtitle}</span>` : ''}
            </div>
            <div class="goorstar-fiche-price">${displayPrice}</div>
          </div>
          <div class="goorstar-checkbox-wrap" onclick="event.stopPropagation(); toggleFicheSelection('${f.id}')">
            <input type="checkbox" class="goorstar-checkbox" data-fiche-id="${f.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleFicheSelection('${f.id}')">
          </div>
        </div>
      </div>
    `;
  }).join('') : `
    <div style="text-align: center; padding: 35px 20px; color: var(--text-muted); font-size: 0.95rem;">
      ${currentLang === 'ar' ? 'لا توجد خدمات في هذا التصنيف لهذا المهني.' : 'Aucune prestation dans cette catégorie pour ce profil.'}
    </div>
  `;

  container.innerHTML = `
    <div class="goorstar-wrapper">
      ${chipsHtml}

      <div class="goorstar-app-container">
        <!-- Brand Header -->
        <div class="goorstar-brand-header">
          <div class="goorstar-logo-text">
            <span class="gold-gradient-text serif-title" style="letter-spacing: 2px; font-size: 2.2rem; font-weight: 800;">GOORCO</span>
          </div>
        </div>

        <!-- Provider Profile Card -->
        <div class="goorstar-profile-card">
          <div class="goorstar-avatar-wrap">
            <img src="${activePro.image_url}" alt="${activePro.name}" class="goorstar-avatar">
          </div>
          <div class="goorstar-profile-info">
            <div class="goorstar-name-row">
              <h3 class="goorstar-name">${activePro.name}</h3>
              <span class="goorstar-badge">${badgeText}</span>
            </div>
            <div class="goorstar-rating-row">
              ⭐ ${ratingVal} <span class="goorstar-reviews">${reviewsText}</span>
            </div>
            <div class="goorstar-meta-line">
              <strong>Zone :</strong> ${zoneText}
            </div>
            <div class="goorstar-meta-line">
              <strong>Repos :</strong> ${reposText} • ${availableTodayText}
            </div>
          </div>
        </div>

        <!-- Salon & Contact Info -->
        <div class="goorstar-salon-info">
          <div class="goorstar-salon-row">
            <span>🏛️</span>
            <div>
              <strong>${currentLang === 'ar' ? 'الصالون :' : 'Salon :'}</strong>
              <span>${salonName}</span>
            </div>
          </div>
          <div class="goorstar-salon-row">
            <span>📍</span>
            <div>
              <strong>${currentLang === 'ar' ? 'العنوان :' : 'Adresse :'}</strong>
              <span>${addressText}</span>
            </div>
          </div>
          <div class="goorstar-salon-row">
            <span>📞</span>
            <div>
              <strong>${currentLang === 'ar' ? 'الهاتف :' : 'Contact :'}</strong>
              <a href="tel:${phoneText.replace(/\s/g, '')}" style="color: inherit; text-decoration: none;">${phoneText}</a>
            </div>
          </div>
        </div>

        <!-- Section Title -->
        <div class="goorstar-section-title">
          ${currentLang === 'ar' ? `البطاقات الفنية (${filteredFiches.length} خدمات)` : `Ses fiches techniques (${filteredFiches.length} prestation${filteredFiches.length > 1 ? 's' : ''})`}
        </div>

        <!-- Fiches List -->
        <div class="goorstar-fiches-list">
          ${fichesHtml}
        </div>

        <!-- Bottom CTA Bar -->
        <div class="goorstar-cta-section">
          <button class="btn-book-direct" id="btnBookDirect" onclick="bookCertifiedProOnline(${activePro.id})">
            <span>📅</span>
            <span id="bookBtnLabel">${currentLang === 'ar' ? 'حجز موعد' : 'Prendre Rendez-vous'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  updateFichesUI();
}

window.bookCertifiedProOnline = function(providerId) {
  const provider = (AppState.providers || []).find(p => p.id === providerId) || AppState.currentStarPro;
  if (!provider) return;

  // 1. Automatic location synchronization (Casablanca / Maroc vs Abidjan / Côte d'Ivoire)
  const targetLoc = provider.location_id || AppState.currentLocation;
  if (targetLoc && targetLoc !== AppState.currentLocation) {
    AppState.currentLocation = targetLoc;
    refreshLocationData();
  }
  AppState.bookingState.locationId = AppState.currentLocation;
  updateWizardLocationUI();

  // 2. Automatic provider synchronization
  AppState.bookingState.providerId = provider.id;
  AppState.bookingState.providerObj = provider;

  // 3. Automatic prestation synchronization based on selected fiches techniques
  let fiches = [];
  try {
    fiches = typeof provider.fiches_json === 'string' ? JSON.parse(provider.fiches_json) : (provider.fiches_json || []);
  } catch (e) {
    fiches = [];
  }

  const selectedFichesList = fiches.filter(f => AppState.selectedFiches && AppState.selectedFiches.has(f.id));
  
  if (selectedFichesList.length > 0) {
    const ficheNames = selectedFichesList.map(f => f.name).join(' + ');
    const fichePrices = selectedFichesList.map(f => (AppState.currentLocation === 'casablanca' ? (f.price_range_mad || f.price_range) : (f.price_range_fcfa || f.price_range))).join(' + ');
    
    const matchedService = AppState.services.find(s => 
      s.location_id === AppState.currentLocation && 
      selectedFichesList.some(f => s.name_fr.toLowerCase().includes(f.name.toLowerCase().split(' ')[0]))
    ) || AppState.services.find(s => s.location_id === AppState.currentLocation) || { id: 1 };

    AppState.bookingState.serviceId = matchedService.id;
    AppState.bookingState.selectedFichesNames = ficheNames;
    AppState.bookingState.selectedFichesPrices = fichePrices;
    AppState.bookingState.serviceObj = {
      id: matchedService.id,
      name_fr: ficheNames,
      name_ar: ficheNames,
      name_en: ficheNames,
      price: fichePrices,
      duration_minutes: 45 * selectedFichesList.length,
      is_custom_fiche: true
    };
  } else if (fiches.length > 0) {
    const firstF = fiches[0];
    const priceStr = AppState.currentLocation === 'casablanca' ? (firstF.price_range_mad || firstF.price_range) : (firstF.price_range_fcfa || firstF.price_range);
    const matchedService = AppState.services.find(s => s.location_id === AppState.currentLocation) || { id: 1 };
    
    AppState.bookingState.serviceId = matchedService.id;
    AppState.bookingState.selectedFichesNames = firstF.name;
    AppState.bookingState.selectedFichesPrices = priceStr;
    AppState.bookingState.serviceObj = {
      id: matchedService.id,
      name_fr: firstF.name,
      name_ar: firstF.name,
      name_en: firstF.name,
      price: priceStr,
      duration_minutes: 45,
      is_custom_fiche: true
    };
  }

  // 4. Update wizard controls
  renderSelectedPrestationCard();
  populateServiceSelectInWizard();
  renderProvidersInWizard();

  // 5. Scroll smoothly to booking wizard
  const bookingSec = document.getElementById('bookingSection');
  if (bookingSec) {
    bookingSec.scrollIntoView({ behavior: 'smooth' });
  }

  // 6. Navigate directly to Step 2 (Date & Heure) since Prestation is already automatically chosen!
  goToBookingStep(2);

  const presName = AppState.bookingState.selectedFichesNames || (AppState.bookingState.serviceObj ? AppState.bookingState.serviceObj.name_fr : 'Prestation');
  
  showToast(
    currentLang === 'ar' 
      ? `تم اختيار الخدمة (${presName}) وخبيرك (${provider.name}) تلقائياً! حدد تاريخ ووقت الموعد.`
      : `Prestation "${presName}" avec ${provider.name} sélectionnée ! Choisissez votre date & heure.`,
    'success'
  );
};

// Direct booking with chosen provider from the guide
window.bookWithProviderDirect = function(providerId) {
  bookCertifiedProOnline(providerId);
};

// Quick trigger booking wizard with selected service
window.startBookingWithService = function(serviceId) {
  const service = AppState.services.find(s => s.id === serviceId);
  if (!service) return;

  AppState.bookingState.serviceId = serviceId;
  AppState.bookingState.serviceObj = service;
  AppState.bookingState.selectedFichesNames = service.name_fr;
  AppState.bookingState.selectedFichesPrices = `${service.price} ${AppState.currentLocation === 'casablanca' ? 'MAD' : 'FCFA'}`;

  renderSelectedPrestationCard();
  populateServiceSelectInWizard();
  renderProvidersInWizard();

  // Jump to booking section
  const bookingSec = document.getElementById('bookingSection');
  if (bookingSec) {
    bookingSec.scrollIntoView({ behavior: 'smooth' });
  }

  goToBookingStep(2);
};

// ----------------------------------------------------
// BOOKING WIZARD LOGIC
// ----------------------------------------------------
let currentWizardStep = 1;

function setupBookingWizard() {
  document.querySelectorAll('.step-node').forEach(node => {
    node.addEventListener('click', (e) => {
      const step = parseInt(node.dataset.step);
      if (step <= currentWizardStep || step === 1) {
        goToBookingStep(step);
      }
    });
  });

  const dateInput = document.getElementById('bookingDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    AppState.bookingState.date = today;
    dateInput.addEventListener('change', (e) => {
      AppState.bookingState.date = e.target.value;
    });
  }

  document.querySelectorAll('.time-slot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      AppState.bookingState.time = e.currentTarget.dataset.time;
    });
  });

  document.querySelectorAll('[data-wizard-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateCurrentStep(currentWizardStep)) {
        goToBookingStep(currentWizardStep + 1);
      }
    });
  });

  document.querySelectorAll('[data-wizard-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToBookingStep(currentWizardStep - 1);
    });
  });

  const form = document.getElementById('bookingFinalForm');
  if (form) {
    form.addEventListener('submit', handleAppointmentSubmit);
  }

  const serviceSelect = document.getElementById('wizardServiceSelect');
  if (serviceSelect) {
    serviceSelect.addEventListener('change', (e) => {
      const sId = parseInt(e.target.value);
      if (sId) {
        AppState.bookingState.serviceId = sId;
        const serv = AppState.services.find(s => s.id === sId);
        if (serv) {
          AppState.bookingState.serviceObj = serv;
          AppState.bookingState.selectedFichesNames = serv.name_fr;
          AppState.bookingState.selectedFichesPrices = `${serv.price} ${AppState.currentLocation === 'casablanca' ? 'MAD' : 'FCFA'}`;
        }
      }
    });
  }
}

function renderSelectedPrestationCard() {
  const card = document.getElementById('wizardSelectedPrestationCard');
  if (!card) return;

  const serv = AppState.bookingState.serviceObj;
  const prov = AppState.bookingState.providerObj;
  const locObj = AppState.locations.find(l => l.id === AppState.currentLocation);
  
  const presName = AppState.bookingState.selectedFichesNames || (serv ? (currentLang === 'ar' ? (serv.name_ar || serv.name_fr) : serv.name_fr) : (AppState.currentLocation === 'casablanca' ? 'Taper Fade Signature' : 'Make-up'));
  const presPrice = AppState.bookingState.selectedFichesPrices || (serv ? (serv.is_custom_fiche ? serv.price : `${serv.price} ${locObj ? locObj.currency : 'MAD'}`) : (AppState.currentLocation === 'casablanca' ? '150 - 250 MAD' : '10 000 - 20 000 FCFA'));
  const proName = prov ? prov.name : (AppState.currentLocation === 'casablanca' ? 'Karim El Fassi' : 'Krikris');
  const salonName = prov?.salon_name || (AppState.currentLocation === 'casablanca' ? 'GOORCO Casablanca Prestige' : 'GOORCO Abidjan Riviera');
  const address = prov?.address || (AppState.currentLocation === 'casablanca' ? '45 Boulevard d\'Anfa, Quartier Gauthier, Casablanca' : 'Boulevard Latrille, Cocody Riviera, Abidjan');

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
      <div>
        <div class="badge-tag badge-gold" style="margin-bottom: 8px;">✨ ${currentLang === 'ar' ? 'الخدمة المختارة' : 'Prestation Sélectionnée'}</div>
        <h3 class="serif-title" style="color: var(--gold-light); margin: 0 0 6px 0; font-size: 1.35rem;">
          ${presName}
        </h3>
        <p style="margin: 0; color: var(--text-secondary); font-size: 0.92rem;">
          👤 <strong>${proName}</strong> &bull; 🏛️ <strong>${salonName}</strong>
        </p>
        <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">
          📍 ${address}
        </p>
      </div>
      <div style="text-align: right;">
        <span class="badge-tag badge-emerald" style="font-size: 1.1rem; font-weight: 700; padding: 6px 16px;">
          ${presPrice}
        </span>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">${currentLang === 'ar' ? 'تأكيد فوري' : 'Réservation immédiate'}</div>
      </div>
    </div>
  `;
}

function goToBookingStep(stepNumber) {
  currentWizardStep = stepNumber;

  document.querySelectorAll('.step-node').forEach(node => {
    const s = parseInt(node.dataset.step);
    node.classList.toggle('active', s === stepNumber);
    node.classList.toggle('completed', s < stepNumber);
  });

  document.querySelectorAll('.wizard-step-content').forEach(content => {
    const s = parseInt(content.dataset.step);
    content.classList.toggle('active', s === stepNumber);
  });

  if (stepNumber === 1) {
    renderSelectedPrestationCard();
  }
  if (stepNumber === 3) {
    renderBookingSummaryBeforeSubmit();
  }
}

function validateCurrentStep(step) {
  if (step === 1) {
    const select = document.getElementById('wizardServiceSelect');
    if ((!select || !select.value) && !AppState.bookingState.serviceObj) {
      showToast('Veuillez sélectionner une prestation.', 'error');
      return false;
    }
    if (select && select.value) {
      const sId = parseInt(select.value);
      const serv = AppState.services.find(s => s.id === sId) || AppState.bookingState.serviceObj;
      AppState.bookingState.serviceId = serv ? serv.id : sId;
      AppState.bookingState.serviceObj = serv;
    }
  }

  if (step === 2) {
    const dateInput = document.getElementById('bookingDate');
    if (!dateInput || !dateInput.value) {
      showToast('Veuillez choisir une date pour votre rendez-vous.', 'error');
      return false;
    }
    AppState.bookingState.date = dateInput.value;

    const activeSlot = document.querySelector('.time-slot-btn.active');
    if (!activeSlot && !AppState.bookingState.time) {
      showToast('Veuillez sélectionner un créneau horaire.', 'error');
      return false;
    }
    if (activeSlot) {
      AppState.bookingState.time = activeSlot.dataset.time;
    }
  }

  return true;
}

function populateServiceSelectInWizard() {
  const select = document.getElementById('wizardServiceSelect');
  if (!select) return;

  const locObj = AppState.locations.find(l => l.id === AppState.currentLocation) || { currency: 'MAD' };

  let optionsHtml = `<option value="">-- ${getTranslation('services_filter_all')} --</option>`;

  // If a custom prestation was selected from the guide / fiches techniques
  if (AppState.bookingState.serviceObj && AppState.bookingState.serviceObj.is_custom_fiche) {
    optionsHtml += `<option value="${AppState.bookingState.serviceObj.id}" selected>⭐ Prestation choisie : ${AppState.bookingState.serviceObj.name_fr} (${AppState.bookingState.serviceObj.price})</option>`;
  }

  // Add the location services
  optionsHtml += AppState.services.map(s => {
    const isSelected = (!AppState.bookingState.serviceObj?.is_custom_fiche) && (AppState.bookingState.serviceId === s.id);
    const name = currentLang === 'ar' ? (s.name_ar || s.name_fr) : s.name_fr;
    return `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${name} (${s.price} ${locObj.currency} - ${s.duration_minutes} min)</option>`;
  }).join('');

  select.innerHTML = optionsHtml;
}

function renderProvidersInWizard() {
  const container = document.getElementById('wizardProvidersList');
  if (!container) return;

  let html = `
    <div class="provider-card ${!AppState.bookingState.providerId ? 'selected' : ''}" onclick="selectWizardProvider(null)">
      <div class="provider-avatar" style="background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
        💈
      </div>
      <div class="provider-info">
        <h4>${getTranslation('choose_barber_any')}</h4>
        <p>${AppState.currentLocation === 'casablanca' ? 'Artiste de garde Casablanca' : 'Artiste de garde Abidjan'}</p>
        <div class="provider-rating">⭐ 5.0 (Recommandé)</div>
      </div>
    </div>
  `;

  html += AppState.providers.map(p => {
    const role = currentLang === 'ar' ? (p.role_ar || p.role_fr) : (currentLang === 'en' ? (p.role_en || p.role_fr) : p.role_fr);
    const isSel = AppState.bookingState.providerId === p.id;
    return `
      <div class="provider-card ${isSel ? 'selected' : ''}" onclick="selectWizardProvider(${p.id})">
        <img src="${p.image_url}" alt="${p.name}" class="provider-avatar">
        <div class="provider-info">
          <h4>${p.name}</h4>
          <p>${role}</p>
          <div class="provider-rating">⭐ ${p.rating} / 5.0</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

window.selectWizardProvider = function(providerId) {
  AppState.bookingState.providerId = providerId;
  AppState.bookingState.providerObj = AppState.providers.find(p => p.id === providerId) || null;
  renderProvidersInWizard();
};

function renderBookingSummaryBeforeSubmit() {
  const summaryBox = document.getElementById('bookingSummaryMini');
  if (!summaryBox) return;

  const locObj = AppState.locations.find(l => l.id === AppState.currentLocation);
  const serv = AppState.bookingState.serviceObj;
  const prov = AppState.bookingState.providerObj;

  const priceStr = serv 
    ? (serv.is_custom_fiche ? serv.price : `${serv.price} ${locObj ? locObj.currency : 'MAD'}`)
    : '0';

  const presName = AppState.bookingState.selectedFichesNames || (serv ? (currentLang === 'ar' ? (serv.name_ar || serv.name_fr) : serv.name_fr) : (currentLang === 'ar' ? 'غير محددة' : 'Non sélectionnée'));

  summaryBox.innerHTML = `
    <div style="background: var(--bg-secondary); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 20px;">
      <h4 style="color: var(--gold-light); margin-bottom: 8px;">📋 ${currentLang === 'ar' ? 'ملخص الحجز' : 'Récapitulatif du Rendez-vous'}</h4>
      <p><strong>${currentLang === 'ar' ? 'الصالون :' : 'Salon :'}</strong> ${locObj ? (currentLang === 'ar' ? locObj.name_ar : locObj.name_fr) : 'GOORCO'}</p>
      <p><strong>${currentLang === 'ar' ? 'الخدمة :' : 'Prestation :'}</strong> ${presName} <span class="badge-tag badge-gold" style="margin-left: 6px;">${priceStr}</span></p>
      <p><strong>${currentLang === 'ar' ? 'الخبير :' : 'Coiffeur / Expert :'}</strong> ${prov ? prov.name : (currentLang === 'ar' ? 'أول خبير متاح' : 'Premier coiffeur disponible')}</p>
      <p><strong>${currentLang === 'ar' ? 'التاريخ والوقت :' : 'Date & Heure :'}</strong> ${AppState.bookingState.date} à ${AppState.bookingState.time}</p>
    </div>
  `;
}

async function handleAppointmentSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const email = document.getElementById('clientEmail').value.trim();
  const reminder = document.querySelector('input[name="reminder"]:checked')?.value || 'whatsapp';
  const notes = document.getElementById('clientNotes').value.trim();

  if (!name || !phone) {
    showToast('Veuillez renseigner votre nom et votre numéro de téléphone.', 'error');
    return;
  }

  const payload = {
    location_id: AppState.currentLocation,
    service_id: AppState.bookingState.serviceId || 1,
    provider_id: AppState.bookingState.providerId,
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    appointment_date: AppState.bookingState.date,
    appointment_time: AppState.bookingState.time,
    reminder_channel: reminder,
    notes: (AppState.bookingState.selectedFichesNames ? `[Prestation choisie: ${AppState.bookingState.selectedFichesNames} (${AppState.bookingState.selectedFichesPrices})] ` : '') + notes
  };

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success && result.booking) {
      showBookingConfirmation(result.booking);
      // If employee is logged in, reload appointments sheet
      if (AppState.employee) {
        loadEmployeeAppointments();
      }
    } else {
      showToast(result.error || 'Erreur lors de la réservation', 'error');
    }
  } catch (err) {
    console.error('Error submitting appointment:', err);
    showToast('Erreur de connexion avec le serveur', 'error');
  }
}

function showBookingConfirmation(booking) {
  goToBookingStep(4);

  const codeDisplay = document.getElementById('bookingCodeDisplay');
  if (codeDisplay) codeDisplay.innerText = booking.booking_code;

  const detailsDisplay = document.getElementById('bookingSuccessDetails');
  if (detailsDisplay) {
    const presName = AppState.bookingState.selectedFichesNames || booking.service_name;
    const presPrice = AppState.bookingState.selectedFichesPrices || (booking.price ? `${booking.price} ${booking.currency || ''}` : '');
    detailsDisplay.innerHTML = `
      <p><strong>${currentLang === 'ar' ? 'العميل :' : 'Client :'}</strong> ${booking.customer_name}</p>
      <p><strong>${currentLang === 'ar' ? 'الخدمة :' : 'Prestation :'}</strong> ${presName} ${presPrice ? `(${presPrice})` : ''}</p>
      <p><strong>${currentLang === 'ar' ? 'الصالون :' : 'Salon :'}</strong> ${booking.location_name}</p>
      <p><strong>${currentLang === 'ar' ? 'الخبير :' : 'Coiffeur / Expert :'}</strong> ${booking.provider_name || 'Équipe GOORCO'}</p>
      <p><strong>${currentLang === 'ar' ? 'التاريخ والوقت :' : 'Date & Heure :'}</strong> ${booking.appointment_date} à ${booking.appointment_time}</p>
      <p><strong>${currentLang === 'ar' ? 'تذكير عبر :' : 'Rappel via :'}</strong> ${booking.reminder_channel.toUpperCase()}</p>
    `;
  }
}

// ----------------------------------------------------
// E-COMMERCE & CART
// ----------------------------------------------------
function renderProducts() {
  const container = document.getElementById('productsContainer');
  if (!container) return;

  const loc = AppState.currentLocation;
  const isCasa = loc === 'casablanca';
  const currency = isCasa ? 'MAD' : 'FCFA';

  if (AppState.products.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Aucun produit disponible dans la boutique.</div>`;
    return;
  }

  container.innerHTML = AppState.products.map(p => {
    const title = currentLang === 'ar' ? (p.name_ar || p.name_fr) : (currentLang === 'en' ? (p.name_en || p.name_fr) : p.name_fr);
    const desc = currentLang === 'ar' ? (p.description_ar || p.description_fr) : (currentLang === 'en' ? (p.description_en || p.description_fr) : p.description_fr);
    const price = isCasa ? p.price_mad : p.price_xof;
    const badgeHtml = p.badge ? `<span class="badge-tag badge-cyan service-badge-pos">${p.badge}</span>` : '';

    return `
      <div class="product-card" data-product-id="${p.id}">
        <div class="product-img-wrap">
          <img src="${p.image_url}" alt="${title}" loading="lazy">
          ${badgeHtml}
        </div>
        <div class="product-body">
          <div class="product-cat">${p.category}</div>
          <h4 class="product-title">${title}</h4>
          <p class="product-desc">${desc}</p>
          <div class="product-price-bar">
            <span class="product-price-val">${price.toLocaleString()} ${currency}</span>
            <button class="btn-add-cart" onclick="addToCart(${p.id})">
              🛒 ${getTranslation('shop_add_cart')}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.addToCart = function(productId) {
  const p = AppState.products.find(item => item.id === productId);
  if (!p) return;

  const isCasa = AppState.currentLocation === 'casablanca';
  const price = isCasa ? p.price_mad : p.price_xof;
  const currency = isCasa ? 'MAD' : 'FCFA';
  const title = currentLang === 'ar' ? (p.name_ar || p.name_fr) : p.name_fr;

  const existing = AppState.cart.find(item => item.id === productId && item.currency === currency);
  if (existing) {
    existing.qty += 1;
  } else {
    AppState.cart.push({
      id: p.id,
      name: title,
      price: price,
      currency: currency,
      image_url: p.image_url,
      qty: 1
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`${title} ajouté au panier !`, 'success');
};

function saveCart() {
  localStorage.setItem('goorco_cart', JSON.stringify(AppState.cart));
}

function updateCartBadge() {
  const count = AppState.cart.reduce((acc, item) => acc + item.qty, 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.innerText = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function setupCartAndCheckout() {
  const cartBtn = document.getElementById('cartOpenBtn');
  const cartClose = document.getElementById('cartCloseBtn');
  const overlay = document.getElementById('cartDrawerOverlay');
  const drawer = document.getElementById('cartDrawer');

  function openCart() {
    renderCartDrawer();
    overlay.classList.add('open');
    drawer.classList.add('open');
  }

  function closeCart() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCart();
  });

  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCart();
      openCheckoutModal();
    });
  }

  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }
}

function renderCartDrawer() {
  const list = document.getElementById('cartItemsList');
  const totalDisplay = document.getElementById('cartTotalDisplay');
  if (!list) return;

  if (AppState.cart.length === 0) {
    list.innerHTML = `<div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">${getTranslation('shop_cart_empty')}</div>`;
    if (totalDisplay) totalDisplay.innerText = '0 MAD';
    return;
  }

  let total = 0;
  let curr = AppState.cart[0]?.currency || 'MAD';

  list.innerHTML = AppState.cart.map((item, idx) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    curr = item.currency;

    return `
      <div class="cart-item-row">
        <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">${item.price.toLocaleString()} ${item.currency}</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateItemQty(${idx}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="updateItemQty(${idx}, 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (totalDisplay) {
    totalDisplay.innerText = `${total.toLocaleString()} ${curr}`;
  }
}

window.updateItemQty = function(index, delta) {
  if (!AppState.cart[index]) return;
  AppState.cart[index].qty += delta;
  if (AppState.cart[index].qty <= 0) {
    AppState.cart.splice(index, 1);
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();
};

function openCheckoutModal() {
  if (AppState.cart.length === 0) {
    showToast('Votre panier est vide.', 'error');
    return;
  }

  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const curr = AppState.cart[0]?.currency || 'MAD';
  const totalEl = document.getElementById('checkoutTotalAmount');
  if (totalEl) totalEl.innerText = `${total.toLocaleString()} ${curr}`;

  const isCasa = AppState.currentLocation === 'casablanca';
  const cmiOption = document.getElementById('payOptionCMI');
  const waveOption = document.getElementById('payOptionWave');
  if (cmiOption) cmiOption.style.display = isCasa ? 'flex' : 'none';
  if (waveOption) waveOption.style.display = isCasa ? 'none' : 'flex';

  modal.classList.add('open');
}

window.closeCheckoutModal = function() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
};

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const city = document.getElementById('checkoutCity').value.trim();
  const paymentMethod = document.querySelector('input[name="checkoutPayment"]:checked')?.value || 'Cash';

  const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const curr = AppState.cart[0]?.currency || (AppState.currentLocation === 'casablanca' ? 'MAD' : 'FCFA');

  const payload = {
    location_id: AppState.currentLocation,
    customer_name: name,
    customer_phone: phone,
    shipping_address: address,
    city: city,
    payment_method: paymentMethod,
    total_amount: total,
    currency: curr,
    items: AppState.cart
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      AppState.cart = [];
      saveCart();
      updateCartBadge();
      closeCheckoutModal();

      const successModal = document.getElementById('orderSuccessModal');
      const orderCodeEl = document.getElementById('orderSuccessCode');
      if (orderCodeEl) orderCodeEl.innerText = result.order_code;
      if (successModal) successModal.classList.add('open');
    } else {
      showToast(result.error || 'Erreur lors de la commande', 'error');
    }
  } catch (err) {
    console.error('Error placing order:', err);
    showToast('Erreur de connexion', 'error');
  }
}

// ----------------------------------------------------
// JOBS & RECRUITMENT
// ----------------------------------------------------
function renderJobs() {
  const container = document.getElementById('jobsContainer');
  if (!container) return;

  // Setup city filter buttons if not already initialized
  document.querySelectorAll('[data-jobs-city]').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('[data-jobs-city]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      AppState.jobsCityFilter = e.currentTarget.dataset.jobsCity;
      renderJobs();
    };
  });

  const city = AppState.jobsCityFilter || 'all';
  const filtered = AppState.jobs.filter(j => city === 'all' || j.location_id === city);

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Aucune offre d'emploi active pour cette sélection actuellement.</div>`;
    return;
  }

  container.innerHTML = filtered.map(j => {
    const title = currentLang === 'ar' ? (j.title_ar || j.title_fr) : (currentLang === 'en' ? (j.title_en || j.title_fr) : j.title_fr);
    const desc = currentLang === 'ar' ? (j.description_ar || j.description_fr) : (currentLang === 'en' ? (j.description_en || j.description_fr) : j.description_fr);
    const locTag = j.location_id === 'casablanca' ? '🇲🇦 Casablanca Prestige' : '🇨🇮 Abidjan Riviera';
    const jobImg = j.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="job-card" data-job-id="${j.id}">
        <div class="job-card-thumb" style="width: 140px; height: 115px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-subtle);">
          <img src="${jobImg}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div class="job-main-info">
          <div class="job-tags-row">
            <span class="badge-tag badge-gold">${locTag}</span>
            <span class="badge-tag badge-emerald">${j.contract_type}</span>
          </div>
          <h3 class="job-title">${title}</h3>
          <p class="job-description">${desc}</p>
          <div class="job-meta-row">
            <div class="job-meta-item">
              <span>💰 ${getTranslation('jobs_salary')} :</span>
              <strong>${j.salary_range}</strong>
            </div>
            <div class="job-meta-item">
              <span>🎯 ${getTranslation('jobs_experience')} :</span>
              <strong>${j.experience_required}</strong>
            </div>
          </div>
        </div>
        <div class="job-apply-wrap">
          <button class="btn-gold" onclick="openJobApplicationModal(${j.id})">
            ✍️ ${getTranslation('jobs_btn_apply')}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

let activeApplyingJobId = null;

function setupJobApplicationModal() {
  const form = document.getElementById('jobApplicationForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeApplyingJobId) return;

      const name = document.getElementById('candName').value.trim();
      const email = document.getElementById('candEmail').value.trim();
      const phone = document.getElementById('candPhone').value.trim();
      const exp = parseInt(document.getElementById('candExp').value) || 0;
      const specialty = document.getElementById('candSpecialty')?.value || '';
      const portfolio = document.getElementById('candPortfolio').value.trim();
      let cover = document.getElementById('candCover').value.trim();
      if (specialty) {
        cover = `[Spécialité : ${specialty}]\n${cover}`;
      }

      const payload = {
        job_id: activeApplyingJobId,
        candidate_name: name,
        candidate_email: email,
        candidate_phone: phone,
        experience_years: exp,
        portfolio_url: portfolio,
        cover_note: cover
      };

      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          closeJobApplicationModal();
          form.reset();

          // Open Dedicated Application Success Modal with Code!
          const successModal = document.getElementById('applicationSuccessModal');
          const codeEl = document.getElementById('appSuccessCode');
          const msgEl = document.getElementById('appSuccessMessage');
          if (codeEl) codeEl.innerText = result.application_code || `CAND-GC-${result.application_id}`;
          if (msgEl) msgEl.innerText = result.message || "Votre candidature a été transmise avec succès à l'équipe GOORCO.";
          if (successModal) successModal.classList.add('open');

          showToast(getTranslation('app_success_msg'), 'success');
        } else {
          showToast(result.error || 'Erreur lors de la candidature', 'error');
        }
      } catch (err) {
        console.error('Error submitting application:', err);
        showToast('Erreur serveur', 'error');
      }
    });
  }
}

window.openJobApplicationModal = function(jobId) {
  activeApplyingJobId = jobId;
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;

  const title = currentLang === 'ar' ? (job.title_ar || job.title_fr) : (currentLang === 'en' ? (job.title_en || job.title_fr) : job.title_fr);
  const titleEl = document.getElementById('jobModalJobTitle');
  if (titleEl) titleEl.innerText = title;

  const locBadge = document.getElementById('jobModalLocationBadge');
  if (locBadge) locBadge.innerText = job.location_id === 'casablanca' ? '🇲🇦 Casablanca Prestige' : '🇨🇮 Abidjan Riviera';

  const contractBadge = document.getElementById('jobModalContractBadge');
  if (contractBadge) contractBadge.innerText = job.contract_type;

  const salaryDisplay = document.getElementById('jobModalSalaryDisplay');
  if (salaryDisplay) salaryDisplay.innerText = job.salary_range;

  const expDisplay = document.getElementById('jobModalExpDisplay');
  if (expDisplay) expDisplay.innerText = `Expérience : ${job.experience_required}`;

  const modal = document.getElementById('jobApplicationModal');
  if (modal) modal.classList.add('open');
};

window.closeJobApplicationModal = function() {
  const modal = document.getElementById('jobApplicationModal');
  if (modal) modal.classList.remove('open');
};

// ====================================================
// EMPLOYEE / STAFF PORTAL LOGIC & CLIENT SHEET
// ====================================================
function setupStaffPortal() {
  const careersBtn = document.getElementById('subTabCareersBtn');
  const staffBtn = document.getElementById('subTabStaffBtn');
  const careersView = document.getElementById('subViewCareers');
  const staffView = document.getElementById('subViewStaff');

  if (careersBtn && staffBtn) {
    careersBtn.addEventListener('click', () => {
      careersBtn.classList.add('active');
      staffBtn.classList.remove('active');
      if (careersView) careersView.style.display = 'block';
      if (staffView) staffView.style.display = 'none';
      localStorage.setItem('goorco_jobs_subtab', 'careers');
      localStorage.setItem('goorco_active_view', '#jobsSection');
      history.replaceState(null, null, '#jobsSection');
    });

    staffBtn.addEventListener('click', () => {
      staffBtn.classList.add('active');
      careersBtn.classList.remove('active');
      if (careersView) careersView.style.display = 'none';
      if (staffView) staffView.style.display = 'block';
      localStorage.setItem('goorco_jobs_subtab', 'staff');
      localStorage.setItem('goorco_active_view', '#subViewStaff');
      history.replaceState(null, null, '#subViewStaff');
      if (AppState.employee) {
        empShowDashboard();
        renderEmployeeDashboard();
      } else {
        empShowLoginScreen();
      }
    });
  }

  // Filter buttons in schedule sheet
  document.querySelectorAll('[data-emp-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-emp-filter]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      AppState.employeeFilter = e.currentTarget.dataset.empFilter;
      renderEmployeeAppointmentsList();
    });
  });

  // Initial state check: if employee exists, show dashboard, else login screen
  if (AppState.employee) {
    empShowDashboard();
    renderEmployeeDashboard();
  } else {
    empShowLoginScreen();
  }
}

// ─── HELPER: Toggle Login Screen vs Dashboard ────────────────────────────────
function empShowLoginScreen() {
  const login = document.getElementById('empLoginScreen');
  const dash  = document.getElementById('employeeDashboardContainer');
  if (login) login.style.display = 'block';
  if (dash)  dash.style.display  = 'none';
  // Clear inputs
  const idEl  = document.getElementById('empLoginIdentifier');
  const pinEl = document.getElementById('empLoginPin');
  const errEl = document.getElementById('empLoginError');
  if (idEl)  idEl.value = '';
  if (pinEl) pinEl.value = '';
  if (errEl) errEl.style.display = 'none';
}

function empShowDashboard() {
  const login = document.getElementById('empLoginScreen');
  const dash  = document.getElementById('employeeDashboardContainer');
  if (login) login.style.display = 'none';
  if (dash)  dash.style.display  = 'block';
}

window.initDirectStaffView = function() {
  if (AppState.employee) {
    empShowDashboard();
    renderEmployeeDashboard();
  } else {
    empShowLoginScreen();
  }
};

// ─── LOGIN: Match identifier (name / email / phone) + PIN ────────────────────
window.empLoginSubmit = function() {
  const identifier = (document.getElementById('empLoginIdentifier') || {}).value.trim().toLowerCase();
  const pin        = (document.getElementById('empLoginPin') || {}).value.trim();
  const errEl      = document.getElementById('empLoginError');

  if (!identifier || !pin) {
    if (errEl) errEl.style.display = 'block';
    return;
  }

  const providers = AppState.providers || [];
  const match = providers.find(p => {
    const nameMatch  = p.name  && p.name.toLowerCase().includes(identifier);
    const emailMatch = p.email && p.email.toLowerCase() === identifier;
    const phoneMatch = p.phone && p.phone.replace(/\s+/g,'').includes(identifier.replace(/\s+/g,''));
    const pinMatch   = (p.pin_code || '1234') === pin;
    return (nameMatch || emailMatch || phoneMatch) && pinMatch;
  });

  if (!match) {
    if (errEl) errEl.style.display = 'block';
    // Shake animation
    const pinEl = document.getElementById('empLoginPin');
    if (pinEl) { pinEl.style.borderColor = '#dc3545'; setTimeout(() => { pinEl.style.borderColor = ''; }, 1500); }
    return;
  }

  // ✅ Connexion réussie
  if (errEl) errEl.style.display = 'none';
  AppState.employee = match;
  localStorage.setItem('goorco_employee', JSON.stringify(match));
  localStorage.setItem('goorco_portal', 'jobs');
  localStorage.setItem('goorco_jobs_subtab', 'staff');
  localStorage.setItem('goorco_active_view', '#subViewStaff');
  history.replaceState(null, null, '#subViewStaff');

  empShowDashboard();
  renderEmployeeDashboard();
  showToast('Bienvenue ' + match.name + ' ! Votre fiche est chargée.', 'success');
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
window.empLogout = function() {
  AppState.employee = null;
  localStorage.removeItem('goorco_employee');
  localStorage.removeItem('goorco_emp_subtab');
  localStorage.setItem('goorco_active_view', '#subViewStaff');
  history.replaceState(null, null, '#subViewStaff');
  empShowLoginScreen();
  showToast('Déconnexion effectuée.', 'info');
};

// kept for compatibility (called after adding new provider)
window.renderStaffDirectSelector = function() {};

window.selectDirectEmployee = function(providerId) {
  const p = (AppState.providers || []).find(item => item.id === providerId);
  if (!p) return;
  AppState.employee = p;
  localStorage.setItem('goorco_employee', JSON.stringify(p));
  localStorage.setItem('goorco_portal', 'jobs');
  localStorage.setItem('goorco_jobs_subtab', 'staff');
  localStorage.setItem('goorco_active_view', '#subViewStaff');
  history.replaceState(null, null, '#subViewStaff');
  empShowDashboard();
  renderEmployeeDashboard();
};

// ─── AJOUTER UN COLLABORATEUR DEPUIS L'ESPACE EMPLOYÉS ───────────────────────

window.openStaffAddProviderModal = function() {
  // Form is always visible — just scroll to it and focus name field
  const loginScreen = document.getElementById('empLoginScreen');
  if (loginScreen) loginScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => {
    const nameEl = document.getElementById('sap_name');
    if (nameEl) nameEl.focus();
  }, 400);
};

window.closeStaffAddProviderModal = function() {
  // No modal to close — form is always visible
};

// ─── UPLOAD HELPER (shared) ──────────────────────────────────────────────────
async function uploadPhotoToServer(file, statusElId) {
  const statusEl = document.getElementById(statusElId);
  if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = '⏳ Envoi en cours...'; }

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur upload');
    if (statusEl) { statusEl.textContent = '✅ Photo uploadée avec succès !'; statusEl.style.color = 'var(--emerald)'; }
    return data.url; // e.g. /uploads/abc123.jpg
  } catch(err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#ff6b7a'; }
    return null;
  }
}

// Upload pour le formulaire de création (sap_*)
window.sapHandleFileUpload = async function(input) {
  const file = input.files[0];
  if (!file) return;

  // Instant preview with FileReader
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('sap_photo_preview');
    const placeholder = document.getElementById('sap_photo_placeholder');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);

  // Upload to server
  const url = await uploadPhotoToServer(file, 'sap_upload_status');
  if (url) {
    const hidden = document.getElementById('sap_image_url');
    if (hidden) hidden.value = url;
  }
};

// compat stub
window.sapUpdatePhotoPreview = function() {};

window.saveNewStaffProvider = async function() {
  const name = (document.getElementById('sap_name') || {}).value.trim();
  if (!name) { showToast('Le nom est obligatoire.', 'error'); return; }

  const payload = {
    location_id: document.getElementById('sap_location').value,
    name,
    specialty: (document.getElementById('sap_specialty') || {}).value.trim(),
    role_fr:   (document.getElementById('sap_role_fr') || {}).value.trim() || 'Collaborateur',
    role_ar:   '',
    role_en:   (document.getElementById('sap_role_fr') || {}).value.trim() || 'Collaborator',
    category:  (document.getElementById('sap_category') || {}).value,
    phone:     (document.getElementById('sap_phone') || {}).value.trim(),
    email:     (document.getElementById('sap_email') || {}).value.trim(),
    pin_code:  (document.getElementById('sap_pin') || {}).value.trim() || '1234',
    experience_years: parseInt((document.getElementById('sap_experience') || {}).value) || 0,
    image_url: (document.getElementById('sap_image_url') || {}).value.trim(),
    rating: 4.5,
    available: 1,
    fiches_json: '[]'
  };

  try {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    showToast(`✅ ${name} ajouté(e) avec succès ! Connectez-vous avec votre PIN.`, 'success');
    closeStaffAddProviderModal();

    // Reload providers
    const provRes = await fetch('/api/providers');
    const provData = await provRes.json();
    AppState.providers = provData.providers || [];

    // Auto-login the new provider and open profile sub-tab directly
    if (data.id) {
      selectDirectEmployee(data.id);
      if (typeof switchEmployeeSubTab === 'function') {
        switchEmployeeSubTab('profile');
      }
    } else {
      empShowLoginScreen();
    }
  } catch(err) {
    showToast('Erreur : ' + err.message, 'error');
  }
};

function renderEmployeeDashboard() {
  const emp = AppState.employee;
  if (!emp) return;

  const dashContainer = document.getElementById('employeeDashboardContainer');
  if (dashContainer) dashContainer.style.display = 'block';

  // Profile banner info
  const avatarEl = document.getElementById('empProfileAvatar');
  const nameEl = document.getElementById('empProfileName');
  const roleEl = document.getElementById('empProfileRole');
  const locEl = document.getElementById('empProfileLocation');
  const ratingEl = document.getElementById('empProfileRating');

  if (avatarEl) avatarEl.src = emp.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
  if (nameEl) nameEl.innerText = emp.name;
  if (roleEl) {
    const roleText = currentLang === 'ar' ? (emp.role_ar || emp.role_fr) : (currentLang === 'en' ? (emp.role_en || emp.role_fr) : emp.role_fr);
    roleEl.innerText = `${roleText} — ${emp.specialty || ''}`;
  }
  if (locEl) {
    locEl.innerText = emp.location_id === 'casablanca' ? '🇲🇦 Salon Casablanca Prestige' : '🇨🇮 Salon Abidjan Riviera';
  }
  if (ratingEl) {
    ratingEl.innerText = `⭐ ${emp.rating ? Number(emp.rating).toFixed(1) : '4.9'} / 5.0`;
  }

  // Populate personal profile and technical fiches form
  if (typeof populateEmployeeProfileForm === 'function') {
    populateEmployeeProfileForm();
  }

  // Load appointments
  loadEmployeeAppointments();
}

window.loadEmployeeAppointments = async function() {
  if (!AppState.employee) return;
  const empId = AppState.employee.id;

  try {
    const [apptsRes, statsRes] = await Promise.all([
      fetch(`/api/employee/appointments?provider_id=${empId}`),
      fetch(`/api/employee/stats?provider_id=${empId}`)
    ]);

    const apptsData = await apptsRes.json();
    const statsData = await statsRes.json();

    AppState.employeeAppointments = apptsData.appointments || [];

    // Render Stats
    const s = statsData.stats || {};
    const curr = AppState.employee.location_id === 'casablanca' ? 'MAD' : 'FCFA';

    const statToday = document.getElementById('empStatToday');
    const statActive = document.getElementById('empStatActive');
    const statDone = document.getElementById('empStatDone');
    const statRevenue = document.getElementById('empStatRevenue');

    if (statToday) statToday.innerText = s.today_appointments || 0;
    if (statActive) statActive.innerText = s.active_appointments || 0;
    if (statDone) statDone.innerText = s.completed_appointments || 0;
    if (statRevenue) statRevenue.innerText = `${(s.completed_revenue || 0).toLocaleString()} ${curr}`;

    renderEmployeeAppointmentsList();
  } catch (err) {
    console.error('Error loading employee appointments:', err);
  }
};

function renderEmployeeAppointmentsList() {
  const container = document.getElementById('employeeAppointmentsList');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  let list = AppState.employeeAppointments;

  if (AppState.employeeFilter === 'today') {
    list = list.filter(a => a.appointment_date === todayStr);
  } else if (AppState.employeeFilter === 'active') {
    list = list.filter(a => ['confirmed', 'pending', 'in_progress'].includes(a.status));
  } else if (AppState.employeeFilter === 'completed') {
    list = list.filter(a => a.status === 'completed');
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">📅</div>
        <p>${getTranslation('emp_no_appts')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(a => {
    const serviceTitle = currentLang === 'ar' ? (a.service_name_ar || a.service_name) : (currentLang === 'en' ? (a.service_name_en || a.service_name) : a.service_name);
    const cleanPhone = a.customer_phone.replace(/[^0-9]/g, '');
    const isToday = a.appointment_date === todayStr;
    const isProgress = a.status === 'in_progress';

    return `
      <div class="client-appointment-card ${isProgress ? 'in-progress-active' : ''}" id="empApptCard-${a.id}">
        <!-- Col 1: Time & Date -->
        <div class="appt-time-box">
          <div class="appt-time-val">${a.appointment_time}</div>
          <div class="appt-date-val">📅 ${a.appointment_date} ${isToday ? '<strong style="color: var(--emerald);">(Aujourd’hui)</strong>' : ''}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">#${a.booking_code}</div>
        </div>

        <!-- Col 2: Client Details -->
        <div class="appt-client-info">
          <h4>
            👤 ${a.customer_name}
            <span class="badge-tag badge-cyan" style="font-size: 0.7rem;">${a.reminder_channel.toUpperCase()}</span>
          </h4>
          <div class="appt-client-contacts">
            <a href="tel:${a.customer_phone}" class="appt-contact-chip" title="Appeler le client">
              📞 ${a.customer_phone}
            </a>
            <a href="https://wa.me/${cleanPhone}" target="_blank" class="appt-contact-chip" style="color: #25d366;" title="Contacter sur WhatsApp">
              💬 WhatsApp
            </a>
          </div>
          ${a.notes ? `<div style="font-size: 0.82rem; color: var(--gold-light); background: rgba(212, 175, 55, 0.08); padding: 4px 8px; border-radius: 4px; display: inline-block;">📝 Note client: ${a.notes}</div>` : ''}

          <!-- Technical Notes Input by Staff -->
          <div style="margin-top: 8px;">
            <input type="text" class="tech-note-input" id="staffNoteInput-${a.id}" placeholder="Note technique (ex: sabot 1.5, cheveux fins...)" value="${a.staff_notes || ''}">
            <button class="btn-action-icon" style="margin-top: 4px; font-size: 0.75rem; padding: 2px 8px;" onclick="saveStaffTechnicalNote(${a.id})">
              💾 Enregistrer note technique
            </button>
          </div>
        </div>

        <!-- Col 3: Service -->
        <div class="appt-service-info">
          <div class="appt-service-name">${serviceTitle}</div>
          <div class="appt-service-price">${a.price.toLocaleString()} ${a.currency || 'MAD'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">⏱️ ${a.duration_minutes} min</div>
        </div>

        <!-- Col 4: Live Status Dropdown -->
        <div class="appt-status-actions">
          <label style="font-size: 0.75rem; color: var(--text-muted);">État du soin :</label>
          <select class="form-control" style="padding: 6px 10px; font-size: 0.85rem;" onchange="updateEmployeeApptStatus(${a.id}, this.value)">
            <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>${getTranslation('emp_status_confirmed')}</option>
            <option value="in_progress" ${a.status === 'in_progress' ? 'selected' : ''}>${getTranslation('emp_status_in_progress')}</option>
            <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>${getTranslation('emp_status_completed')}</option>
            <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>${getTranslation('emp_status_cancelled')}</option>
          </select>
          <span class="status-badge status-${a.status}">${a.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

window.updateEmployeeApptStatus = async function(apptId, newStatus) {
  try {
    const res = await fetch(`/api/employee/appointments/${apptId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Statut du rendez-vous mis à jour : ${newStatus.toUpperCase()}`, 'success');
      loadEmployeeAppointments();
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur mise à jour statut', 'error');
  }
};

window.saveStaffTechnicalNote = async function(apptId) {
  const input = document.getElementById(`staffNoteInput-${apptId}`);
  if (!input) return;
  const staffNotes = input.value.trim();

  try {
    const res = await fetch(`/api/employee/appointments/${apptId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_notes: staffNotes })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Note technique enregistrée avec succès !', 'success');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur enregistrement note', 'error');
  }
};

// ====================================================
// EMPLOYEE PROFILE & CE QU'IL SAIT FAIRE (GESTION FICHE)
// ====================================================

window.switchEmployeeSubTab = function(tab) {
  const schedView = document.getElementById('empSubViewSchedule');
  const profView = document.getElementById('empSubViewProfile');
  const schedBtn = document.getElementById('empTabScheduleBtn');
  const profBtn = document.getElementById('empTabProfileBtn');

  localStorage.setItem('goorco_emp_subtab', tab);
  if (tab === 'schedule') {
    if (schedView) schedView.style.display = 'block';
    if (profView) profView.style.display = 'none';
    if (schedBtn) schedBtn.classList.add('active');
    if (profBtn) profBtn.classList.remove('active');
    localStorage.setItem('goorco_active_view', '#empSchedule');
    history.replaceState(null, null, '#empSchedule');
  } else if (tab === 'profile') {
    if (schedView) schedView.style.display = 'none';
    if (profView) profView.style.display = 'block';
    if (schedBtn) schedBtn.classList.remove('active');
    if (profBtn) profBtn.classList.add('active');
    localStorage.setItem('goorco_active_view', '#empProfile');
    history.replaceState(null, null, '#empProfile');
    populateEmployeeProfileForm();
  }
};

window.populateEmployeeProfileForm = function() {
  const emp = AppState.employee;
  if (!emp) return;

  const avatarUrlInput = document.getElementById('empFormAvatarUrl');
  const avatarPreview = document.getElementById('empFormAvatarPreview');
  const nameInput = document.getElementById('empFormName');
  const roleInput = document.getElementById('empFormRole');
  const phoneInput = document.getElementById('empFormPhone');
  const emailInput = document.getElementById('empFormEmail');
  const pinInput = document.getElementById('empFormPin');
  const salonNameInput = document.getElementById('empFormSalonName');
  const addressInput = document.getElementById('empFormAddress');
  const specialtyInput = document.getElementById('empFormSpecialty');

  const defaultAvatar = emp.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
  if (avatarUrlInput) avatarUrlInput.value = defaultAvatar;
  if (avatarPreview) avatarPreview.src = defaultAvatar;
  if (nameInput) nameInput.value = emp.name || '';
  if (roleInput) roleInput.value = emp.role_fr || '';
  if (phoneInput) phoneInput.value = emp.phone || '';
  if (emailInput) emailInput.value = emp.email || '';
  if (pinInput) pinInput.value = emp.pin_code || '1234';
  if (salonNameInput) salonNameInput.value = emp.salon_name || (emp.location_id === 'casablanca' ? 'GOORCO Casablanca Prestige' : 'GOORCO Abidjan Riviera');
  if (addressInput) addressInput.value = emp.address || (emp.location_id === 'casablanca' ? "45 Boulevard d'Anfa, Quartier Gauthier, Casablanca" : "Boulevard Latrille, Riviera Bonoumin (Face Glacier), Cocody, Abidjan");
  if (specialtyInput) specialtyInput.value = emp.specialty || '';

  // Parse employee fiches / prestations
  let fiches = [];
  try {
    fiches = typeof emp.fiches_json === 'string' ? JSON.parse(emp.fiches_json) : (emp.fiches_json || []);
  } catch (e) {
    fiches = [];
  }
  AppState.currentEmployeeFiches = Array.isArray(fiches) ? fiches : [];
  renderEmployeeServicesList();
};

window.renderEmployeeServicesList = function() {
  const container = document.getElementById('empServicesListContainer');
  if (!container) return;

  const fiches = AppState.currentEmployeeFiches || [];

  if (fiches.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; background: var(--bg-secondary); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 8px;">✂️</div>
        <p style="margin-bottom: 12px;">Vous n'avez pas encore renseigné vos prestations techniques.</p>
        <button type="button" class="btn-outline-gold" onclick="openAddPrestationModal()" style="font-size: 0.85rem;">
          ➕ Ajouter ma première prestation
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = fiches.map((f, idx) => {
    const images = f.images || [];
    const catLabel = f.category === 'esthetique' ? '✨ Esthétique' : (f.category === 'bien_etre' ? '🌿 Bien-être' : '✂️ Coiffure');

    return `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 18px; transition: var(--transition-fast);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">${f.icon || '✂️'}</span>
            <div>
              <h5 style="font-size: 1.05rem; color: var(--gold-light); margin: 0;">${f.name}</h5>
              <span class="badge-tag badge-gold" style="font-size: 0.75rem; padding: 2px 8px; margin-top: 4px; display: inline-block;">${catLabel}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-outline-gold" style="padding: 4px 10px; font-size: 0.78rem;" onclick="openEditPrestationModal(${idx})">
              ✏️ Modifier
            </button>
            <button type="button" class="btn-outline-gold" style="padding: 4px 10px; font-size: 0.78rem; border-color: #ef4444; color: #ef4444;" onclick="deleteEmpPrestation(${idx})">
              🗑️ Supprimer
            </button>
          </div>
        </div>

        <p style="font-size: 0.86rem; color: var(--text-secondary); margin: 6px 0 10px;">${f.subtitle || 'Prestation sur mesure réalisée selon les règles de l’art.'}</p>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 10px; margin-top: 8px;">
          <div style="font-size: 0.85rem; color: var(--gold-primary);">
            <strong>Tarif affiché :</strong> ${f.price_range_mad || f.price_range || '150 - 250 MAD'} / ${f.price_range_fcfa || '10 000 - 15 000 FCFA'}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">Photos réalisations :</span>
            ${images.map(img => `<img src="${img}" alt="Réalisation" style="width: 44px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-subtle);">`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.openAddPrestationModal = function() {
  const form = document.getElementById('empPrestationModalForm');
  if (form) form.reset();
  document.getElementById('editPrestaIndex').value = '-1';
  document.getElementById('empPrestationModalTitle').textContent = 'Ajouter une Prestation / Réalisation';
  document.getElementById('empPrestaSubmitBtn').textContent = 'Ajouter la Prestation';

  const defaultImg = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80';
  document.getElementById('prestaPriceMad').value = '150 - 250 MAD';
  document.getElementById('prestaPriceFcfa').value = '10 000 - 15 000 FCFA';
  document.getElementById('prestaImages').value = defaultImg;

  document.getElementById('empPrestationModal').classList.add('open');
};

window.openEditPrestationModal = function(index) {
  const fiches = AppState.currentEmployeeFiches || [];
  const f = fiches[index];
  if (!f) return;

  document.getElementById('editPrestaIndex').value = index;
  document.getElementById('prestaCategory').value = f.category || 'coiffure';
  document.getElementById('prestaIcon').value = f.icon || '✂️';
  document.getElementById('prestaName').value = f.name || '';
  document.getElementById('prestaSubtitle').value = f.subtitle || '';
  document.getElementById('prestaPriceMad').value = f.price_range_mad || f.price_range || '150 - 250 MAD';
  document.getElementById('prestaPriceFcfa').value = f.price_range_fcfa || '10 000 - 15 000 FCFA';
  document.getElementById('prestaImages').value = (f.images || []).join(', ');

  document.getElementById('empPrestationModalTitle').textContent = `Modifier : ${f.name}`;
  document.getElementById('empPrestaSubmitBtn').textContent = 'Enregistrer les Modifications';
  document.getElementById('empPrestationModal').classList.add('open');
};

window.closeEmpPrestationModal = function() {
  const modal = document.getElementById('empPrestationModal');
  if (modal) modal.classList.remove('open');
};

window.saveEmpPrestation = function(e) {
  e.preventDefault();
  const index = parseInt(document.getElementById('editPrestaIndex').value);
  const name = document.getElementById('prestaName').value.trim();
  const subtitle = document.getElementById('prestaSubtitle').value.trim();
  const cat = document.getElementById('prestaCategory').value;
  const icon = document.getElementById('prestaIcon').value;
  const priceMad = document.getElementById('prestaPriceMad').value.trim();
  const priceFcfa = document.getElementById('prestaPriceFcfa').value.trim();
  const rawImages = document.getElementById('prestaImages').value.trim();

  const images = rawImages.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  if (images.length === 0) {
    images.push('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80');
  }

  const prestaObj = {
    id: index >= 0 && AppState.currentEmployeeFiches[index] ? AppState.currentEmployeeFiches[index].id : `presta_${Date.now()}`,
    name: name,
    subtitle: subtitle,
    category: cat,
    icon: icon,
    price_range: priceMad,
    price_range_mad: priceMad,
    price_range_fcfa: priceFcfa,
    rating: 5.0,
    reviews_count: 50,
    images: images
  };

  if (!AppState.currentEmployeeFiches) AppState.currentEmployeeFiches = [];

  if (index >= 0) {
    AppState.currentEmployeeFiches[index] = prestaObj;
  } else {
    AppState.currentEmployeeFiches.push(prestaObj);
  }

  closeEmpPrestationModal();
  renderEmployeeServicesList();
  showToast('Prestation enregistrée ! Cliquez sur "Enregistrer et Publier" pour actualiser le Guide Prestataires.', 'info');
};

window.deleteEmpPrestation = function(index) {
  const f = (AppState.currentEmployeeFiches || [])[index];
  const name = f ? f.name : 'cette prestation';
  if (!confirm(`Voulez-vous supprimer "${name}" de vos prestations ?`)) return;

  AppState.currentEmployeeFiches.splice(index, 1);
  renderEmployeeServicesList();
  showToast('Prestation retirée de votre fiche.', 'info');
};

window.saveEmployeeProfile = async function(e) {
  e.preventDefault();
  const emp = AppState.employee;
  if (!emp) {
    showToast('Erreur : aucun collaborateur connecté.', 'error');
    return;
  }

  const payload = {
    provider_id: emp.id,
    id: emp.id,
    name: document.getElementById('empFormName').value.trim(),
    role_fr: document.getElementById('empFormRole').value.trim(),
    phone: document.getElementById('empFormPhone').value.trim(),
    email: document.getElementById('empFormEmail').value.trim(),
    pin_code: document.getElementById('empFormPin').value.trim() || '1234',
    salon_name: document.getElementById('empFormSalonName').value.trim(),
    address: document.getElementById('empFormAddress').value.trim(),
    specialty: document.getElementById('empFormSpecialty').value.trim(),
    image_url: document.getElementById('empFormAvatarUrl').value.trim(),
    fiches_json: AppState.currentEmployeeFiches || []
  };

  try {
    const res = await fetch('/api/employee/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success && result.employee) {
      AppState.employee = result.employee;
      localStorage.setItem('goorco_employee', JSON.stringify(result.employee));

      // Update provider in AppState.providers
      const pIdx = AppState.providers.findIndex(p => p.id === result.employee.id);
      if (pIdx >= 0) {
        AppState.providers[pIdx] = Object.assign({}, AppState.providers[pIdx], result.employee);
      }

      // Update dashboard banner
      const avatarEl = document.getElementById('empProfileAvatar');
      const nameEl = document.getElementById('empProfileName');
      const roleEl = document.getElementById('empProfileRole');
      if (avatarEl) avatarEl.src = result.employee.image_url;
      if (nameEl) nameEl.innerText = result.employee.name;
      if (roleEl) roleEl.innerText = `${result.employee.role_fr} — ${result.employee.specialty || ''}`;

      // Refresh Guide Prestataires so clients see it immediately!
      renderServices();

      showToast('🎉 Votre fiche et vos prestations sont publiées sur le Guide Prestataires !', 'success');
    } else {
      showToast(result.error || 'Erreur lors de l’enregistrement de votre fiche', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur de connexion au serveur', 'error');
  }
};

window.viewMyProfileInGuide = function() {
  const emp = AppState.employee;
  if (!emp) return;

  // Switch to client portal
  if (typeof window.setPortalMode === 'function') {
    window.setPortalMode('client');
  } else {
    const clientBtn = document.getElementById('portalClientBtn');
    if (clientBtn) clientBtn.click();
  }
  localStorage.setItem('goorco_portal', 'client');
  localStorage.setItem('goorco_active_view', '#servicesSection');
  history.replaceState(null, null, '#servicesSection');

  // Set location and active provider
  AppState.currentLocation = emp.location_id;
  document.querySelectorAll('[data-switch-location]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.switchLocation === emp.location_id);
  });
  AppState.activeStarProviderId = emp.id;

  // Re-render services guide
  renderServices();

  // Smooth scroll to services section
  setTimeout(() => {
    const target = document.getElementById('servicesSection');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
    showToast(`Voici votre fiche GOORCO telle que les clients la voient !`, 'info');
  }, 100);
};

// Upload pour le formulaire Ma Fiche Pro (empForm*)
window.empFormHandleFileUpload = async function(input) {
  const file = input.files[0];
  if (!file) return;

  // Instant preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('empFormAvatarPreview');
    if (preview) preview.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Upload to server
  const url = await uploadPhotoToServer(file, 'empFormUploadStatus');
  if (url) {
    const hidden = document.getElementById('empFormAvatarUrl');
    if (hidden) hidden.value = url;
    // Also update the banner avatar
    const bannerAvatar = document.getElementById('empProfileAvatar');
    if (bannerAvatar) bannerAvatar.src = url;
  }
};

// compat stubs
window.updateEmpFormAvatarPreview = function(url) {
  const p = document.getElementById('empFormAvatarPreview');
  if (p && url) p.src = url;
};
window.setEmpAvatarPreset = function(url) {
  const input = document.getElementById('empFormAvatarUrl');
  const preview = document.getElementById('empFormAvatarPreview');
  if (input) input.value = url;
  if (preview) preview.src = url;
};

window.addPrestaPhotoPreset = function(url) {
  const txt = document.getElementById('prestaImages');
  if (!txt) return;
  if (txt.value.trim()) {
    txt.value = txt.value.trim() + ', ' + url;
  } else {
    txt.value = url;
  }
};

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
