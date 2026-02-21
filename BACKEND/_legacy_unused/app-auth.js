// NOTE: Load `firebase-auth.js` and `firebase-data.js` before this file.
// -------------------- PAGE INITIALIZERS --------------------
function initLoginPage() {
  var form = document.getElementById('loginForm');
  var messageBox = document.getElementById('authMessage');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = form.username.value.trim();
    var password = form.password.value.trim();

    if (!username || !password) {
      messageBox.textContent = 'Please fill all fields.';
      messageBox.style.color = 'red';
      return;
    }

    // Use Firebase Auth with email (username + domain)
    var email = username + '@planttracker.com';
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        messageBox.textContent = 'Login successful!';
        messageBox.style.color = 'green';
        setCurrentUser(userCredential.user);
        window.location.href = 'home.html';
      })
      .catch((error) => {
        messageBox.textContent = error.message;
        messageBox.style.color = 'red';
      });
  });
}

function initRegisterPage() {
  var form = document.getElementById('registerForm');
  var messageBox = document.getElementById('authMessage');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = form.username.value.trim();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var password = form.password.value.trim();

    if (!username || !name || !email || !password) {
      messageBox.textContent = 'Please fill all fields.';
      messageBox.style.color = 'red';
      return;
    }

    // Use Firebase Auth
    var authEmail = username + '@planttracker.com';
    firebase.auth().createUserWithEmailAndPassword(authEmail, password)
      .then((userCredential) => {
        // Save user profile to Firestore
        return db.collection('users').doc(userCredential.user.uid).set({
          username: username,
          name: name,
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        messageBox.textContent = 'Registered successfully! You can login now.';
        messageBox.style.color = 'green';
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      })
      .catch((error) => {
        messageBox.textContent = error.message;
        messageBox.style.color = 'red';
      });
  });
}

function setupNavbarForLoggedInUser() {
  var user = getCurrentUser();
  if (!user) return;
  var display = document.getElementById('usernameDisplay');
  var logoutBtn = document.getElementById('logoutBtn');
  if (display) {
    display.textContent = 'Hi, ' + (user.displayName || user.email.split('@')[0]);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      logout();
    });
  }
}

// Require login for protected pages
function requireLogin() {
  var user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

