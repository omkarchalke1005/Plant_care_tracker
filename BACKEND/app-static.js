// -------------------- CONTACT PAGE --------------------
function initContactPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.yourName.value.trim();
    var email = form.yourEmail.value.trim();
    var message = form.yourMessage.value.trim();

    if (!name || !email || !message) {
      alert('Please fill all fields before sending.');
      return;
    }

    // Use mailto link to open default email app
    var subject = encodeURIComponent('Plant Care Tracker Support Request');
    var body = encodeURIComponent(
      'Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message
    );
    var mailto = 'mailto:omkarplantcaretracker@gmail.com?subject=' + subject + '&body=' + body;
    window.location.href = mailto;

    alert('Your message is prepared in your email app. Thank you!');
    form.reset();
  });
}

// -------------------- ABOUT PAGE --------------------
function initAboutPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();
  // Static content only
}

