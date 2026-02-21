    /* ---------- AUTH FORMS & INITIALISATION ---------- */
    document.addEventListener('DOMContentLoaded', function () {
      initHomeSlider();
      initNav();
      initProfileUI();
      initChatbotUI();
      initContactForm();

      function showPreAuthLanding() {
        var landing = document.getElementById('preAuthLanding');
        var authWrapper = document.getElementById('authWrapper');
        var appWrapper = document.getElementById('appWrapper');
        if (landing) landing.classList.remove('hidden');
        if (authWrapper) authWrapper.classList.add('hidden');
        if (appWrapper) appWrapper.classList.add('hidden');
      }

      function openAuth(mode) {
        var landing = document.getElementById('preAuthLanding');
        var authWrapper = document.getElementById('authWrapper');
        var appWrapper = document.getElementById('appWrapper');
        if (landing) landing.classList.add('hidden');
        if (authWrapper) authWrapper.classList.remove('hidden');
        if (appWrapper) appWrapper.classList.add('hidden');
        if (mode === 'register') showRegister();
        else showLogin();
      }

      // Listen to Firebase auth state changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          setCurrentUser(user);
          initAppForUser(user);
        } else {
          var params = new URLSearchParams(window.location.search);
          var mode = params.get('auth');
          if (mode === 'register') openAuth('register');
          else if (mode === 'login') openAuth('login');
          else showPreAuthLanding();
        }
      });

      var landingLoginBtn = document.getElementById('landingLoginBtn');
      var landingRegisterBtn = document.getElementById('landingRegisterBtn');
      var landingHeroLoginBtn = document.getElementById('landingHeroLoginBtn');
      var landingHeroRegisterBtn = document.getElementById('landingHeroRegisterBtn');
      var showRegisterBtn = document.getElementById('showRegisterBtn');
      var showLoginBtn = document.getElementById('showLoginBtn');
      var loginForm = document.getElementById('loginForm');
      var registerForm = document.getElementById('registerForm');
      var logoutBtn = document.getElementById('logoutBtn');

      if (landingLoginBtn) {
        landingLoginBtn.addEventListener('click', function () {
          openAuth('login');
        });
      }
      if (landingRegisterBtn) {
        landingRegisterBtn.addEventListener('click', function () {
          openAuth('register');
        });
      }
      if (landingHeroLoginBtn) {
        landingHeroLoginBtn.addEventListener('click', function () {
          openAuth('login');
        });
      }
      if (landingHeroRegisterBtn) {
        landingHeroRegisterBtn.addEventListener('click', function () {
          openAuth('register');
        });
      }

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
          showPreAuthLanding();
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
          var submitBtn = loginForm.querySelector('button[type="submit"]');
          var originalBtnText = submitBtn ? submitBtn.textContent : '';

          if (!email || !password) {
            if (msg) {
              msg.textContent = 'Please enter both email and password.';
              msg.style.color = '#c62828';
            }
            return;
          }

          try {
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = 'Logging in...';
            }
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
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalBtnText || 'Login';
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
          var submitBtn = registerForm.querySelector('button[type="submit"]');
          var originalBtnText = submitBtn ? submitBtn.textContent : '';

          if (!username || !name || !phone || !email || !password) {
            if (msg) {
              msg.textContent = 'Please fill all the fields.';
              msg.style.color = '#c62828';
            }
            return;
          }

          try {
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = 'Registering...';
            }
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
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalBtnText || 'Register';
            }
          }
        });
      }
    });
  
