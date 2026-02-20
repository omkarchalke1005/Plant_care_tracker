// app.js

// -------------------- FIREBASE AUTH HELPERS --------------------
let currentUser = null;

function setCurrentUser(user) {
  currentUser = user;
}

function getCurrentUser() {
  return currentUser;
}

function logout() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    window.location.href = 'login.html';
  });
}

// -------------------- FIREBASE DATA HELPERS --------------------
function setCurrentPlantId(id) {
  if (!currentUser) return;
  localStorage.setItem('pct_current_plant_' + currentUser.uid, String(id));
}

function getCurrentPlantId() {
  if (!currentUser) return null;
  return localStorage.getItem('pct_current_plant_' + currentUser.uid);
}
