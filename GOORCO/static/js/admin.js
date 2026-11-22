/**
 * GOORCO Luxury Hair Salon - Administration Portal Script
 * Full CRUD for Services, Products, Jobs, Bookings, Orders, and Applications
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

const AdminState = {
  currentTab: 'tab-dashboard',
  locationFilter: 'all', // 'all', 'casablanca', or 'cote_divoire'
  stats: {},
  appointments: [],
  services: [],
  products: [],
  orders: [],
  jobs: [],
  applications: [],
  providers: []
};

// ── Admin Authentication System ─────────────────────────────────────────────
function checkAdminAuth() {
  const adminUser = JSON.parse(localStorage.getItem('goorco_admin_user') || 'null');
  const adminToken = localStorage.getItem('goorco_admin_token');
  
  const layout = document.querySelector('.admin-layout');
  const overlay = document.getElementById('adminLoginOverlay');

  if (!adminUser || !adminToken) {
    if (layout) layout.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';
    return false;
  } else {
    if (overlay) overlay.style.display = 'none';
    if (layout) layout.style.display = 'flex';
    const nameEl = document.getElementById('adminUserDisplayName');
    if (nameEl) nameEl.textContent = adminUser.full_name || adminUser.username;
    return true;
  }
}

window.handleAdminLogin = async function(e) {
  if (e) e.preventDefault();
  const alertBox = document.getElementById('adminLoginAlert');
  const btn = document.getElementById('adminLoginBtn');
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) return;

  if (alertBox) alertBox.style.display = 'none';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Connexion en cours...';
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success && data.user) {
      localStorage.setItem('goorco_admin_user', JSON.stringify(data.user));
      localStorage.setItem('goorco_admin_token', data.token);
      checkAdminAuth();
      await refreshAllAdminData();
      showToast('Connexion administrative réussie', 'success');
    } else {
      if (alertBox) {
        alertBox.textContent = data.message || "Identifiant ou mot de passe incorrect.";
        alertBox.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Error logging in as admin:', err);
    if (alertBox) {
      alertBox.textContent = "Erreur de communication avec le serveur.";
      alertBox.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔐 Se connecter à l\'Administration';
    }
  }
};

window.handleAdminLogout = function() {
  if (confirm('Voulez-vous vraiment vous déconnecter de l\'administration ?')) {
    localStorage.removeItem('goorco_admin_user');
    localStorage.removeItem('goorco_admin_token');
    checkAdminAuth();
    showToast('Déconnexion effectuée', 'info');
  }
};

window.toggleAdminPasswordVisibility = function() {
  const input = document.getElementById('adminPassword');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Theme init — sync button active states
  setTheme(localStorage.getItem('goorco_theme') || 'dark');

  const savedLang = localStorage.getItem('goorco_lang') || 'fr';
  setLanguage(savedLang);

  const isAuth = checkAdminAuth();

  setupAdminTabs();
  setupLocationFilter();
  setupServiceModal();
  setupProductModal();
  setupJobModal();
  setupProviderModal();

  if (isAuth) {
    await refreshAllAdminData();
  }
});

function setupAdminTabs() {
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tabId = item.dataset.tab;
      switchAdminTab(tabId);
    });
  });
}

function switchAdminTab(tabId) {
  AdminState.currentTab = tabId;

  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    pane.style.display = (pane.id === tabId) ? 'block' : 'none';
  });

  // Update section title
  const heading = document.getElementById('adminSectionHeading');
  const titles = {
    'tab-dashboard': 'Tableau de Bord Global',
    'tab-appointments': 'Gestion des Rendez-vous Salons',
    'tab-services': 'Prestations & Soins Spécifiques',
    'tab-products': 'Produits E-Commerce & Stocks',
    'tab-orders': 'Commandes de la Boutique',
    'tab-jobs': 'GOORCO Jobs - Offres d’Emploi',
    'tab-applications': 'Candidatures & Recrutements',
    'tab-providers': 'Équipe des Coiffeurs & Barbiers'
  };
  if (heading) heading.innerText = titles[tabId] || 'Administration GOORCO';
}

function setupLocationFilter() {
  const select = document.getElementById('adminLocationFilter');
  if (select) {
    select.addEventListener('change', (e) => {
      AdminState.locationFilter = e.target.value;
      renderAllViews();
    });
  }
}

async function refreshAllAdminData() {
  try {
    const [statsRes, apptsRes, servRes, prodRes, ordRes, jobsRes, appsRes, provRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/appointments'),
      fetch('/api/services'),
      fetch('/api/products'),
      fetch('/api/orders'),
      fetch('/api/jobs'),
      fetch('/api/applications'),
      fetch('/api/providers')
    ]);

    const statsData = await statsRes.json();
    const apptsData = await apptsRes.json();
    const servData = await servRes.json();
    const prodData = await prodRes.json();
    const ordData = await ordRes.json();
    const jobsData = await jobsRes.json();
    const appsData = await appsRes.json();
    const provData = await provRes.json();

    AdminState.stats = statsData.stats || {};
    AdminState.appointments = apptsData.appointments || [];
    AdminState.services = servData.services || [];
    AdminState.products = prodData.products || [];
    AdminState.orders = ordData.orders || [];
    AdminState.jobs = jobsData.jobs || [];
    AdminState.applications = appsData.applications || [];
    AdminState.providers = provData.providers || [];

    renderAllViews();
  } catch (err) {
    console.error('Error fetching admin data:', err);
  }
}

function renderAllViews() {
  renderStats();
  renderAppointments();
  renderServices();
  renderProducts();
  renderOrders();
  renderJobs();
  renderApplications();
  renderProviders();
}

// 1. STATS
function renderStats() {
  const s = AdminState.stats;
  if (!s) return;

  const elTotalAppts = document.getElementById('statTotalAppts');
  const elCasaAppts = document.getElementById('statCasaAppts');
  const elCIAppts = document.getElementById('statCIAppts');
  const elRevMAD = document.getElementById('statRevenueMAD');
  const elRevXOF = document.getElementById('statRevenueXOF');
  const elTotalOrders = document.getElementById('statTotalOrders');
  const elTotalApps = document.getElementById('statTotalApplications');
  const elTotalServs = document.getElementById('statTotalServices');

  if (elTotalAppts) elTotalAppts.innerText = s.total_appointments || 0;
  if (elCasaAppts) elCasaAppts.innerText = s.appointments_casablanca || 0;
  if (elCIAppts) elCIAppts.innerText = s.appointments_cote_divoire || 0;
  if (elRevMAD) elRevMAD.innerText = `${(s.revenue_mad || 0).toLocaleString()} MAD`;
  if (elRevXOF) elRevXOF.innerText = `${(s.revenue_xof || 0).toLocaleString()} FCFA`;
  if (elTotalOrders) elTotalOrders.innerText = s.total_orders || 0;
  if (elTotalApps) elTotalApps.innerText = s.total_applications || 0;
  if (elTotalServs) elTotalServs.innerText = s.total_services || 0;

  // Recent in dashboard
  const dashTbody = document.getElementById('dashboardRecentAppointments');
  if (dashTbody) {
    const list = AdminState.appointments.slice(0, 5);
    dashTbody.innerHTML = list.map(a => `
      <tr>
        <td><strong>${a.booking_code}</strong></td>
        <td>${a.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
        <td>${a.customer_name}</td>
        <td>${a.service_name}</td>
        <td>${a.appointment_date} à ${a.appointment_time}</td>
        <td><span class="badge-tag badge-cyan">${a.reminder_channel.toUpperCase()}</span></td>
        <td><span class="status-badge status-${a.status}">${a.status}</span></td>
      </tr>
    `).join('');
  }
}

// 2. APPOINTMENTS
function renderAppointments() {
  const tbody = document.getElementById('adminAppointmentsTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.appointments.filter(a => loc === 'all' || a.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucun rendez-vous trouvé.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td><strong>${a.booking_code}</strong></td>
      <td>${a.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
      <td><strong>${a.customer_name}</strong></td>
      <td>${a.customer_phone}</td>
      <td>${a.service_name} <div style="font-size: 0.75rem; color: var(--gold-light);">${a.price} ${a.location_id === 'casablanca' ? 'MAD' : 'FCFA'}</div></td>
      <td>${a.provider_name || 'Non assigné'}</td>
      <td>${a.appointment_date}<br><small style="color: var(--text-muted);">${a.appointment_time}</small></td>
      <td><span class="badge-tag badge-cyan">💬 ${a.reminder_channel}</span></td>
      <td>
        <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem;" onchange="updateAppointmentStatus(${a.id}, this.value)">
          <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Confirmé</option>
          <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>En attente</option>
          <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Terminé</option>
          <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Annulé</option>
        </select>
      </td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action-icon" title="Envoyer Rappel WhatsApp/SMS" onclick="sendAppointmentReminder(${a.id})">
            🔔 Rappel
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.updateAppointmentStatus = async function(id, status) {
  try {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Statut du rendez-vous mis à jour !', 'success');
      await refreshAllAdminData();
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur mise à jour statut', 'error');
  }
};

window.sendAppointmentReminder = async function(id) {
  try {
    const res = await fetch(`/api/appointments/${id}/reminder`, {
      method: 'POST'
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast('Erreur envoi rappel', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur réseau', 'error');
  }
};

// 3. SERVICES (CRUD)
function renderServices() {
  const tbody = document.getElementById('adminServicesTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.services.filter(s => loc === 'all' || s.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune prestation trouvée.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const curr = s.location_id === 'casablanca' ? 'MAD' : 'FCFA';
    return `
      <tr>
        <td>
          <img src="${s.image_url}" alt="${s.name_fr}" style="width: 44px; height: 44px; border-radius: var(--radius-sm); object-fit: cover;">
        </td>
        <td>${s.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
        <td><span class="badge-tag badge-gold">${s.category}</span></td>
        <td>
          <strong>${s.name_fr}</strong>
          ${s.name_ar ? `<div style="font-size: 0.8rem; color: var(--text-secondary); direction: rtl;">${s.name_ar}</div>` : ''}
        </td>
        <td><strong style="color: var(--gold-light);">${s.price.toLocaleString()} ${curr}</strong></td>
        <td>${s.duration_minutes} min</td>
        <td>${s.badge ? `<span class="badge-tag badge-emerald">${s.badge}</span>` : '-'}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action-icon" onclick="openEditServiceModal(${s.id})">✏️ Éditer</button>
            <button class="btn-action-icon btn-action-delete" onclick="deleteService(${s.id})">🗑️ Suppr</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupServiceModal() {
  const form = document.getElementById('serviceModalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editServiceId').value;
      const payload = {
        location_id: document.getElementById('serviceLocation').value,
        category: document.getElementById('serviceCategory').value,
        name_fr: document.getElementById('serviceNameFr').value,
        name_ar: document.getElementById('serviceNameAr').value,
        name_en: document.getElementById('serviceNameEn').value,
        price: parseFloat(document.getElementById('servicePrice').value),
        duration_minutes: parseInt(document.getElementById('serviceDuration').value),
        badge: document.getElementById('serviceBadge').value,
        image_url: document.getElementById('serviceImageUrl').value || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
        description_fr: document.getElementById('serviceDescFr').value
      };

      const url = id ? `/api/services/${id}` : '/api/services';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeServiceModal();
          showToast(id ? 'Prestation modifiée avec succès !' : 'Nouvelle prestation ajoutée !', 'success');
          await refreshAllAdminData();
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur lors de l’enregistrement de la prestation', 'error');
      }
    });
  }
}

window.openAddServiceModal = function() {
  document.getElementById('serviceModalForm').reset();
  document.getElementById('editServiceId').value = '';
  document.getElementById('serviceModalTitle').innerText = 'Ajouter une Prestation';
  document.getElementById('serviceModal').classList.add('open');
};

window.openEditServiceModal = function(id) {
  const s = AdminState.services.find(item => item.id === id);
  if (!s) return;

  document.getElementById('editServiceId').value = s.id;
  document.getElementById('serviceLocation').value = s.location_id;
  document.getElementById('serviceCategory').value = s.category;
  document.getElementById('serviceNameFr').value = s.name_fr;
  document.getElementById('serviceNameAr').value = s.name_ar || '';
  document.getElementById('serviceNameEn').value = s.name_en || '';
  document.getElementById('servicePrice').value = s.price;
  document.getElementById('serviceDuration').value = s.duration_minutes;
  document.getElementById('serviceBadge').value = s.badge || '';
  document.getElementById('serviceImageUrl').value = s.image_url || '';
  document.getElementById('serviceDescFr').value = s.description_fr || '';

  document.getElementById('serviceModalTitle').innerText = 'Modifier la Prestation';
  document.getElementById('serviceModal').classList.add('open');
};

window.closeServiceModal = function() {
  document.getElementById('serviceModal').classList.remove('open');
};

window.deleteService = async function(id) {
  if (!confirm('Êtes-vous certain de vouloir supprimer cette prestation ?')) return;

  try {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Prestation supprimée avec succès', 'success');
      await refreshAllAdminData();
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur suppression', 'error');
  }
};

// 4. PRODUCTS (CRUD)
function renderProducts() {
  const tbody = document.getElementById('adminProductsTbody');
  if (!tbody) return;

  if (AdminState.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucun produit dans la boutique.</td></tr>`;
    return;
  }

  tbody.innerHTML = AdminState.products.map(p => `
    <tr>
      <td>
        <img src="${p.image_url}" alt="${p.name_fr}" style="width: 44px; height: 44px; border-radius: var(--radius-sm); object-fit: cover;">
      </td>
      <td><span class="badge-tag badge-cyan">${p.category}</span></td>
      <td>
        <strong>${p.name_fr}</strong>
        ${p.name_ar ? `<div style="font-size: 0.8rem; color: var(--text-secondary); direction: rtl;">${p.name_ar}</div>` : ''}
      </td>
      <td><strong style="color: var(--gold-light);">${p.price_mad} MAD</strong></td>
      <td><strong style="color: var(--emerald);">${p.price_xof.toLocaleString()} FCFA</strong></td>
      <td>
        <span class="badge-tag ${p.stock > 10 ? 'badge-emerald' : 'badge-gold'}">${p.stock} unités</span>
      </td>
      <td>${p.badge ? `<span class="badge-tag badge-cyan">${p.badge}</span>` : '-'}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action-icon" onclick="openEditProductModal(${p.id})">✏️ Éditer</button>
          <button class="btn-action-icon btn-action-delete" onclick="deleteProduct(${p.id})">🗑️ Suppr</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupProductModal() {
  const form = document.getElementById('productModalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editProductId').value;
      const payload = {
        category: document.getElementById('prodCategory').value,
        name_fr: document.getElementById('prodNameFr').value,
        name_ar: document.getElementById('prodNameAr').value,
        name_en: document.getElementById('prodNameEn').value,
        price_mad: parseFloat(document.getElementById('prodPriceMAD').value),
        price_xof: parseFloat(document.getElementById('prodPriceXOF').value),
        stock: parseInt(document.getElementById('prodStock').value),
        badge: document.getElementById('prodBadge').value,
        image_url: document.getElementById('prodImageUrl').value || 'https://images.unsplash.com/photo-1608248597359-009b0b1d3d66?auto=format&fit=crop&w=500&q=80',
        description_fr: document.getElementById('prodDescFr').value
      };

      const url = id ? `/api/products/${id}` : '/api/products';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeProductModal();
          showToast(id ? 'Produit modifié avec succès !' : 'Nouveau produit ajouté !', 'success');
          await refreshAllAdminData();
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur enregistrement produit', 'error');
      }
    });
  }
}

window.openAddProductModal = function() {
  document.getElementById('productModalForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('productModalTitle').innerText = 'Ajouter un Produit';
  document.getElementById('productModal').classList.add('open');
};

window.openEditProductModal = function(id) {
  const p = AdminState.products.find(item => item.id === id);
  if (!p) return;

  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodNameFr').value = p.name_fr;
  document.getElementById('prodNameAr').value = p.name_ar || '';
  document.getElementById('prodNameEn').value = p.name_en || '';
  document.getElementById('prodPriceMAD').value = p.price_mad;
  document.getElementById('prodPriceXOF').value = p.price_xof;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodImageUrl').value = p.image_url || '';
  document.getElementById('prodDescFr').value = p.description_fr || '';

  document.getElementById('productModalTitle').innerText = 'Modifier le Produit';
  document.getElementById('productModal').classList.add('open');
};

window.closeProductModal = function() {
  document.getElementById('productModal').classList.remove('open');
};

window.deleteProduct = async function(id) {
  if (!confirm('Supprimer ce produit de la boutique ?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Produit supprimé', 'success');
      await refreshAllAdminData();
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur suppression', 'error');
  }
};

// 5. ORDERS
function renderOrders() {
  const tbody = document.getElementById('adminOrdersTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.orders.filter(o => loc === 'all' || o.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune commande trouvée.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const itemsSummary = o.items.map(it => `${it.qty}x ${it.name}`).join(', ');
    return `
      <tr>
        <td><strong>${o.order_code}</strong></td>
        <td><small>${o.created_at}</small></td>
        <td><strong>${o.customer_name}</strong></td>
        <td>${o.customer_phone}</td>
        <td>${o.shipping_address}<br><small style="color: var(--text-muted);">${o.city}</small></td>
        <td><span class="badge-tag badge-gold">${o.payment_method}</span></td>
        <td><small>${itemsSummary}</small></td>
        <td><strong style="color: var(--gold-light);">${o.total_amount.toLocaleString()} ${o.currency}</strong></td>
        <td>
          <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem;" onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>En attente</option>
            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>En cours</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Livrée</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
          </select>
        </td>
        <td>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </td>
      </tr>
    `;
  }).join('');
}

window.updateOrderStatus = async function(id, status) {
  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Statut de commande mis à jour !', 'success');
      await refreshAllAdminData();
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur statut commande', 'error');
  }
};

// 6. JOBS (OFFRES D'EMPLOI & ANNONCES)
function renderJobs() {
  const tbody = document.getElementById('adminJobsTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.jobs.filter(j => loc === 'all' || j.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune offre d'emploi active.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(j => `
    <tr>
      <td>
        <img src="${j.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80'}" alt="${j.title_fr}" style="width: 54px; height: 38px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-subtle);">
      </td>
      <td>${j.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
      <td>
        <strong>${j.title_fr}</strong>
        ${j.title_ar ? `<div style="font-size: 0.8rem; color: var(--text-secondary); direction: rtl;">${j.title_ar}</div>` : ''}
      </td>
      <td><span class="badge-tag badge-emerald">${j.contract_type}</span></td>
      <td><strong>${j.salary_range}</strong></td>
      <td>${j.experience_required}</td>
      <td>
        <span class="status-badge ${j.is_active ? 'status-confirmed' : 'status-cancelled'}">
          ${j.is_active ? 'Active' : 'Clôturée'}
        </span>
      </td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action-icon" onclick="openEditJobModal(${j.id})">✏️ Éditer</button>
          <button class="btn-action-icon btn-action-delete" onclick="deleteJob(${j.id})">🗑️ Suppr</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupJobModal() {
  const form = document.getElementById('jobModalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editJobId').value;
      const payload = {
        location_id: document.getElementById('jobLocation').value,
        contract_type: document.getElementById('jobContract').value,
        title_fr: document.getElementById('jobTitleFr').value,
        title_ar: document.getElementById('jobTitleAr').value,
        salary_range: document.getElementById('jobSalary').value,
        experience_required: document.getElementById('jobExp').value,
        description_fr: document.getElementById('jobDescFr').value,
        requirements_fr: document.getElementById('jobReqFr')?.value || '',
        is_active: parseInt(document.getElementById('jobActive')?.value || '1'),
        image_url: document.getElementById('jobImageUrl')?.value.trim() || ''
      };

      const url = id ? `/api/jobs/${id}` : '/api/jobs';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeJobModal();
          showToast(id ? 'Offre / Annonce modifiée avec succès !' : 'Nouvelle offre / annonce publiée avec succès !', 'success');
          await refreshAllAdminData();
        } else {
          showToast(result.error || 'Erreur lors de l’enregistrement de l’offre', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur enregistrement offre', 'error');
      }
    });
  }
}

window.openAddJobModal = function() {
  document.getElementById('jobModalForm').reset();
  document.getElementById('editJobId').value = '';
  document.getElementById('jobModalTitle').textContent = 'Publier une Offre / Annonce d’Emploi';
  document.getElementById('jobModalSubmitBtn').textContent = 'Publier l’Offre';
  if (document.getElementById('jobActive')) document.getElementById('jobActive').value = '1';
  const defaultImg = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';
  if (document.getElementById('jobImageUrl')) document.getElementById('jobImageUrl').value = defaultImg;
  if (document.getElementById('jobImagePreview')) document.getElementById('jobImagePreview').src = defaultImg;
  document.getElementById('jobModal').classList.add('open');
};

window.openEditJobModal = function(id) {
  const j = AdminState.jobs.find(item => item.id === id);
  if (!j) return;

  document.getElementById('editJobId').value = j.id;
  document.getElementById('jobLocation').value = j.location_id;
  document.getElementById('jobContract').value = j.contract_type;
  document.getElementById('jobTitleFr').value = j.title_fr || '';
  document.getElementById('jobTitleAr').value = j.title_ar || '';
  document.getElementById('jobSalary').value = j.salary_range || '';
  document.getElementById('jobExp').value = j.experience_required || '';
  document.getElementById('jobDescFr').value = j.description_fr || '';
  if (document.getElementById('jobReqFr')) {
    document.getElementById('jobReqFr').value = j.requirements_fr || '';
  }
  if (document.getElementById('jobActive')) {
    document.getElementById('jobActive').value = (j.is_active !== undefined) ? String(j.is_active) : '1';
  }

  const img = j.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';
  if (document.getElementById('jobImageUrl')) document.getElementById('jobImageUrl').value = j.image_url || '';
  if (document.getElementById('jobImagePreview')) document.getElementById('jobImagePreview').src = img;

  document.getElementById('jobModalTitle').textContent = 'Modifier l’Offre / Annonce d’Emploi';
  document.getElementById('jobModalSubmitBtn').textContent = 'Enregistrer les Modifications';
  document.getElementById('jobModal').classList.add('open');
};

window.closeJobModal = function() {
  document.getElementById('jobModal').classList.remove('open');
};

window.deleteJob = async function(id) {
  if (!confirm('Voulez-vous vraiment supprimer ou clôturer cette offre d’emploi ?')) return;
  try {
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Offre / Annonce supprimée', 'success');
      await refreshAllAdminData();
    } else {
      showToast('Erreur lors de la suppression', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur suppression offre', 'error');
  }
};

window.updateJobImagePreview = function(url) {
  const p = document.getElementById('jobImagePreview');
  if (p && url) p.src = url;
};

window.setJobImagePreset = function(url) {
  const input = document.getElementById('jobImageUrl');
  const preview = document.getElementById('jobImagePreview');
  if (input) input.value = url;
  if (preview) preview.src = url;
};

// 7. APPLICATIONS
function renderApplications() {
  const tbody = document.getElementById('adminApplicationsTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.applications.filter(a => loc === 'all' || a.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune candidature reçue pour l'instant.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(app => `
    <tr>
      <td><small>${app.applied_at}</small></td>
      <td><strong>${app.job_title}</strong></td>
      <td>${app.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
      <td><strong>${app.candidate_name}</strong></td>
      <td>
        <div>📞 ${app.candidate_phone}</div>
        <div>✉️ ${app.candidate_email}</div>
      </td>
      <td><span class="badge-tag badge-gold">${app.experience_years} ans</span></td>
      <td>
        ${app.portfolio_url ? `<a href="https://${app.portfolio_url.replace(/^https?:\/\//, '')}" target="_blank" style="color: var(--cyan); text-decoration: underline;">🔗 Voir portfolio</a>` : '-'}
      </td>
      <td><small style="color: var(--text-secondary); max-width: 250px; display: block;">${app.cover_note || '-'}</small></td>
      <td>
        <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem;" onchange="updateApplicationStatus(${app.id}, this.value)">
          <option value="new" ${app.status === 'new' ? 'selected' : ''}>Nouveau</option>
          <option value="reviewed" ${app.status === 'reviewed' ? 'selected' : ''}>Examiné</option>
          <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Entretien fixé</option>
          <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Recruté</option>
          <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Refusé</option>
        </select>
      </td>
      <td>
        <span class="status-badge status-${app.status}">${app.status}</span>
      </td>
    </tr>
  `).join('');
}

window.updateApplicationStatus = async function(id, status) {
  try {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Statut de candidature mis à jour !', 'success');
      await refreshAllAdminData();
    } else {
      showToast('Erreur statut candidature', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur statut candidature', 'error');
  }
};

// 8. PROVIDERS & STAFF (ESPACE ÉQUIPE & COLLABORATEURS)
function renderProviders() {
  const tbody = document.getElementById('adminProvidersTbody');
  if (!tbody) return;

  const loc = AdminState.locationFilter;
  const filtered = AdminState.providers.filter(p => loc === 'all' || p.location_id === loc);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucun collaborateur trouvé pour ce salon.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'}" alt="${p.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-primary);">
      </td>
      <td>${p.location_id === 'casablanca' ? '🇲🇦 Casablanca' : '🇨🇮 Abidjan'}</td>
      <td>
        <strong>${p.name}</strong>
        <div style="font-size: 0.8rem; color: var(--gold-light);">${p.role_fr || ''}</div>
      </td>
      <td>
        <div style="font-size: 0.82rem; max-width: 220px; color: var(--text-secondary);">${p.specialty || '-'}</div>
      </td>
      <td>
        <div style="font-size: 0.82rem;">📞 ${p.phone || '-'}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">✉️ ${p.email || '-'}</div>
      </td>
      <td>
        <span class="badge-tag badge-cyan" style="font-family: monospace;">PIN: ${p.pin_code || '1234'}</span>
      </td>
      <td>⭐ ${p.rating ? Number(p.rating).toFixed(1) : '4.9'} / 5.0</td>
      <td>
        <span class="status-badge ${p.available ? 'status-confirmed' : 'status-cancelled'}">
          ${p.available ? 'En poste' : 'Indisponible'}
        </span>
      </td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action-icon" onclick="openEditProviderModal(${p.id})">✏️ Éditer</button>
          <button class="btn-action-icon btn-action-delete" onclick="deleteProvider(${p.id})">🗑️ Suppr</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupProviderModal() {
  const form = document.getElementById('providerModalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editProviderId').value;
      const payload = {
        location_id: document.getElementById('provLocation').value,
        category: document.getElementById('provCategory').value,
        name: document.getElementById('provName').value.trim(),
        role_fr: document.getElementById('provRoleFr').value.trim(),
        role_ar: document.getElementById('provRoleAr')?.value.trim() || '',
        role_en: document.getElementById('provRoleEn')?.value.trim() || '',
        specialty: document.getElementById('provSpecialty').value.trim(),
        phone: document.getElementById('provPhone').value.trim(),
        email: document.getElementById('provEmail').value.trim(),
        pin_code: document.getElementById('provPin').value.trim() || '1234',
        experience_years: parseInt(document.getElementById('provExp')?.value || '5'),
        rating: parseFloat(document.getElementById('provRating')?.value || '4.9'),
        available: parseInt(document.getElementById('provAvailable')?.value || '1'),
        salon_name: document.getElementById('provSalonName')?.value.trim() || '',
        address: document.getElementById('provAddress')?.value.trim() || '',
        image_url: document.getElementById('provImageUrl').value.trim(),
        fiches_json: document.getElementById('provFichesJson')?.value.trim() || null
      };

      const url = id ? `/api/providers/${id}` : '/api/providers';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeProviderModal();
          showToast(id ? 'Collaborateur modifié avec succès !' : 'Nouveau collaborateur ajouté à l’équipe !', 'success');
          await refreshAllAdminData();
        } else {
          showToast(result.error || 'Erreur enregistrement collaborateur', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Erreur enregistrement collaborateur', 'error');
      }
    });
  }
}

window.openAddProviderModal = function() {
  document.getElementById('providerModalForm').reset();
  document.getElementById('editProviderId').value = '';
  document.getElementById('providerModalTitle').textContent = 'Ajouter un Collaborateur à l’Équipe';
  document.getElementById('providerModalSubmitBtn').textContent = 'Enregistrer le Collaborateur';
  const defaultImg = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
  document.getElementById('provImageUrl').value = defaultImg;
  document.getElementById('provImagePreview').src = defaultImg;
  document.getElementById('provPin').value = '1234';
  document.getElementById('provRating').value = '4.9';
  document.getElementById('provExp').value = '8';
  document.getElementById('provAvailable').value = '1';
  document.getElementById('providerModal').classList.add('open');
};

window.openEditProviderModal = function(id) {
  const p = AdminState.providers.find(item => item.id === id);
  if (!p) return;

  document.getElementById('editProviderId').value = p.id;
  document.getElementById('provLocation').value = p.location_id;
  document.getElementById('provCategory').value = p.category || 'coiffure';
  document.getElementById('provName').value = p.name || '';
  document.getElementById('provRoleFr').value = p.role_fr || '';
  document.getElementById('provRoleAr').value = p.role_ar || '';
  document.getElementById('provRoleEn').value = p.role_en || '';
  document.getElementById('provSpecialty').value = p.specialty || '';
  document.getElementById('provPhone').value = p.phone || '';
  document.getElementById('provEmail').value = p.email || '';
  document.getElementById('provPin').value = p.pin_code || '1234';
  document.getElementById('provExp').value = p.experience_years || 5;
  document.getElementById('provRating').value = p.rating || 4.9;
  document.getElementById('provAvailable').value = (p.available !== undefined) ? String(p.available) : '1';
  document.getElementById('provSalonName').value = p.salon_name || '';
  document.getElementById('provAddress').value = p.address || '';

  const img = p.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
  document.getElementById('provImageUrl').value = img;
  document.getElementById('provImagePreview').src = img;

  document.getElementById('provFichesJson').value = typeof p.fiches_json === 'string' ? p.fiches_json : (p.fiches_json ? JSON.stringify(p.fiches_json, null, 2) : '');

  document.getElementById('providerModalTitle').textContent = `Modifier ${p.name}`;
  document.getElementById('providerModalSubmitBtn').textContent = 'Enregistrer les Modifications';
  document.getElementById('providerModal').classList.add('open');
};

window.closeProviderModal = function() {
  document.getElementById('providerModal').classList.remove('open');
};

window.deleteProvider = async function(id) {
  const p = AdminState.providers.find(item => item.id === id);
  const name = p ? p.name : 'ce membre';
  if (!confirm(`Voulez-vous vraiment retirer ${name} de l’équipe GOORCO ?`)) return;
  try {
    const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('Collaborateur retiré de l’équipe', 'success');
      await refreshAllAdminData();
    } else {
      showToast('Erreur lors de la suppression', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur suppression collaborateur', 'error');
  }
};

window.updateProvImagePreview = function(url) {
  const p = document.getElementById('provImagePreview');
  if (p && url) p.src = url;
};

window.setProvImagePreset = function(url) {
  const input = document.getElementById('provImageUrl');
  const preview = document.getElementById('provImagePreview');
  if (input) input.value = url;
  if (preview) preview.src = url;
};

// Re-render when language changes
window.addEventListener('languageChanged', () => {
  renderAllViews();
});

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
