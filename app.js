// N Pay Mobile Wallet Client App
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
  ? `${CURRENT_SERVER_HOST}/api`
  : '/api';

let currentUser = null;
let currentWallet = null;
let appSettings = null;
let activeDepositTxnId = null;
let qrScannerInstance = null;

// Current selection state
let selectedDepositCurrency = 'INR';
let currencySelectorMode = 'ADD_MONEY'; // 'ADD_MONEY' or 'RECEIVE_QR'

// Currency Symbols mapping
const CURRENCY_SYMBOLS = {
  INR: '₹',
  USDT: '₮',
  USD: '$',
  EUR: '€',
  AED: 'AED ',
  GBP: '£'
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const phoneStep = document.getElementById('phoneStep');
const otpStep = document.getElementById('otpStep');
const mpinStep = document.getElementById('mpinStep');
const inputPhone = document.getElementById('inputPhone');
const inputOtp = document.getElementById('inputOtp');
const inputLoginMpin = document.getElementById('inputLoginMpin');
const btnSendOtp = document.getElementById('btnSendOtp');
const btnVerifyOtp = document.getElementById('btnVerifyOtp');
const btnConfirmMpin = document.getElementById('btnConfirmMpin');
const btnChangePhone = document.getElementById('btnChangePhone');
const btnAutoFillOtp = document.getElementById('btnAutoFillOtp');
const demoOtpText = document.getElementById('demoOtpText');
const otpBanner = document.getElementById('otpBanner');

// PhonePe-Style UPI PIN Modal Elements
const modalUpiPin = document.getElementById('modalUpiPin');
const pinModalRecipientName = document.getElementById('pinModalRecipientName');
const pinModalAmount = document.getElementById('pinModalAmount');
const pinErrorText = document.getElementById('pinErrorText');
const btnPinCancel = document.getElementById('btnPinCancel');
const btnPinBackspace = document.getElementById('btnPinBackspace');

// Payment Success Modal Elements
const modalPaymentSuccess = document.getElementById('modalPaymentSuccess');
const successAmountDisplay = document.getElementById('successAmountDisplay');
const successRecipientDisplay = document.getElementById('successRecipientDisplay');
const successUtrDisplay = document.getElementById('successUtrDisplay');
const successTimeDisplay = document.getElementById('successTimeDisplay');
const btnClosePaymentSuccess = document.getElementById('btnClosePaymentSuccess');

let currentEnteredPin = '';
let pendingPayoutPayload = null;

// Balances
const displayBalanceInr = document.getElementById('displayBalanceInr');
const displayBalanceUsdt = document.getElementById('displayBalanceUsdt');
const displayBalanceUsd = document.getElementById('displayBalanceUsd');
const displayBalanceAed = document.getElementById('displayBalanceAed');
const displayBalanceEur = document.getElementById('displayBalanceEur');
const userUsdtAddressShort = document.getElementById('userUsdtAddressShort');
const userLimitTag = document.getElementById('userLimitTag');

const userDisplayName = document.getElementById('userDisplayName');
const userVirtualUpi = document.getElementById('userVirtualUpi');
const userAvatarText = document.getElementById('userAvatarText');
const userBadgeSub = document.getElementById('userBadgeSub');
const transactionsList = document.getElementById('transactionsList');
const txnCountBadge = document.getElementById('txnCountBadge');
const btnRefreshBalance = document.getElementById('btnRefreshBalance');
const refreshIcon = document.getElementById('refreshIcon');
const btnLogout = document.getElementById('btnLogout');
const btnCopyUpi = document.getElementById('btnCopyUpi');

// Subscription Card
const subscriptionCard = document.getElementById('subscriptionCard');
const subPlanTitle = document.getElementById('subPlanTitle');
const subCostDisplay = document.getElementById('subCostDisplay');
const btnBuySubscription = document.getElementById('btnBuySubscription');

// Currency Selector Modal
const modalCurrencySelector = document.getElementById('modalCurrencySelector');
const btnCloseCurrencySelector = document.getElementById('btnCloseCurrencySelector');
const btnSelectCurrencies = document.querySelectorAll('.btnSelectCurrency');

// Modals
const modalAddMoney = document.getElementById('modalAddMoney');
const btnOpenAddMoney = document.getElementById('btnOpenAddMoney');
const btnCloseAddMoney = document.getElementById('btnCloseAddMoney');
const activeDepositCurrencyBadge = document.getElementById('activeDepositCurrencyBadge');
const depositLimitNotice = document.getElementById('depositLimitNotice');
const depositCurrencySymbol = document.getElementById('depositCurrencySymbol');
const inputDepositAmount = document.getElementById('inputDepositAmount');
const btnGenerateDepositQr = document.getElementById('btnGenerateDepositQr');
const addMoneyInputView = document.getElementById('addMoneyInputView');
const addMoneyQrView = document.getElementById('addMoneyQrView');
const depositQrImage = document.getElementById('depositQrImage');
const depositQrAmount = document.getElementById('depositQrAmount');
const depositSymbolLabel = document.getElementById('depositSymbolLabel');
const depositCurrencyCode = document.getElementById('depositCurrencyCode');
const depositInstructions = document.getElementById('depositInstructions');
const usdtAddressBox = document.getElementById('usdtAddressBox');
const usdtAddressText = document.getElementById('usdtAddressText');
const upiAppLinks = document.getElementById('upiAppLinks');
const btnSimulateDepositSuccess = document.getElementById('btnSimulateDepositSuccess');
const linkGPay = document.getElementById('linkGPay');
const linkPhonePe = document.getElementById('linkPhonePe');
const linkPaytm = document.getElementById('linkPaytm');

// Send Money Modal
const modalSendMoney = document.getElementById('modalSendMoney');
const btnOpenSendMoney = document.getElementById('btnOpenSendMoney');
const btnCloseSendMoney = document.getElementById('btnCloseSendMoney');
const selectSendCurrency = document.getElementById('selectSendCurrency');
const sendRecipientLabel = document.getElementById('sendRecipientLabel');
const inputRecipientUpi = document.getElementById('inputRecipientUpi');
const inputSendAmount = document.getElementById('inputSendAmount');
const sendCurrencySymbol = document.getElementById('sendCurrencySymbol');
const inputSendNote = document.getElementById('inputSendNote');
const btnExecuteSendMoney = document.getElementById('btnExecuteSendMoney');
const sendWalletBalanceDisplay = document.getElementById('sendWalletBalanceDisplay');
const displayTransferFee = document.getElementById('displayTransferFee');
const displayTotalDebit = document.getElementById('displayTotalDebit');
const btnSendScanTrigger = document.getElementById('btnSendScanTrigger');

// Scanner Modal
const modalScanner = document.getElementById('modalScanner');
const btnOpenScanner = document.getElementById('btnOpenScanner');
const btnCloseScanner = document.getElementById('btnCloseScanner');
const qrFileInput = document.getElementById('qrFileInput');

// My QR Modal
const modalMyQr = document.getElementById('modalMyQr');
const btnOpenMyQr = document.getElementById('btnOpenMyQr');
const btnCloseMyQr = document.getElementById('btnCloseMyQr');
const myQrCurrencyBadge = document.getElementById('myQrCurrencyBadge');
const myPersonalQrImage = document.getElementById('myPersonalQrImage');
const myQrPhone = document.getElementById('myQrPhone');
const myQrUpi = document.getElementById('myQrUpi');
const myQrInstruction = document.getElementById('myQrInstruction');

const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastIcon = document.getElementById('toastIcon');

// Clock updater
function updateClock() {
  const now = new Date();
  const timeElem = document.getElementById('currentTime');
  if (timeElem) {
    timeElem.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
setInterval(updateClock, 1000);
updateClock();

// Toast helper
function showToast(msg, icon = '✅') {
  toastMsg.textContent = msg;
  toastIcon.textContent = icon;
  toast.classList.remove('-translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.add('-translate-y-24', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3200);
}

// Token helper
function getToken() {
  return localStorage.getItem('npay_token');
}

function setToken(token) {
  localStorage.setItem('npay_token', token);
}

function removeToken() {
  localStorage.removeItem('npay_token');
}

// API Fetch wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, options);
  } catch (netErr) {
    throw new Error(`Server se connection nahi hua. Check Server URL.`);
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error('Server response invalid hai.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/app/sw.js').catch(err => console.log('SW registration note:', err));
}

// Init App
document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (token) {
    try {
      await loadUserData();
      showDashboard();
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      removeToken();
      showLogin();
    }
  } else {
    showLogin();
  }
  setupEventListeners();
});

function showLogin() {
  loginScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
  phoneStep.classList.remove('hidden');
  otpStep.classList.add('hidden');
}

function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
}

