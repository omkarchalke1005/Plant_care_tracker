// NOTE: Load order before this file:
// 1) firebase-auth.js
// 2) firebase-data.js
// 3) app-auth.js
// 4) app-plants.js
// 5) app-dashboard-tracker.js
// 6) app-static.js
function installCustomAlertBackend() {
  if (window.__pctCustomAlertInstalled) return;
  window.__pctCustomAlertInstalled = true;
  var nativeAlert = window.alert;

  function ensureStyles() {
    if (document.getElementById('pctAlertStyles')) return;
    var style = document.createElement('style');
    style.id = 'pctAlertStyles';
    style.textContent =
      '.pct-alert-overlay{position:fixed;inset:0;background:rgba(8,22,13,.44);display:flex;align-items:center;justify-content:center;padding:18px;z-index:10000;}' +
      '.pct-alert-card{width:min(430px,100%);background:linear-gradient(145deg,#f6fff7,#e3f5e9);border:1px solid #b7ddc2;border-radius:18px;padding:16px;box-shadow:0 16px 40px rgba(13,61,33,.30);color:#154a2d;font-family:Segoe UI,Tahoma,sans-serif;}' +
      '.pct-alert-title{margin:0 0 10px 0;font-size:18px;font-weight:800;}' +
      '.pct-alert-msg{margin:0;white-space:pre-wrap;font-size:15px;line-height:1.5;}' +
      '.pct-alert-actions{margin-top:12px;display:flex;justify-content:flex-end;}' +
      '.pct-alert-ok{border:0;background:linear-gradient(180deg,#2fa45f,#248348);color:#fff;font-weight:700;padding:8px 18px;border-radius:10px;cursor:pointer;}';
    document.head.appendChild(style);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.alert = function (message) {
    if (!document.body) return nativeAlert(message);
    ensureStyles();

    var old = document.getElementById('pctAlertOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'pctAlertOverlay';
    overlay.className = 'pct-alert-overlay';
    overlay.innerHTML =
      '<div class="pct-alert-card">' +
        '<h3 class="pct-alert-title">Plant Care Tracker</h3>' +
        '<p class="pct-alert-msg">' + escapeHtml(message) + '</p>' +
        '<div class="pct-alert-actions"><button class="pct-alert-ok" type="button">OK</button></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var ok = overlay.querySelector('.pct-alert-ok');
    function closeAlert() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKeyDown);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Enter') closeAlert();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeAlert();
    });
    if (ok) ok.addEventListener('click', closeAlert);
    document.addEventListener('keydown', onKeyDown);
    if (ok) ok.focus();
  };
}

document.addEventListener('DOMContentLoaded', function () {
  installCustomAlertBackend();
  var page = document.body.getAttribute('data-page');

  if (page === 'login') {
    initLoginPage();
  } else if (page === 'register') {
    initRegisterPage();
  } else if (page === 'home') {
    initHomePage();
  } else if (page === 'library') {
    initLibraryPage();
  } else if (page === 'dashboard') {
    initDashboardPage();
  } else if (page === 'care-tracker') {
    initCareTrackerPage();
  } else if (page === 'contact') {
    initContactPage();
  } else if (page === 'about') {
    initAboutPage();
  }
});
