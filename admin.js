// N Pay Admin CRM Logic
const HARDCODED_FALLBACK = 'http://10.189.223.94:5000';

function resolveServerHost() {
  const saved = localStorage.getItem('npay_server_url');
  if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
  
  if (window.NPAY_CONFIG && window.NPAY_CONFIG.SERVER_URL && window.NPAY_CONFIG.SERVER_URL.trim()) {
    return window.NPAY_CONFIG.SERVER_URL.trim().replace(/\/+$/, '');
  }

  if (window.location.protocol.startsWith('http') && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }

  return HARDCODED_FALLBACK;
}

let CURRENT_SERVER_HOST = resolveServerHost();
let API_BASE = (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && !window.location.port))
  ? `${CURRENT_SERVER_HOST}/api/admin`
  : '/api/admin';

let allCustomers = [];
let allTransactions = [];
let systemSettings = {};
let selectedCustomerForLimits = null;

// Elements
const adminLoginModal = document.getElementById('adminLoginModal');
const crmLayout = document.getElementById('crmLayout');
const inputAdminPin = document.getElementById('inputAdminPin');
const btnAdminLogin = document.getElementById('btnAdminLogin');
const btnAdminLogout = document.getElementById('btnAdminLogout');
const btnRefreshData = document.getElementById('btnRefreshData');

// Metrics elements
const statTotalUsers = document.getElementById('statTotalUsers');
const statActiveUsers = document.getElementById('statActiveUsers');
const statSubUsers = document.getElementById('statSubUsers');
const statInrLiability = document.getElementById('statInrLiability');
const statUsdtLiability = document.getElementById('statUsdtLiability');
const statFeesCollected = document.getElementById('statFeesCollected');
const statSubRevenue = document.getElementById('statSubRevenue');
const statAvailableCommission = document.getElementById('statAvailableCommission');
const statWithdrawnCommission = document.getElementById('statWithdrawnCommission');
const btnOpenCommissionWithdraw = document.getElementById('btnOpenCommissionWithdraw');
const modalCommissionWithdraw = document.getElementById('modalCommissionWithdraw');
const btnCloseCommissionWithdraw = document.getElementById('btnCloseCommissionWithdraw');
const modalCommissionAvailableDisplay = document.getElementById('modalCommissionAvailableDisplay');
const inputCommissionUpi = document.getElementById('inputCommissionUpi');
const inputCommissionAmount = document.getElementById('inputCommissionAmount');
const inputCommissionNote = document.getElementById('inputCommissionNote');
const btnExecuteCommissionWithdraw = document.getElementById('btnExecuteCommissionWithdraw');

// Views
const customersView = document.getElementById('customersView');
const ledgerView = document.getElementById('ledgerView');
const monetizationView = document.getElementById('monetizationView');
const settingsView = document.getElementById('settingsView');
const navTabs = document.querySelectorAll('.navTab');

// Customer Table
const customerTableBody = document.getElementById('customerTableBody');
const inputSearchCustomer = document.getElementById('inputSearchCustomer');

// Ledger Table
const ledgerTableBody = document.getElementById('ledgerTableBody');
const filterTxnType = document.getElementById('filterTxnType');

// Monetization Controls
const configFeeType = document.getElementById('configFeeType');
const boxFlatFee = document.getElementById('boxFlatFee');
const boxPercentFee = document.getElementById('boxPercentFee');
const configFeeFlatAmount = document.getElementById('configFeeFlatAmount');
const configFeePercent = document.getElementById('configFeePercent');
const configFeeAppliedOn = document.getElementById('configFeeAppliedOn');
const configSubEnabled = document.getElementById('configSubEnabled');
const configSubPlanName = document.getElementById('configSubPlanName');
const configSubFee = document.getElementById('configSubFee');
const configSubDays = document.getElementById('configSubDays');
const configSubZeroFee = document.getElementById('configSubZeroFee');
const btnSaveMonetization = document.getElementById('btnSaveMonetization');