// Load Profile and Balances
async function loadUserData() {
  try {
    const data = await apiCall('/user/me');
    currentUser = data.user;
    currentWallet = data.wallet;
    appSettings = data.settings;

    // Render header
    userDisplayName.textContent = currentUser.name || `User ${currentUser.phone.slice(-4)}`;
    userVirtualUpi.textContent = currentUser.virtualUpi;
    userAvatarText.textContent = 'NP';

    // Limits display
    if (currentUser.limits) {
      userLimitTag.textContent = `Limit: ₹${currentUser.limits.minDeposit} - ₹${currentUser.limits.maxDeposit.toLocaleString()}`;
    }

    // Check subscription status
    const isSubActive = currentUser.subscription && currentUser.subscription.active && new Date(currentUser.subscription.expiresAt) > new Date();

    if (isSubActive) {
      userBadgeSub.textContent = 'PRO';
      userBadgeSub.className = 'text-[9px] px-2 py-0.5 rounded font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30';
      subscriptionCard.classList.add('hidden');
    } else {
      userBadgeSub.textContent = 'FREE';
      userBadgeSub.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-400';
      if (appSettings && appSettings.subscriptionEnabled) {
        subPlanTitle.textContent = appSettings.subscriptionPlanName || 'N Pay Pro Pass';
        subCostDisplay.textContent = appSettings.subscriptionFee || '99';
        subscriptionCard.classList.remove('hidden');
      } else {
        subscriptionCard.classList.add('hidden');
      }
    }

    // Render Multi-Currency Balances
    displayBalanceInr.textContent = Number(currentWallet.INR || 0).toFixed(2);
    displayBalanceUsdt.textContent = Number(currentWallet.USDT || 0).toFixed(2);
    displayBalanceUsd.textContent = Number(currentWallet.USD || 0).toFixed(2);
    displayBalanceAed.textContent = Number(currentWallet.AED || 0).toFixed(2);
    displayBalanceEur.textContent = Number(currentWallet.EUR || 0).toFixed(2);

    if (currentUser.usdtAddress) {
      userUsdtAddressShort.textContent = currentUser.usdtAddress.slice(0, 10) + '...' + currentUser.usdtAddress.slice(-4);
    }

    // Render transactions
    renderTransactions(data.recentTransactions || []);
  } catch (err) {
    showToast(err.message, '⚠️');
    throw err;
  }
}

