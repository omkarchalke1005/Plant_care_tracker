    /* ---------- AUTH FORMS & INITIALISATION ---------- */
    document.addEventListener('DOMContentLoaded', function () {
      initHomeSlider();
      initNav();
      initProfileUI();
      initChatbotUI();
      initContactForm();

      // Listen to Firebase auth state changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          setCurrentUser(user);
          initAppForUser(user);
        } else {
          var params = new URLSearchParams(window.location.search);
          if (params.get('auth') === 'register') showRegister();
          else showLogin();
        }
      });

      var showRegisterBtn = document.getElementById('showRegisterBtn');
      var showLoginBtn = document.getElementById('showLoginBtn');
      var loginForm = document.getElementById('loginForm');
      var registerForm = document.getElementById('registerForm');
      var logoutBtn = document.getElementById('logoutBtn');

      if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', function () {
          showRegister();
        });
      }
      if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function () {
          showLogin();
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
          await auth.signOut();
          var appWrapper = document.getElementById('appWrapper');
          var authWrapper = document.getElementById('authWrapper');
          if (appWrapper) appWrapper.classList.add('hidden');
          if (authWrapper) authWrapper.classList.remove('hidden');
          showLogin();
        });
      }

      if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var emailInput = document.getElementById('loginEmail');
          var passwordInput = document.getElementById('loginPassword');
          var msg = document.getElementById('loginMessage');

          var email = emailInput ? emailInput.value.trim() : '';
          var password = passwordInput ? passwordInput.value : '';

          if (!email || !password) {
            if (msg) {
              msg.textContent = 'Please enter both email and password.';
              msg.style.color = '#c62828';
            }
            return;
          }

          try {
            await auth.signInWithEmailAndPassword(email, password);
            if (msg) {
              msg.textContent = '';
            }
          } catch (error) {
            console.error('Login error:', error);
            if (msg) {
              msg.textContent = 'Invalid email or password.';
              msg.style.color = '#c62828';
            }
          }
        });
      }

      if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var uInput = document.getElementById('regUsername');
          var nInput = document.getElementById('regName');
          var pInput = document.getElementById('regPhone');
          var eInput = document.getElementById('regEmail');
          var pwInput = document.getElementById('regPassword');
          var msg = document.getElementById('registerMessage');

          var username = uInput ? uInput.value.trim() : '';
          var name = nInput ? nInput.value.trim() : '';
          var phone = pInput ? pInput.value.trim() : '';
          var email = eInput ? eInput.value.trim() : '';
          var password = pwInput ? pwInput.value : '';

          if (!username || !name || !phone || !email || !password) {
            if (msg) {
              msg.textContent = 'Please fill all the fields.';
              msg.style.color = '#c62828';
            }
            return;
          }

          try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save additional user data to Firestore
            await db.collection('users').doc(user.uid).set({
              username: username,
              name: name,
              phone: phone,
              email: email,
              createdAt: todayStr()
            });

            if (msg) {
              msg.textContent = '';
            }
          } catch (error) {
            console.error('Registration error:', error);
            if (msg) {
              msg.textContent = 'Registration failed. Email may already be in use.';
              msg.style.color = '#c62828';
            }
          }
        });
      }
    });
  