// Settings Controls
const settingProvider = document.getElementById('settingProvider');
const settingMerchantUpi = document.getElementById('settingMerchantUpi');
const settingMerchantName = document.getElementById('settingMerchantName');
const settingMinDeposit = document.getElementById('settingMinDeposit');
const settingMaxDeposit = document.getElementById('settingMaxDeposit');
const settingMinTransfer = document.getElementById('settingMinTransfer');
const settingMaxTransfer = document.getElementById('settingMaxTransfer');
const settingFast2smsApiKey = document.getElementById('settingFast2smsApiKey');
const btnSaveSettings = document.getElementById('btnSaveSettings');

// Support Transfer Modal Controls
const modalSupportTransfer = document.getElementById('modalSupportTransfer');
const btnCloseSupportModal = document.getElementById('btnCloseSupportModal');
const btnOpenSupportTransferDirect = document.getElementById('btnOpenSupportTransferDirect');
const btnHeaderSupportTransfer = document.getElementById('btnHeaderSupportTransfer');
const selectSupportFromUser = document.getElementById('selectSupportFromUser');
const selectSupportCurrency = document.getElementById('selectSupportCurrency');
const supportCurrencySymbolLabel = document.getElementById('supportCurrencySymbolLabel');
const supportFromUserBalancePills = document.getElementById('supportFromUserBalancePills');
const inputSupportToTarget = document.getElementById('inputSupportToTarget');
const inputSupportAmount = document.getElementById('inputSupportAmount');
const inputSupportReason = document.getElementById('inputSupportReason');
const btnExecuteSupportTransfer = document.getElementById('btnExecuteSupportTransfer');

// Limits Modal Controls
const modalCustomerLimits = document.getElementById('modalCustomerLimits');
const btnCloseLimitsModal = document.getElementById('btnCloseLimitsModal');
const limitModalCustomerPhone = document.getElementById('limitModalCustomerPhone');
const inputLimitMinDeposit = document.getElementById('inputLimitMinDeposit');
const inputLimitMaxDeposit = document.getElementById('inputLimitMaxDeposit');
const inputLimitMinTransfer = document.getElementById('inputLimitMinTransfer');
const inputLimitMaxTransfer = document.getElementById('inputLimitMaxTransfer');
const btnSaveCustomerLimits = document.getElementById('btnSaveCustomerLimits');

function getAdminToken() {
  return localStorage.getItem('npay_admin_token');
}

function setAdminToken(token) {
  localStorage.setItem('npay_admin_token', token);
}

function removeAdminToken() {
  localStorage.removeItem('npay_admin_token');
}

async function adminApiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAdminToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, options);
  } catch (netErr) {
    throw new Error(`Server se connection nahi ho paya (${API_BASE}).`);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Invalid server response');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Admin request failed');
  }
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = getAdminToken();
  if (token) {
    try {
      await loadAllDashboardData();
      showDashboard();
    } catch (err) {
      console.warn('Admin token invalid or expired:', err);
      removeAdminToken();
      showLogin();
    }
  } else {
    showLogin();
  }
  setupAdminEvents();
});

function showLogin() {
  adminLoginModal.classList.remove('hidden');
  crmLayout.classList.add('hidden');
}

function showDashboard() {
  adminLoginModal.classList.add('hidden');
  crmLayout.classList.remove('hidden');
}

async function loadAllDashboardData() {
  await Promise.all([
    loadMetrics(),
    loadCustomers(),
    loadLedger(),
    loadSettings()
  ]);
}