// Render Transaction Ledger
function renderTransactions(txns) {
  txnCountBadge.textContent = txns.length;
  if (!txns || txns.length === 0) {
    transactionsList.innerHTML = `
      <div class="py-10 text-center text-slate-500 text-xs flex flex-col items-center">
        <svg class="w-8 h-8 text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <span>No transactions yet. Add money to get started!</span>
      </div>
    `;
    return;
  }

  transactionsList.innerHTML = txns.map(t => {
    const curr = t.currency || 'INR';
    const sym = CURRENCY_SYMBOLS[curr] || curr + ' ';
    const isDeposit = t.type === 'DEPOSIT';
    const isSupport = t.type === 'SUPPORT_TRANSFER';
    const isSub = t.type === 'SUBSCRIPTION';
    const isSuccess = t.status === 'SUCCESS';

    let amountColor = 'text-rose-400';
    let amountPrefix = `- ${sym}`;
    let iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>`;
    let iconBg = 'bg-rose-500/10 text-rose-400';

    if (isDeposit) {
      amountColor = 'text-emerald-400';
      amountPrefix = `+ ${sym}`;
      iconBg = 'bg-emerald-500/10 text-emerald-400';
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>`;
    } else if (isSupport) {
      amountColor = 'text-cyan-400';
      iconBg = 'bg-cyan-500/10 text-cyan-400';
      iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`;
    } else if (isSub) {
      amountColor = 'text-amber-400';
      iconBg = 'bg-amber-500/10 text-amber-400';
      iconSvg = `👑`;
    }

    const timeStr = new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="p-3.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-800 flex items-center justify-between transition">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center font-bold text-sm">
            ${iconSvg}
          </div>
          <div>
            <div class="text-xs font-bold text-white">${t.note || (isDeposit ? `${curr} Deposit` : `${curr} Transfer`)}</div>
            <div class="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
              <span>${timeStr}</span>
              ${t.utr ? `<span>• Ref: ${t.utr.slice(-6)}</span>` : ''}
              ${t.fee > 0 ? `<span class="text-amber-400 font-semibold">• Fee: ${sym}${t.fee}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-black ${amountColor}">${amountPrefix}${Number(t.amount).toFixed(2)}</div>
          <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">
            ${t.status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Update Send Money Fee & Balance Displays
function updateSendFeeCalculations() {
  const curr = selectSendCurrency.value;
  const sym = CURRENCY_SYMBOLS[curr] || curr + ' ';
  const amt = Number(inputSendAmount.value) || 0;
  const avail = currentWallet ? (currentWallet[curr] || 0) : 0;

  sendCurrencySymbol.textContent = sym;
  sendWalletBalanceDisplay.textContent = `${sym}${avail.toFixed(2)}`;

  if (curr === 'USDT') {
    sendRecipientLabel.textContent = 'Recipient USDT Address (TRC20)';
    inputRecipientUpi.placeholder = 'e.g. TXnp9847192... (Tron / TRC20)';
  } else if (curr === 'INR') {
    sendRecipientLabel.textContent = 'Recipient UPI ID / VPA';
    inputRecipientUpi.placeholder = 'e.g. friend@okaxis, shop@paytm';
  } else {
    sendRecipientLabel.textContent = `Recipient ${curr} Account / Wire ID`;
    inputRecipientUpi.placeholder = `e.g. user@bank or account IBAN`;
  }

  let fee = 0;
  const isSubActive = currentUser && currentUser.subscription && currentUser.subscription.active && new Date(currentUser.subscription.expiresAt) > new Date();

  if (isSubActive && appSettings && appSettings.subscribersZeroFee) {
    fee = 0;
  } else if (appSettings) {
    if (appSettings.feeType === 'FLAT') {
      fee = Number(appSettings.feeFlatAmount || 0);
    } else if (appSettings.feeType === 'PERCENT') {
      fee = Math.round((amt * (Number(appSettings.feePercent || 0) / 100)) * 100) / 100;
    }
  }

  const total = Math.round((amt + fee) * 100) / 100;
  displayTransferFee.textContent = isSubActive ? `${sym}0.00 (Pro Free)` : `${sym}${fee.toFixed(2)}`;
  displayTotalDebit.textContent = `${sym}${total.toFixed(2)}`;
}

// Event Listeners Setup
function setupEventListeners() {
  // 1. Send OTP
  btnSendOtp.addEventListener('click', async () => {
    const phone = inputPhone.value.trim();
    if (!phone || phone.length !== 10) {
      return showToast('Please enter a 10-digit mobile number', '⚠️');
    }
    btnSendOtp.disabled = true;
    btnSendOtp.innerHTML = 'Sending OTP...';

    try {
      const res = await apiCall('/auth/send-otp', 'POST', { phone });
      phoneStep.classList.add('hidden');
      otpStep.classList.remove('hidden');
      if (mpinStep) mpinStep.classList.add('hidden');
      if (res.testOtp) {
        demoOtpText.textContent = res.testOtp;
        otpBanner.classList.remove('hidden');
      } else {
        otpBanner.classList.add('hidden');
      }
      showToast(res.message, '📩');
    } catch (err) {
      showToast(err.message, '⚠️');
    } finally {
      btnSendOtp.disabled = false;
      btnSendOtp.innerHTML = `<span>Get OTP</span><svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    }
  });

  // Auto fill OTP
  if (btnAutoFillOtp) {
    btnAutoFillOtp.addEventListener('click', () => {
      inputOtp.value = demoOtpText.textContent;
    });
  }

  btnChangePhone.addEventListener('click', () => {
    otpStep.classList.add('hidden');
    if (mpinStep) mpinStep.classList.add('hidden');
    phoneStep.classList.remove('hidden');
  });

  // 2. Verify OTP
  btnVerifyOtp.addEventListener('click', async () => {
    const phone = inputPhone.value.trim();
    const otp = inputOtp.value.trim();
    if (!otp || otp.length < 4) {
      return showToast('Please enter the OTP', '⚠️');
    }
    btnVerifyOtp.disabled = true;
    btnVerifyOtp.textContent = 'Verifying...';

    try {
      const res = await apiCall('/auth/verify-otp', 'POST', { phone, otp });
      setToken(res.token);

      if (!res.user.hasMpin) {
        // Needs to set MPIN like PhonePe first time
        otpStep.classList.add('hidden');
        mpinStep.classList.remove('hidden');
        inputLoginMpin.value = '';
        inputLoginMpin.focus();
        showToast('Set your 4-digit UPI MPIN', '🔒');
      } else {
        await loadUserData();
        showDashboard();
        showToast('Welcome to N Pay!', '🎉');
      }
    } catch (err) {
      showToast(err.message, '⚠️');
    } finally {
      btnVerifyOtp.disabled = false;
      btnVerifyOtp.textContent = 'Verify & Continue';
    }
  });

  // 2b. Set MPIN
  if (btnConfirmMpin) {
    btnConfirmMpin.addEventListener('click', async () => {
      const mpin = inputLoginMpin.value.trim();
      if (mpin.length !== 4 || !/^\d{4}$/.test(mpin)) {
        return showToast('Enter 4-digit numeric MPIN', '⚠️');
      }
      btnConfirmMpin.disabled = true;
      btnConfirmMpin.textContent = 'Setting PIN...';

      try {
        await apiCall('/auth/set-mpin', 'POST', { mpin });
        await loadUserData();
        showDashboard();
        showToast('UPI PIN Set! Welcome to N Pay', '🎉');
      } catch (err) {
        showToast(err.message, '⚠️');
      } finally {
        btnConfirmMpin.disabled = false;
        btnConfirmMpin.textContent = 'Confirm MPIN & Open Wallet';
      }
    });
  }

  // Logout
  btnLogout.addEventListener('click', () => {
    if (confirm('Log out from N Pay?')) {
      removeToken();
      showLogin();
      showToast('Logged out successfully');
    }
  });

  // Refresh Balance
  btnRefreshBalance.addEventListener('click', async () => {
    refreshIcon.classList.add('animate-spin');
    await loadUserData();
    setTimeout(() => refreshIcon.classList.remove('animate-spin'), 600);
    showToast('Balances updated!');
  });

  // Copy UPI
  btnCopyUpi.addEventListener('click', () => {
    if (currentUser) {
      navigator.clipboard.writeText(currentUser.virtualUpi);
      showToast(`Copied UPI: ${currentUser.virtualUpi}`, '📋');
    }
  });

  // Buy Subscription Plan
  btnBuySubscription.addEventListener('click', async () => {
    const subCost = appSettings ? appSettings.subscriptionFee : 99;
    if (currentWallet && (currentWallet.INR || 0) < subCost) {
      return showToast(`Insufficient INR balance. Please add at least ₹${subCost}`, '⚠️');
    }
    if (confirm(`Activate ${appSettings.subscriptionPlanName} for ₹${subCost}? Enjoy ₹0 fees on all transfers!`)) {
      try {
        await apiCall('/wallet/subscription/buy', 'POST');
        showToast('Upgraded to N Pay Pro Pass! 🎉', '👑');
        await loadUserData();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    }
  });

  // ==========================================
  // CURRENCY SELECTOR TRIGGERS
  // ==========================================
  btnOpenAddMoney.addEventListener('click', () => {
    currencySelectorMode = 'ADD_MONEY';
    modalCurrencySelector.classList.remove('hidden');
  });

  btnOpenMyQr.addEventListener('click', () => {
    currencySelectorMode = 'RECEIVE_QR';
    modalCurrencySelector.classList.remove('hidden');
  });

  btnCloseCurrencySelector.addEventListener('click', () => {
    modalCurrencySelector.classList.add('hidden');
  });

  btnSelectCurrencies.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedCurr = btn.getAttribute('data-currency');
      modalCurrencySelector.classList.add('hidden');

      if (currencySelectorMode === 'ADD_MONEY') {
        openAddMoneyModalForCurrency(selectedCurr);
      } else {
        openMyQrModalForCurrency(selectedCurr);
      }
    });
  });

  function openAddMoneyModalForCurrency(curr) {
    selectedDepositCurrency = curr;
    activeDepositCurrencyBadge.textContent = curr;
    depositCurrencySymbol.textContent = CURRENCY_SYMBOLS[curr] || curr + ' ';

    const sym = CURRENCY_SYMBOLS[curr] || curr + ' ';
    const min = currentUser?.limits?.minDeposit || 1;
    const max = currentUser?.limits?.maxDeposit || 500000;
    depositLimitNotice.textContent = `Limit: ${sym}${min} to ${sym}${max.toLocaleString()}`;

    modalAddMoney.classList.remove('hidden');
    addMoneyInputView.classList.remove('hidden');
    addMoneyQrView.classList.add('hidden');
  }

  function openMyQrModalForCurrency(curr) {
    modalMyQr.classList.remove('hidden');
    myQrCurrencyBadge.textContent = `${curr} Deposit`;

    let paymentUri;
    const sym = CURRENCY_SYMBOLS[curr] || curr;

    if (curr === 'INR') {
      myQrPhone.textContent = `+91 ${currentUser.phone}`;
      myQrUpi.textContent = currentUser.virtualUpi;
      myQrInstruction.textContent = 'Kisi bhi UPI App (PhonePe, GPay, Paytm) se scan karein';
      paymentUri = `upi://pay?pa=${encodeURIComponent(currentUser.virtualUpi)}&pn=${encodeURIComponent(currentUser.name)}&cu=INR`;
    } else if (curr === 'USDT') {
      myQrPhone.textContent = `Tether USDT (TRC20)`;
      myQrUpi.textContent = currentUser.usdtAddress;
      myQrInstruction.textContent = 'Binance, TrustWallet ya kisi bhi Crypto App se TRC20 transfer karein';
      paymentUri = `tron:${currentUser.usdtAddress}?token=TRC20`;
    } else {
      myQrPhone.textContent = `${curr} Global Direct`;
      myQrUpi.textContent = `${currentUser.phone}@npay.${curr.toLowerCase()}`;
      myQrInstruction.textContent = `International ${curr} wire deposit QR`;
      paymentUri = `npay://pay?cur=${curr}&pa=${currentUser.phone}@npay`;
    }

    myPersonalQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUri)}`;
  }

  btnCloseAddMoney.addEventListener('click', () => {
    modalAddMoney.classList.add('hidden');
  });

  // Quick Amount chips
  document.querySelectorAll('.chipAmount').forEach(chip => {
    chip.addEventListener('click', () => {
      inputDepositAmount.value = chip.getAttribute('data-amt');
    });
  });

  // Generate Deposit QR
  btnGenerateDepositQr.addEventListener('click', async () => {
    const amount = Number(inputDepositAmount.value);
    const curr = selectedDepositCurrency;
    const sym = CURRENCY_SYMBOLS[curr] || curr + ' ';

    if (!amount || amount < 1) {
      return showToast('Minimum deposit amount is 1', '⚠️');
    }
    btnGenerateDepositQr.disabled = true;
    btnGenerateDepositQr.textContent = 'Generating QR...';

    try {
      const res = await apiCall('/wallet/deposit/create-qr', 'POST', { amount, currency: curr });
      activeDepositTxnId = res.transactionId;
      depositQrImage.src = res.qrDataUrl;
      depositQrAmount.textContent = Number(res.amount).toFixed(2);
      depositSymbolLabel.textContent = sym;
      depositCurrencyCode.textContent = curr;

      if (curr === 'INR') {
        depositInstructions.textContent = 'Scan using PhonePe, Google Pay, Paytm, or BHIM';
        usdtAddressBox.classList.add('hidden');
        upiAppLinks.classList.remove('hidden');
        linkGPay.href = res.apps.gpay;
        linkPhonePe.href = res.apps.phonepe;
        linkPaytm.href = res.apps.paytm;
      } else if (curr === 'USDT') {
        depositInstructions.textContent = 'Deposit USDT to this TRC20 Address';
        usdtAddressBox.classList.remove('hidden');
        usdtAddressText.textContent = res.payeeDetails;
        upiAppLinks.classList.add('hidden');
      } else {
        depositInstructions.textContent = `International ${curr} Payment Gateway`;
        usdtAddressBox.classList.add('hidden');
        upiAppLinks.classList.add('hidden');
      }

      addMoneyInputView.classList.add('hidden');
      addMoneyQrView.classList.remove('hidden');
    } catch (err) {
      showToast(err.message, '⚠️');
    } finally {
      btnGenerateDepositQr.disabled = false;
      btnGenerateDepositQr.textContent = 'Generate Payment QR';
    }
  });

  // Simulate Instant Deposit Success
  btnSimulateDepositSuccess.addEventListener('click', async () => {
    if (!activeDepositTxnId) return;
    btnSimulateDepositSuccess.disabled = true;
    btnSimulateDepositSuccess.textContent = 'Simulating Settlement...';

    try {
      const res = await apiCall('/wallet/deposit/simulate-pay', 'POST', { transactionId: activeDepositTxnId });
      showToast(res.message, '🎉');
      modalAddMoney.classList.add('hidden');
      await loadUserData();
    } catch (err) {
      showToast(err.message, '⚠️');
    } finally {
      btnSimulateDepositSuccess.disabled = false;
      btnSimulateDepositSuccess.textContent = 'Simulate Payment Success (Instant Test)';
    }
  });

  // --- Send Money Modal ---
  btnOpenSendMoney.addEventListener('click', () => {
    modalSendMoney.classList.remove('hidden');
    updateSendFeeCalculations();
  });

  btnCloseSendMoney.addEventListener('click', () => {
    modalSendMoney.classList.add('hidden');
  });

  selectSendCurrency.addEventListener('change', updateSendFeeCalculations);
  inputSendAmount.addEventListener('input', updateSendFeeCalculations);

  // PIN Dot Renderer Helper
  function updatePinDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pinDot${i}`);
      if (dot) {
        if (i < currentEnteredPin.length) {
          dot.className = 'w-4 h-4 rounded-full bg-emerald-400 border-2 border-emerald-400 shadow-md shadow-emerald-400/50 transition';
        } else {
          dot.className = 'w-4 h-4 rounded-full border-2 border-slate-600 transition';
        }
      }
    }
  }

  // Trigger Send Money Payment
  btnExecuteSendMoney.addEventListener('click', async () => {
    const destinationUpi = inputRecipientUpi.value.trim();
    const amount = Number(inputSendAmount.value);
    const note = inputSendNote.value.trim();
    const curr = selectSendCurrency.value;

    if (!destinationUpi) return showToast('Please enter recipient address / UPI ID', '⚠️');
    if (!amount || amount <= 0) return showToast('Please enter a valid amount', '⚠️');

    // Store pending transaction payload
    pendingPayoutPayload = { destinationUpi, amount, note, currency: curr };

    // Check if user has an MPIN set (like PhonePe)
    if (currentUser && currentUser.hasMpin) {
      currentEnteredPin = '';
      updatePinDots();
      if (pinErrorText) pinErrorText.textContent = '';
      if (pinModalRecipientName) pinModalRecipientName.textContent = destinationUpi;
      if (pinModalAmount) pinModalAmount.textContent = `${CURRENCY_SYMBOLS[curr] || curr} ${amount.toFixed(2)}`;
      modalUpiPin.classList.remove('hidden');
    } else {
      // Direct execution if no MPIN set
      executePayoutRequest();
    }
  });

  // Execute Payout function
  async function executePayoutRequest() {
    if (!pendingPayoutPayload) return;
    const { destinationUpi, amount, note, currency } = pendingPayoutPayload;
    btnExecuteSendMoney.disabled = true;
    btnExecuteSendMoney.textContent = `Processing ${currency}...`;

    try {
      const res = await apiCall('/wallet/payout/send', 'POST', {
        destinationUpi,
        amount,
        note,
        currency,
        mpin: currentEnteredPin
      });

      // Close modals
      modalUpiPin.classList.add('hidden');
      modalSendMoney.classList.add('hidden');
      inputRecipientUpi.value = '';
      inputSendAmount.value = '';
      inputSendNote.value = '';

      // Show PhonePe-Style Payment Success Popup!
      if (modalPaymentSuccess) {
        successAmountDisplay.textContent = `${CURRENCY_SYMBOLS[currency] || currency} ${Number(amount).toFixed(2)}`;
        successRecipientDisplay.textContent = res.recipientName || destinationUpi;
        successUtrDisplay.textContent = res.transaction?.utr || ('UTR' + Date.now().toString().slice(-8));
        successTimeDisplay.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        modalPaymentSuccess.classList.remove('hidden');
      } else {
        showToast(res.message, '✅');
      }

      await loadUserData();
    } catch (err) {
      if (!modalUpiPin.classList.contains('hidden')) {
        if (pinErrorText) pinErrorText.textContent = err.message || 'Incorrect 4-digit UPI PIN';
        currentEnteredPin = '';
        updatePinDots();
      } else {
        showToast(err.message, '⚠️');
      }
    } finally {
      btnExecuteSendMoney.disabled = false;
      btnExecuteSendMoney.textContent = 'Send Payment Now';
    }
  }

  // Keypad Handlers for UPI PIN Modal
  document.querySelectorAll('.pinKey').forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.getAttribute('data-key');
      if (currentEnteredPin.length < 4) {
        currentEnteredPin += digit;
        updatePinDots();
        if (pinErrorText) pinErrorText.textContent = '';
        if (currentEnteredPin.length === 4) {
          setTimeout(executePayoutRequest, 250);
        }
      }
    });
  });

  if (btnPinBackspace) {
    btnPinBackspace.addEventListener('click', () => {
      if (currentEnteredPin.length > 0) {
        currentEnteredPin = currentEnteredPin.slice(0, -1);
        updatePinDots();
        if (pinErrorText) pinErrorText.textContent = '';
      }
    });
  }

  if (btnPinCancel) {
    btnPinCancel.addEventListener('click', () => {
      modalUpiPin.classList.add('hidden');
      currentEnteredPin = '';
      updatePinDots();
    });
  }

  if (btnClosePaymentSuccess) {
    btnClosePaymentSuccess.addEventListener('click', () => {
      modalPaymentSuccess.classList.add('hidden');
    });
  }

  // --- QR Scanner Modal ---
  btnOpenScanner.addEventListener('click', () => {
    modalScanner.classList.remove('hidden');
    startCameraScanner();
  });

  btnSendScanTrigger.addEventListener('click', () => {
    modalSendMoney.classList.add('hidden');
    modalScanner.classList.remove('hidden');
    startCameraScanner();
  });

  btnCloseScanner.addEventListener('click', () => {
    stopCameraScanner();
    modalScanner.classList.add('hidden');
  });

  // File upload scanner
  qrFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const html5QrCode = new Html5Qrcode("qrReaderContainer");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScannedQrResult(decodedText);
    } catch (err) {
      showToast('Could not find a valid QR in uploaded image', '⚠️');
    }
  });

  // --- My QR Modal Close ---
  btnCloseMyQr.addEventListener('click', () => {
    modalMyQr.classList.add('hidden');
  });

  // --- Server URL Config Handlers ---
  const modalServerConfig = document.getElementById('modalServerConfig');
  const btnOpenServerConfig = document.getElementById('btnOpenServerConfig');
  const btnCloseServerConfig = document.getElementById('btnCloseServerConfig');
  const btnSaveServerConfig = document.getElementById('btnSaveServerConfig');
  const btnResetServerConfig = document.getElementById('btnResetServerConfig');
  const inputCustomServerUrl = document.getElementById('inputCustomServerUrl');
  const currentServerUrlDisplay = document.getElementById('currentServerUrlDisplay');

  if (btnOpenServerConfig) {
    btnOpenServerConfig.addEventListener('click', () => {
      if (inputCustomServerUrl) inputCustomServerUrl.value = localStorage.getItem('npay_server_url') || CURRENT_SERVER_HOST;
      if (currentServerUrlDisplay) currentServerUrlDisplay.textContent = CURRENT_SERVER_HOST;
      if (modalServerConfig) modalServerConfig.classList.remove('hidden');
    });
  }

  if (btnCloseServerConfig) {
    btnCloseServerConfig.addEventListener('click', () => {
      if (modalServerConfig) modalServerConfig.classList.add('hidden');
    });
  }

  if (btnSaveServerConfig) {
    btnSaveServerConfig.addEventListener('click', () => {
      let val = inputCustomServerUrl ? inputCustomServerUrl.value.trim() : '';
      if (!val) {
        return showToast('Server URL enter karein', '⚠️');
      }
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        val = 'https://' + val;
      }
      val = val.replace(/\/+$/, '');
      localStorage.setItem('npay_server_url', val);
      CURRENT_SERVER_HOST = val;
      API_BASE = `${val}/api`;
      if (modalServerConfig) modalServerConfig.classList.add('hidden');
      showToast(`Server connected to: ${val}`, '🌐');
    });
  }

  if (btnResetServerConfig) {
    btnResetServerConfig.addEventListener('click', () => {
      localStorage.removeItem('npay_server_url');
      CURRENT_SERVER_HOST = resolveServerHost();
      API_BASE = (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && !window.location.port))
        ? `${CURRENT_SERVER_HOST}/api`
        : '/api';
      if (inputCustomServerUrl) inputCustomServerUrl.value = CURRENT_SERVER_HOST;
      if (currentServerUrlDisplay) currentServerUrlDisplay.textContent = CURRENT_SERVER_HOST;
      showToast(`Reset to default: ${CURRENT_SERVER_HOST}`, '🔄');
    });
  }
}

