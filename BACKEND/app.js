// NOTE: Load order before this file:
// 1) firebase-auth.js
// 2) firebase-data.js
// 3) app-auth.js
// 4) app-plants.js
// 5) app-dashboard-tracker.js
// 6) app-static.js
document.addEventListener('DOMContentLoaded', function () {
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




