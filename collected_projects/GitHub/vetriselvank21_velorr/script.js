/* =========================================================
   VELORR INDUSTRIES — SITE SCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  /* ---------------------------------------------------------
     Footer year
     --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     Mobile navigation toggle
     --------------------------------------------------------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close the mobile menu after a link is tapped
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------
     "Enquire Now" product buttons: pre-select the product
     in the enquiry form and scroll to it
     --------------------------------------------------------- */
  var productLinks = document.querySelectorAll("[data-product]");
  var productSelect = document.getElementById("product");

  productLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (productSelect) {
        productSelect.value = link.getAttribute("data-product");
      }
    });
  });

  /* ---------------------------------------------------------
     Enquiry form submission
     ---------------------------------------------------------
     Until Google Forms is connected (see the CONFIG block
     below), submitting the form opens WhatsApp with a
     pre-filled enquiry message built from the form fields.
     --------------------------------------------------------- */
  var enquiryForm = document.getElementById("enquiryForm");
  var formStatus = document.getElementById("formStatus");
  var waFallbackLink = document.getElementById("waFallbackLink");
  var WHATSAPP_NUMBER = "917550399569";

  function buildWhatsAppMessage(data) {
    var lines = [
      "Hello Velorr Industries,",
      "",
      "I would like to enquire about your building materials.",
      "",
      "Name: " + (data.fullName || "-"),
      "Phone: " + (data.phone || "-"),
      "Product: " + (data.product || "-"),
      "Quantity: " + (data.quantity || "-"),
      "Delivery Location: " + (data.location || "-"),
      "Requirement Date: " + (data.reqDate || "-"),
      "Message: " + (data.message || "-"),
      "",
      "Please share the price and availability.",
      "",
      "Thank you."
    ];
    return lines.join("\n");
  }

  if (enquiryForm) {
    enquiryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!enquiryForm.checkValidity()) {
        enquiryForm.reportValidity();
        return;
      }

      var data = {
        fullName: document.getElementById("fullName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        product: document.getElementById("product").value,
        quantity: document.getElementById("quantity").value.trim(),
        location: document.getElementById("location").value.trim(),
        reqDate: document.getElementById("reqDate").value,
        message: document.getElementById("message").value.trim()
      };

      /* =====================================================
         GOOGLE FORMS INTEGRATION — CONFIGURE HERE
         =====================================================
         Once you have created your Google Form:

         1. Open the form in edit mode, click the three dots
            menu, and choose "Get pre-filled link". Fill in
            sample answers for every field, click "Get link",
            and copy the long URL you're given.

         2. From that pre-filled link, note down:
              - The form's submission URL. Take the copied
                link and replace "viewform" with
                "formResponse", e.g.:
                https://docs.google.com/forms/d/e/XXXXXXX/formResponse
              - Each field's entry ID, which appears in the
                pre-filled link as "entry.123456789=...".
                Match each entry ID to the correct field below.

         3. Paste the submission URL into GOOGLE_FORM_URL and
            the entry IDs into GOOGLE_FORM_ENTRIES below, then
            set GOOGLE_FORM_ENABLED to true.

         Until this is configured, GOOGLE_FORM_ENABLED stays
         false and the form falls back to opening WhatsApp
         with the enquiry pre-filled instead.
         ===================================================== */
      var GOOGLE_FORM_ENABLED = false;
      var GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/formResponse";
      var GOOGLE_FORM_ENTRIES = {
        fullName: "entry.REPLACE_ME",
        phone: "entry.REPLACE_ME",
        product: "entry.REPLACE_ME",
        quantity: "entry.REPLACE_ME",
        location: "entry.REPLACE_ME",
        reqDate: "entry.REPLACE_ME",
        message: "entry.REPLACE_ME"
      };

      if (GOOGLE_FORM_ENABLED) {
        // Submit to Google Forms in the background (no-cors: we can't
        // read the response, but the submission still goes through).
        var formData = new FormData();
        Object.keys(GOOGLE_FORM_ENTRIES).forEach(function (key) {
          formData.append(GOOGLE_FORM_ENTRIES[key], data[key] || "");
        });

        fetch(GOOGLE_FORM_URL, {
          method: "POST",
          mode: "no-cors",
          body: formData
        }).catch(function () {
          // Submission errors are not visible in no-cors mode;
          // WhatsApp fallback below still gives the customer a
          // way to reach you directly.
        });

        showStatus("Thank you, " + (data.fullName || "there") + ". Your enquiry has been submitted.");
        enquiryForm.reset();
      } else {
        // Fallback: open WhatsApp with the enquiry pre-filled
        var message = buildWhatsAppMessage(data);
        var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
        window.open(url, "_blank", "noopener");
        showStatus("Opening WhatsApp with your enquiry details. Please tap send there to reach us.");
      }
    });
  }

  function showStatus(text) {
    if (!formStatus) return;
    formStatus.textContent = text;
    formStatus.classList.add("is-visible");
  }

  /* Keep the standalone "Get a Quote on WhatsApp" link working
     as a plain link even if product/quantity fields are filled,
     since it intentionally opens a generic enquiry chat. */
  if (waFallbackLink) {
    waFallbackLink.addEventListener("click", function () {
      // no-op: default link behavior is fine, kept here as an
      // extension point if a pre-filled version is wanted later.
    });
  }

});
