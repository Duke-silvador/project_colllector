(function () {
  'use strict';

  function ready() {
    initNavigation();
    initQuoteForm();
  }

  function initNavigation() {
    const toggle = document.getElementById('nav-toggle');
    const navigation = document.getElementById('primary-nav');
    if (!toggle || !navigation) return;

    function setOpen(open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      navigation.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      if (returnFocus) toggle.focus();
    }

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    toggle.setAttribute('aria-controls', navigation.id);
    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    navigation.addEventListener('click', function (event) {
      if (event.target instanceof Element && event.target.closest('a[href]')) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false, true);
      }
    });

    document.addEventListener('pointerdown', function (event) {
      if (isOpen() && !navigation.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });

    window.addEventListener('resize', function () {
      if (isOpen() && window.getComputedStyle(toggle).display === 'none') {
        setOpen(false);
      }
    });

    // Anchor links retain native browser behavior; no scripted scrolling or motion.
  }

  function initQuoteForm() {
    const form = document.getElementById('quote-form');
    if (!form) return;

    const status = document.getElementById('form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const fieldNames = ['pickup', 'destination', 'details', 'vehicle', 'name', 'contact'];
    const config = window.SHAREDTRUCKS_CONFIG || {};
    const accessKey = typeof config.web3formsAccessKey === 'string'
      ? config.web3formsAccessKey.trim() : '';
    let submitting = false;

    function setButtonLabel(text) {
      if (!submitButton) return;
      const label = submitButton.querySelector('#quote-submit-label, [data-submit-label]');
      (label || submitButton).textContent = text;
    }

    function setStatus(message, state, focus) {
      if (!status) return;
      const isError = state === 'error';
      status.setAttribute('role', isError ? 'alert' : 'status');
      status.setAttribute('aria-live', isError ? 'assertive' : 'polite');
      status.setAttribute('aria-atomic', 'true');
      status.dataset.state = state || 'info';
      status.textContent = message;
      if (focus) status.focus();
    }

    function detailsChanged(event) {
      const field = event.target;
      if (field && typeof field.setCustomValidity === 'function') {
        field.setCustomValidity('');
        field.removeAttribute('aria-invalid');
      }
      if (!submitting && status && status.dataset.state === 'success') setStatus('');
    }

    form.addEventListener('input', detailsChanged);
    form.addEventListener('change', detailsChanged);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (submitting) return;
      if (!accessKey) {
        setStatus('The enquiry form is temporarily unavailable. Please try again later.', 'error', true);
        return;
      }

      const data = {};
      fieldNames.forEach(function (name) {
        const field = form.elements.namedItem(name);
        const value = field && 'value' in field ? String(field.value).trim() : '';
        data[name] = value;
        if (field && 'value' in field) field.value = value;
        if (field && typeof field.setCustomValidity === 'function') {
          field.setCustomValidity('');
          field.removeAttribute('aria-invalid');
        }
      });

      const contactField = form.elements.namedItem('contact');
      if (data.contact && !isEmail(data.contact) && !isPhone(data.contact)) {
        if (contactField && typeof contactField.setCustomValidity === 'function') {
          contactField.setCustomValidity('Enter a phone number or email address so we can contact you.');
          contactField.setAttribute('aria-invalid', 'true');
        }
      }

      if (!form.checkValidity()) {
        fieldNames.forEach(function (name) {
          const field = form.elements.namedItem(name);
          if (field && field.validity && !field.validity.valid) {
            field.setAttribute('aria-invalid', 'true');
          }
        });
        setStatus('Please check the highlighted fields.', 'error');
        form.reportValidity();
        return;
      }

      const vehicleField = form.elements.namedItem('vehicle');
      if (vehicleField instanceof HTMLSelectElement) {
        const selected = vehicleField.selectedOptions[0];
        data.vehicle = selected ? selected.textContent.trim() : data.vehicle;
      }
      if (!data.vehicle) data.vehicle = 'Please recommend a suitable vehicle';

      const honeypot = form.elements.namedItem('botcheck');
      const payload = Object.assign({
        access_key: accessKey,
        subject: 'SharedTrucks — new shipment enquiry',
        from_name: 'SharedTrucks Logistics',
        botcheck: Boolean(honeypot && honeypot.checked)
      }, data);
      if (isEmail(data.contact)) {
        payload.email = data.contact;
        payload.replyto = data.contact;
      }

      submitting = true;
      const controlStates = Array.from(form.elements)
        .filter(function (field) { return 'disabled' in field; })
        .map(function (field) { return { field: field, disabled: field.disabled }; });
      controlStates.forEach(function (item) { item.field.disabled = true; });
      form.setAttribute('aria-busy', 'true');
      setButtonLabel('Sending…');
      setStatus('Sending your enquiry…', 'pending');
      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 20000);

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        const result = await response.json();
        const outcome = submissionOutcome(response, result);
        if (outcome !== 'success') {
          const error = new Error('Enquiry not confirmed');
          error.enquiryOutcome = outcome;
          throw error;
        }
        form.reset();
        setStatus('Your enquiry has been submitted. Our team will contact you.', 'success');
      } catch (error) {
        if (error && error.enquiryOutcome === 'setup') {
          setStatus('Your enquiry has not been sent. The form is not ready to receive messages yet. Please try again later.', 'error', true);
        } else {
          setStatus('We couldn’t confirm that your enquiry was received. Your details are still in the form. Please try again.', 'error', true);
        }
      } finally {
        window.clearTimeout(timeout);
        controlStates.forEach(function (item) { item.field.disabled = item.disabled; });
        submitting = false;
        form.setAttribute('aria-busy', 'false');
        setButtonLabel('Send enquiry');
      }
    });

    setButtonLabel('Send enquiry');
    // The HTML button stays disabled until both the handler and a form key are ready.
    if (submitButton) submitButton.disabled = !accessKey;
    if (!accessKey) {
      setStatus('The enquiry form is temporarily unavailable. Please try again later.');
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isPhone(value) {
    return /^\+?[\d\s().-]+$/.test(value)
      && value.replace(/\D/g, '').length >= 7
      && value.replace(/\D/g, '').length <= 15;
  }

  function submissionOutcome(response, result) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return 'error';
    const message = [result.message, result.error]
      .filter(function (value) { return typeof value === 'string'; }).join(' ');
    if (/\bactivat(?:e[ds]?|ion)\b|\bunverified\b|\bverification\b|\bverify\b|\baccess[ _-]?key\b/i.test(message)) {
      return 'setup';
    }
    if (!response.ok || result.success !== true || result.error
      || /\b(?:failed|failure|invalid|rejected|blocked|error)\b|\bnot (?:sent|submitted|accepted)\b/i.test(message)) {
      return 'error';
    }
    return 'success';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
}());