// Load Metrics
async function loadMetrics() {
  try {
    const metrics = await adminApiCall('/metrics');
    statTotalUsers.textContent = metrics.totalUsers;
    statActiveUsers.textContent = metrics.activeUsers;
    statSubUsers.textContent = metrics.subscribedUsers || 0;
    statInrLiability.textContent = Number(metrics.totalInrLiability || 0).toFixed(2);
    statUsdtLiability.textContent = Number(metrics.totalUsdtLiability || 0).toFixed(2);
    statFeesCollected.textContent = Number(metrics.totalFeesCollected || 0).toFixed(2);
    statSubRevenue.textContent = Number(metrics.totalSubscriptionRevenue || 0).toFixed(2);
    if (statAvailableCommission) statAvailableCommission.textContent = Number(metrics.availableCommission || 0).toFixed(2);
    if (statWithdrawnCommission) statWithdrawnCommission.textContent = Number(metrics.totalCommissionWithdrawn || 0).toFixed(2);
    if (modalCommissionAvailableDisplay) modalCommissionAvailableDisplay.textContent = Number(metrics.availableCommission || 0).toFixed(2);
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

// Load Customers
async function loadCustomers() {
  try {
    const res = await adminApiCall('/customers');
    allCustomers = res.customers || [];
    renderCustomersTable(allCustomers);
    populateSupportSelect();
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
}

function renderCustomersTable(customers) {
  if (!customers || customers.length === 0) {
    customerTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-500">
          Abhi tak koi customer registered nahi hai.
        </td>
      </tr>
    `;
    return;
  }

  customerTableBody.innerHTML = customers.map(c => {
    const isActive = c.status === 'ACTIVE';
    const statusBadge = isActive
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">FROZEN</span>`;

    const inrBal = c.wallet?.INR ?? c.balance ?? 0;
    const usdtBal = c.wallet?.USDT ?? 0;

    const minDep = c.limits?.minDeposit || 1;
    const maxDep = c.limits?.maxDeposit || 500000;
    const minTrx = c.limits?.minTransfer || 1;
    const maxTrx = c.limits?.maxTransfer || 500000;

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-4 font-semibold text-white">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-[10px]">
              NP
            </div>
            <div>
              <div class="font-bold">${c.name || 'User'}</div>
              <div class="text-[10px] text-slate-500 font-mono">${c.id}</div>
            </div>
          </div>
        </td>
        <td class="p-4 font-mono font-medium text-slate-200">
          <div>+91 ${c.phone}</div>
          <div class="text-[10px] text-emerald-400 font-mono">${c.virtualUpi}</div>
        </td>
        <td class="p-4 font-extrabold text-white text-sm">₹${Number(inrBal).toFixed(2)}</td>
        <td class="p-4 font-extrabold text-teal-400 text-sm font-mono">₮${Number(usdtBal).toFixed(2)}</td>
        <td class="p-4">
          <div class="text-[10px] font-mono text-slate-300">Dep: ₹${minDep} - ₹${(maxDep/1000).toFixed(0)}k</div>
          <div class="text-[10px] font-mono text-slate-400">Trx: ₹${minTrx} - ₹${(maxTrx/1000).toFixed(0)}k</div>
        </td>
        <td class="p-4">${statusBadge}</td>
        <td class="p-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="openSupportTransferFor('${c.id}')" class="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-[11px] font-bold border border-cyan-500/30 transition">
            ⚡ Transfer
          </button>
          <button onclick="openCustomerLimitsModal('${c.id}')" class="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold border border-emerald-500/30 transition">
            ⚙️ Limits (1-5L)
          </button>
          <button onclick="toggleUserStatus('${c.id}')" class="px-2 py-1.5 ${isActive ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} rounded-xl text-[11px] font-semibold border transition">
            ${isActive ? 'Freeze' : 'Unfreeze'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate support transfer dropdown
function populateSupportSelect(preselectedId = null) {
  selectSupportFromUser.innerHTML = allCustomers.map(c => `
    <option value="${c.id}" ${preselectedId === c.id ? 'selected' : ''}>
      +91 ${c.phone} (${c.name || 'User'}) — ₹${(c.wallet?.INR || 0).toFixed(2)} | ₮${(c.wallet?.USDT || 0).toFixed(2)}
    </option>
  `).join('');

  updateSupportBalanceDisplay();
}

function updateSupportBalanceDisplay() {
  const selectedId = selectSupportFromUser.value;
  const user = allCustomers.find(c => c.id === selectedId);
  const selectedCurr = selectSupportCurrency.value;

  const syms = { INR: '₹', USDT: '₮', USD: '$', EUR: '€', AED: 'AED ' };
  supportCurrencySymbolLabel.textContent = syms[selectedCurr] || selectedCurr + ' ';

  if (user && user.wallet) {
    supportFromUserBalancePills.innerHTML = `
      <span class="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono">INR: ₹${(user.wallet.INR || 0).toFixed(2)}</span>
      <span class="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 font-mono">USDT: ₮${(user.wallet.USDT || 0).toFixed(2)}</span>
      <span class="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 font-mono">USD: $${(user.wallet.USD || 0).toFixed(2)}</span>
      <span class="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 font-mono">AED: ${(user.wallet.AED || 0).toFixed(2)}</span>
    `;
  }
}

selectSupportFromUser.addEventListener('change', updateSupportBalanceDisplay);
selectSupportCurrency.addEventListener('change', updateSupportBalanceDisplay);

// Load Ledger
async function loadLedger() {
  try {
    const res = await adminApiCall('/transactions');
    allTransactions = res.transactions || [];
    renderLedgerTable(allTransactions);
  } catch (err) {
    console.error('Failed to load transactions:', err);
  }
}

function renderLedgerTable(txns) {
  if (!txns || txns.length === 0) {
    ledgerTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-500">
          No transaction records yet.
        </td>
      </tr>
    `;
    return;
  }

  ledgerTableBody.innerHTML = txns.map(t => {
    const isDeposit = t.type === 'DEPOSIT';
    const isPayout = t.type === 'PAYOUT';
    const isSupport = t.type === 'SUPPORT_TRANSFER';
    const curr = t.currency || 'INR';

    let typeBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">ADJUSTMENT</span>`;
    let amountColor = 'text-white';

    if (isDeposit) {
      typeBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DEPOSIT</span>`;
      amountColor = 'text-emerald-400';
    } else if (isPayout) {
      typeBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">PAYOUT</span>`;
      amountColor = 'text-rose-400';
    } else if (isSupport) {
      typeBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">SUPPORT XFER</span>`;
      amountColor = 'text-cyan-400';
    } else if (t.type === 'COMMISSION_WITHDRAW') {
      typeBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PROFIT PAYOUT</span>`;
      amountColor = 'text-amber-400';
    }

    const timeStr = new Date(t.createdAt).toLocaleString();

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-4 font-mono">
          <div class="font-bold text-white text-[11px]">${t.id}</div>
          <div class="text-[10px] text-slate-500">Ref: ${t.utr || 'N/A'}</div>
        </td>
        <td class="p-4 font-mono text-slate-300">+91 ${t.userPhone || 'User'}</td>
        <td class="p-4">${typeBadge}</td>
        <td class="p-4 font-bold text-slate-300 font-mono">${curr}</td>
        <td class="p-4 font-extrabold ${amountColor} text-sm">${curr} ${Number(t.amount).toFixed(2)}</td>
        <td class="p-4 font-mono text-slate-400 text-[11px] truncate max-w-xs">${t.upiId || 'Pool'}</td>
        <td class="p-4 text-slate-400 text-[11px]">${timeStr}</td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">
            ${t.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Load Settings
async function loadSettings() {
  try {
    const res = await adminApiCall('/settings');
    systemSettings = res.settings;

    configFeeType.value = systemSettings.feeType || 'FLAT';
    configFeeFlatAmount.value = systemSettings.feeFlatAmount ?? 2;
    configFeePercent.value = systemSettings.feePercent ?? 1.0;
    configFeeAppliedOn.value = systemSettings.feeAppliedOn || 'PAYOUT';

    configSubEnabled.checked = systemSettings.subscriptionEnabled !== false;
    configSubPlanName.value = systemSettings.subscriptionPlanName || 'N Pay Pro Pass';
    configSubFee.value = systemSettings.subscriptionFee ?? 99;
    configSubDays.value = systemSettings.subscriptionValidityDays ?? 30;
    configSubZeroFee.checked = systemSettings.subscribersZeroFee !== false;

    updateFeeTypeVisibility();

    settingProvider.value = systemSettings.payoutProvider || 'SANDBOX';
    settingMerchantUpi.value = systemSettings.merchantUpiId || 'npay@upi';
    settingMerchantName.value = systemSettings.merchantName || 'N Pay Digital Services';
    settingMinDeposit.value = systemSettings.defaultMinDeposit || 1;
    settingMaxDeposit.value = systemSettings.defaultMaxDeposit || 500000;
    settingMinTransfer.value = systemSettings.defaultMinTransfer || 1;
    settingMaxTransfer.value = systemSettings.defaultMaxTransfer || 500000;
    if (settingFast2smsApiKey) settingFast2smsApiKey.value = systemSettings.fast2smsApiKey || '';
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function updateFeeTypeVisibility() {
  const type = configFeeType.value;
  if (type === 'NONE') {
    boxFlatFee.classList.add('hidden');
    boxPercentFee.classList.add('hidden');
  } else if (type === 'FLAT') {
    boxFlatFee.classList.remove('hidden');
    boxPercentFee.classList.add('hidden');
  } else if (type === 'PERCENT') {
    boxFlatFee.classList.add('hidden');
    boxPercentFee.classList.remove('hidden');
  }
}

configFeeType.addEventListener('change', updateFeeTypeVisibility);

// Setup Event Handlers
function setupAdminEvents() {
  // Login
  btnAdminLogin.addEventListener('click', async () => {
    const pin = inputAdminPin.value.trim();
    if (!pin) return alert('Enter Master Security PIN');
    try {
      const res = await adminApiCall('/auth/login', 'POST', { pin });
      setAdminToken(res.token);
      await loadAllDashboardData();
      showDashboard();
    } catch (err) {
      alert(err.message);
    }
  });

  // Logout
  btnAdminLogout.addEventListener('click', () => {
    if (confirm('Admin session close karein?')) {
      removeAdminToken();
      showLogin();
    }
  });

  // Refresh
  btnRefreshData.addEventListener('click', async () => {
    await loadAllDashboardData();
    alert('N Pay Database Records Refreshed!');
  });

  // Tab switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => {
        t.classList.remove('bg-emerald-500', 'text-slate-950', 'shadow-md', 'shadow-emerald-500/20');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('bg-emerald-500', 'text-slate-950', 'shadow-md', 'shadow-emerald-500/20');
      tab.classList.remove('text-slate-400');

      const targetView = tab.getAttribute('data-view');
      customersView.classList.add('hidden');
      ledgerView.classList.add('hidden');
      monetizationView.classList.add('hidden');
      settingsView.classList.add('hidden');

      document.getElementById(targetView).classList.remove('hidden');
    });
  });

  // Search Customer Filter
  inputSearchCustomer.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderCustomersTable(allCustomers);
      return;
    }
    const filtered = allCustomers.filter(c => 
      c.phone.toLowerCase().includes(q) || 
      c.id.toLowerCase().includes(q) ||
      c.virtualUpi.toLowerCase().includes(q)
    );
    renderCustomersTable(filtered);
  });

  // Ledger Filter
  filterTxnType.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'ALL') {
      renderLedgerTable(allTransactions);
    } else {
      renderLedgerTable(allTransactions.filter(t => t.type === val));
    }
  });

  // Save Monetization
  btnSaveMonetization.addEventListener('click', async () => {
    try {
      const payload = {
        feeType: configFeeType.value,
        feeFlatAmount: Number(configFeeFlatAmount.value),
        feePercent: Number(configFeePercent.value),
        feeAppliedOn: configFeeAppliedOn.value,
        subscriptionEnabled: configSubEnabled.checked,
        subscriptionPlanName: configSubPlanName.value.trim(),
        subscriptionFee: Number(configSubFee.value),
        subscriptionValidityDays: Number(configSubDays.value),
        subscribersZeroFee: configSubZeroFee.checked
      };
      await adminApiCall('/settings', 'POST', payload);
      alert('Fee & Subscription Configuration Successfully Saved!');
      await loadAllDashboardData();
    } catch (err) {
      alert(err.message);
    }
  });

  // Save System Default Limits
  btnSaveSettings.addEventListener('click', async () => {
    try {
      const payload = {
        payoutProvider: settingProvider.value,
        merchantUpiId: settingMerchantUpi.value.trim(),
        merchantName: settingMerchantName.value.trim(),
        defaultMinDeposit: Number(settingMinDeposit.value),
        defaultMaxDeposit: Number(settingMaxDeposit.value),
        defaultMinTransfer: Number(settingMinTransfer.value),
        defaultMaxTransfer: Number(settingMaxTransfer.value),
        fast2smsApiKey: settingFast2smsApiKey ? settingFast2smsApiKey.value.trim() : ''
      };
      await adminApiCall('/settings', 'POST', payload);
      alert('System Configuration & SMS Gateway Successfully Saved!');
      await loadAllDashboardData();
    } catch (err) {
      alert(err.message);
    }
  });

  // --- Customer Support Direct Transfer Handlers ---
  const openSupportModal = () => {
    populateSupportSelect();
    modalSupportTransfer.classList.remove('hidden');
  };

  if (btnOpenSupportTransferDirect) btnOpenSupportTransferDirect.addEventListener('click', openSupportModal);
  if (btnHeaderSupportTransfer) btnHeaderSupportTransfer.addEventListener('click', openSupportModal);
  if (btnCloseSupportModal) btnCloseSupportModal.addEventListener('click', () => modalSupportTransfer.classList.add('hidden'));

  // Execute Support Transfer (Multi-Currency & ANY Unknown UPI/QR!)
  btnExecuteSupportTransfer.addEventListener('click', async () => {
    const fromUserId = selectSupportFromUser.value;
    const toTarget = inputSupportToTarget.value.trim();
    const currency = selectSupportCurrency.value;
    const amount = Number(inputSupportAmount.value);
    const reason = inputSupportReason.value.trim();

    if (!fromUserId) return alert('Source customer select karein');
    if (!toTarget) return alert('Recipient target (Unknown UPI, Phone, QR string, ya Crypto Address) daalein');
    if (!amount || amount <= 0) return alert('Valid transfer amount daalein');

    btnExecuteSupportTransfer.disabled = true;
    btnExecuteSupportTransfer.textContent = 'Executing Transfer...';

    try {
      const res = await adminApiCall('/support-transfer', 'POST', {
        fromUserId,
        toTarget,
        currency,
        amount,
        reason
      });
      alert(`Success! ${res.message}\nAudit Ref: ${res.utr}`);
      modalSupportTransfer.classList.add('hidden');
      inputSupportToTarget.value = '';
      inputSupportAmount.value = '';
      inputSupportReason.value = '';
      await loadAllDashboardData();
    } catch (err) {
      alert(`Transfer Failed: ${err.message}`);
    } finally {
      btnExecuteSupportTransfer.disabled = false;
      btnExecuteSupportTransfer.textContent = 'Execute Transfer Now';
    }
  });

  // --- Customer Limits Handlers ---
  btnCloseLimitsModal.addEventListener('click', () => {
    modalCustomerLimits.classList.add('hidden');
  });

  document.querySelectorAll('.btnPresetLimit').forEach(btn => {
    btn.addEventListener('click', () => {
      const min = btn.getAttribute('data-min');
      const max = btn.getAttribute('data-max');
      inputLimitMinDeposit.value = min;
      inputLimitMaxDeposit.value = max;
      inputLimitMinTransfer.value = min;
      inputLimitMaxTransfer.value = max;
    });
  });

  btnSaveCustomerLimits.addEventListener('click', async () => {
    if (!selectedCustomerForLimits) return;
    try {
      const payload = {
        minDeposit: Number(inputLimitMinDeposit.value),
        maxDeposit: Number(inputLimitMaxDeposit.value),
        minTransfer: Number(inputLimitMinTransfer.value),
        maxTransfer: Number(inputLimitMaxTransfer.value)
      };
      await adminApiCall(`/customers/${selectedCustomerForLimits.id}/set-limits`, 'POST', payload);
      alert(`Limits saved successfully for +91 ${selectedCustomerForLimits.phone}!`);
      modalCustomerLimits.classList.add('hidden');
      await loadAllDashboardData();
    } catch (err) {
      alert(err.message);
    }
  });

  // --- Commission Withdrawal Handlers ---
  if (btnOpenCommissionWithdraw) {
    btnOpenCommissionWithdraw.addEventListener('click', () => {
      inputCommissionAmount.value = '';
      inputCommissionNote.value = '';
      modalCommissionWithdraw.classList.remove('hidden');
    });
  }

  if (btnCloseCommissionWithdraw) {
    btnCloseCommissionWithdraw.addEventListener('click', () => {
      modalCommissionWithdraw.classList.add('hidden');
    });
  }

  if (btnExecuteCommissionWithdraw) {
    btnExecuteCommissionWithdraw.addEventListener('click', async () => {
      const destinationUpi = inputCommissionUpi.value.trim();
      const amount = Number(inputCommissionAmount.value);
      const note = inputCommissionNote.value.trim();

      if (!destinationUpi) return alert('Enter destination Bank Account or UPI ID');
      if (!amount || amount <= 0) return alert('Enter valid withdrawal amount');

      btnExecuteCommissionWithdraw.disabled = true;
      btnExecuteCommissionWithdraw.textContent = 'Processing Payout...';

      try {
        const res = await adminApiCall('/commission/withdraw', 'POST', {
          destinationUpi,
          amount,
          note
        });

        alert(res.message);
        modalCommissionWithdraw.classList.add('hidden');
        await loadAllDashboardData();
      } catch (err) {
        alert(err.message);
      } finally {
        btnExecuteCommissionWithdraw.disabled = false;
        btnExecuteCommissionWithdraw.textContent = 'Execute Commission Withdrawal';
      }
    });
  }
}

// Global actions called from table rows
window.openSupportTransferFor = function(userId) {
  populateSupportSelect(userId);
  modalSupportTransfer.classList.remove('hidden');
};

window.openCustomerLimitsModal = function(userId) {
  const customer = allCustomers.find(c => c.id === userId);
  if (!customer) return;
  selectedCustomerForLimits = customer;
  limitModalCustomerPhone.textContent = `Customer: +91 ${customer.phone} (${customer.name || 'User'})`;

  inputLimitMinDeposit.value = customer.limits?.minDeposit || 1;
  inputLimitMaxDeposit.value = customer.limits?.maxDeposit || 500000;
  inputLimitMinTransfer.value = customer.limits?.minTransfer || 1;
  inputLimitMaxTransfer.value = customer.limits?.maxTransfer || 500000;

  modalCustomerLimits.classList.remove('hidden');
};

window.toggleUserStatus = async function(userId) {
  const customer = allCustomers.find(c => c.id === userId);
  if (!customer) return;
  const actionText = customer.status === 'ACTIVE' ? 'Freeze/Block' : 'Unfreeze/Activate';
  if (confirm(`Kya aap sure hain ki +91 ${customer.phone} ko ${actionText} karna chahte hain?`)) {
    try {
      await adminApiCall(`/customers/${userId}/toggle-status`, 'POST');
      await loadAllDashboardData();
    } catch (err) {
      alert(err.message);
    }
  }
};
