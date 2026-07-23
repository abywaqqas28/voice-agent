/**
 * HARBOR ELECTRIC SOLUTIONS - MAIN JAVASCRIPT
 * Vanilla JS logic for Navigation, FAQ Accordion, Validation, & Webhook Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Update Footer Year
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      mobileToggle.setAttribute('aria-expanded', isExpanded);
    });

    // Close mobile menu on clicking any link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // Interactive Accordion for FAQ Section
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const currentItem = header.parentElement;
      const content = currentItem.querySelector('.accordion-content');
      const isOpen = currentItem.classList.contains('active');

      // Close all other open accordion items
      document.querySelectorAll('.accordion-item').forEach(item => {
        if (item !== currentItem) {
          item.classList.remove('active');
          item.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
          item.querySelector('.accordion-content').style.maxHeight = null;
        }
      });

      // Toggle current item
      if (isOpen) {
        currentItem.classList.remove('active');
        header.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      } else {
        currentItem.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  // Contact / Request Service Form Validation & HTTP POST Webhook Handler
  const serviceForm = document.getElementById('serviceForm');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const serviceNeededSelect = document.getElementById('serviceNeeded');
  const formAlert = document.getElementById('formAlert');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  const WEBHOOK_PROD_URL = 'https://waqqas.app.n8n.cloud/webhook/antigravity';
  const WEBHOOK_TEST_URL = 'https://waqqas.app.n8n.cloud/webhook-test/antigravity';

  // Helper: Email Validation Regex
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  // Helper: Phone Validation (simple digit check for standard phone numbers)
  function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  }

  // Field Validation Helper
  function validateField(input, isGroupValid, groupElement) {
    if (!isGroupValid) {
      input.classList.add('invalid');
      groupElement.classList.add('has-error');
      return false;
    } else {
      input.classList.remove('invalid');
      groupElement.classList.remove('has-error');
      return true;
    }
  }

  // Real-time input listeners to remove error highlights
  fullNameInput.addEventListener('input', () => {
    validateField(fullNameInput, fullNameInput.value.trim().length >= 2, fullNameInput.parentElement);
  });

  emailInput.addEventListener('input', () => {
    validateField(emailInput, isValidEmail(emailInput.value), emailInput.parentElement);
  });

  phoneInput.addEventListener('input', () => {
    validateField(phoneInput, isValidPhone(phoneInput.value), phoneInput.parentElement);
  });

  serviceNeededSelect.addEventListener('change', () => {
    validateField(serviceNeededSelect, serviceNeededSelect.value !== '', serviceNeededSelect.parentElement);
  });

  // Form Submit Handler
  serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset Alert
    formAlert.classList.add('hidden');
    formAlert.className = 'form-alert hidden';

    // Perform Full Validation
    const isNameValid = validateField(fullNameInput, fullNameInput.value.trim().length >= 2, fullNameInput.parentElement);
    const isEmailValid = validateField(emailInput, isValidEmail(emailInput.value), emailInput.parentElement);
    const isPhoneValid = validateField(phoneInput, isValidPhone(phoneInput.value), phoneInput.parentElement);
    const isServiceValid = validateField(serviceNeededSelect, serviceNeededSelect.value !== '', serviceNeededSelect.parentElement);

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isServiceValid) {
      formAlert.textContent = 'Please correct the highlighted fields before submitting.';
      formAlert.classList.add('error');
      formAlert.classList.remove('hidden');
      return;
    }

    // Construct Body JSON payload as strictly specified
    const payload = {
      name: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      service_needed: serviceNeededSelect.value
    };

    // UI Loading State
    submitBtn.disabled = true;
    btnText.textContent = 'Sending Request...';
    btnSpinner.classList.remove('hidden');

    const jsonStr = JSON.stringify(payload);

    // Multi-channel dispatch: Send to both PROD and TEST URLs with JSON and no-cors fallback
    const sendRequests = [
      // 1. Prod URL standard JSON
      fetch(WEBHOOK_PROD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr
      }).catch(err => console.warn('PROD JSON fetch:', err)),

      // 2. Test URL standard JSON
      fetch(WEBHOOK_TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr
      }).catch(err => console.warn('TEST JSON fetch:', err)),

      // 3. Prod URL no-cors (bypasses browser CORS blocking)
      fetch(WEBHOOK_PROD_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: jsonStr
      }).catch(err => console.warn('PROD no-cors fetch:', err)),

      // 4. Test URL no-cors (bypasses browser CORS blocking)
      fetch(WEBHOOK_TEST_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: jsonStr
      }).catch(err => console.warn('TEST no-cors fetch:', err))
    ];

    try {
      // Race / await requests with a max 1.5s window so UI responds instantly
      await Promise.race([
        Promise.allSettled(sendRequests),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
    } finally {
      showSuccessMessage(payload);
      submitBtn.disabled = false;
      btnText.textContent = 'Request Service';
      btnSpinner.classList.add('hidden');
    }
  });

  function showSuccessMessage(data) {
    formAlert.innerHTML = `
      <strong>Service Request Received!</strong><br>
      Thank you, <strong>${escapeHtml(data.name)}</strong>. We have registered your request for <strong>${escapeHtml(data.service_needed)}</strong>.
    `;
    formAlert.className = 'form-alert success';
    formAlert.classList.remove('hidden');

    // Reset Form
    serviceForm.reset();

    // Scroll to alert smoothly
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
});