// Camera Scanner Logic
async function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('QR Scanner loading...', '⏳');
    return;
  }
  try {
    qrScannerInstance = new Html5Qrcode("qrReaderContainer");
    const cameras = await Html5Qrcode.getCameras();
    if (cameras && cameras.length > 0) {
      const cameraId = cameras[cameras.length - 1].id;
      await qrScannerInstance.start(
        cameraId,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          stopCameraScanner();
          handleScannedQrResult(decodedText);
        },
        (error) => {}
      );
    } else {
      showToast('No camera found. Please upload QR image from gallery.', '📷');
    }
  } catch (err) {
    showToast('Camera access denied. Please upload QR image.', '📷');
  }
}

function stopCameraScanner() {
  if (qrScannerInstance) {
    qrScannerInstance.stop().then(() => {
      qrScannerInstance.clear();
      qrScannerInstance = null;
    }).catch(err => {
      qrScannerInstance = null;
    });
  }
}

async function handleScannedQrResult(rawQr) {
  modalScanner.classList.add('hidden');
  try {
    const res = await apiCall('/wallet/parse-qr', 'POST', { qrString: rawQr });
    if (res.vpa) {
      inputRecipientUpi.value = res.vpa;
      if (res.currency) selectSendCurrency.value = res.currency;
      if (res.amount) inputSendAmount.value = res.amount;
      if (res.note) inputSendNote.value = res.note;
      modalSendMoney.classList.remove('hidden');
      updateSendFeeCalculations();
      showToast(`Scanned: ${res.vpa}`, '🎯');
    }
  } catch (err) {
    if (rawQr.includes('@') || rawQr.startsWith('T')) {
      inputRecipientUpi.value = rawQr.trim();
      modalSendMoney.classList.remove('hidden');
      updateSendFeeCalculations();
      showToast(`Scanned: ${rawQr}`, '🎯');
    } else {
      showToast('Invalid QR Code. Not a recognized payment code.', '⚠️');
    }
  }
}
