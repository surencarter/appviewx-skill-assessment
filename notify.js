/**
 * AppViewX Academy — "Notify Me" widget for the Certifications section.
 *
 * Inject via Skilljar Global Code Snippet:
 *   <script src="https://appviewx-skill-assessment.vercel.app/notify.js" defer></script>
 *
 * The script auto-detects the certifications box by:
 *   1. An element with  data-avx-notify="certifications"  (manual override — add this
 *      attribute in Skilljar's HTML editor for the exact element if auto-detect misses it)
 *   2. Any heading/title element whose text contains "certification" (case-insensitive),
 *      then climbs to the nearest card/section ancestor
 */
(function () {
  if (window.__avxNotify) return;
  window.__avxNotify = true;

  var API = 'https://appviewx-skill-assessment.vercel.app/api/notify';

  /* ── Styles ──────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent =
    '#avx-notify-wrap{' +
      'margin-top:18px!important;padding-top:16px!important;' +
      'border-top:1px solid rgba(0,0,0,.09)!important;' +
      'font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;' +
    '}' +
    '#avx-notify-label{' +
      'font-size:12px!important;font-weight:600!important;letter-spacing:.04em!important;' +
      'text-transform:uppercase!important;color:#6B7280!important;margin-bottom:8px!important;' +
      'display:block!important;' +
    '}' +
    '#avx-notify-cta{' +
      'display:inline-flex!important;align-items:center!important;gap:6px!important;' +
      'background:linear-gradient(135deg,#5B21B6,#4F46E5)!important;' +
      'color:#fff!important;border:none!important;border-radius:8px!important;' +
      'padding:9px 18px!important;font-size:13.5px!important;font-weight:600!important;' +
      'cursor:pointer!important;transition:opacity .15s!important;' +
      'font-family:inherit!important;' +
    '}' +
    '#avx-notify-cta:hover{opacity:.88!important;}' +
    '#avx-notify-form-row{' +
      'display:none!important;align-items:center!important;gap:8px!important;' +
      'flex-wrap:wrap!important;margin-top:2px!important;' +
    '}' +
    '#avx-notify-form-row.show{display:flex!important;}' +
    '#avx-notify-email{' +
      'flex:1!important;min-width:180px!important;max-width:300px!important;' +
      'border:1.5px solid #D1D5DB!important;border-radius:8px!important;' +
      'padding:8px 12px!important;font-size:13px!important;font-family:inherit!important;' +
      'outline:none!important;color:#111827!important;background:#fff!important;' +
      'transition:border-color .15s!important;' +
    '}' +
    '#avx-notify-email:focus{border-color:#5B21B6!important;}' +
    '#avx-notify-email::placeholder{color:#9CA3AF!important;}' +
    '#avx-notify-submit{' +
      'background:linear-gradient(135deg,#5B21B6,#4F46E5)!important;' +
      'color:#fff!important;border:none!important;border-radius:8px!important;' +
      'padding:8px 16px!important;font-size:13px!important;font-weight:600!important;' +
      'cursor:pointer!important;font-family:inherit!important;transition:opacity .15s!important;' +
      'white-space:nowrap!important;' +
    '}' +
    '#avx-notify-submit:hover{opacity:.88!important;}' +
    '#avx-notify-submit:disabled{opacity:.5!important;cursor:not-allowed!important;}' +
    '#avx-notify-msg{' +
      'font-size:13px!important;margin-top:8px!important;display:none!important;' +
      'padding:8px 12px!important;border-radius:8px!important;' +
    '}' +
    '#avx-notify-msg.success{' +
      'background:#ECFDF5!important;color:#065F46!important;display:block!important;' +
    '}' +
    '#avx-notify-msg.error{' +
      'background:#FEF2F2!important;color:#991B1B!important;display:block!important;' +
    '}';
  document.head.appendChild(style);

  /* ── Find target element ─────────────────────────────────────── */
  function findTarget() {
    // 1. Manual override: data-avx-notify="certifications"
    var manual = document.querySelector('[data-avx-notify="certifications"]');
    if (manual) return manual;

    // 2. Auto-detect: heading containing "certification"
    var headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"],[class*="name"]');
    for (var i = 0; i < headings.length; i++) {
      var el = headings[i];
      if (/certif/i.test(el.textContent)) {
        // Climb to nearest card/section-like ancestor (max 5 levels)
        var parent = el.parentElement;
        for (var j = 0; j < 5 && parent && parent !== document.body; j++) {
          var cls = (parent.className || '').toLowerCase();
          var tag = parent.tagName.toLowerCase();
          if (/card|section|box|panel|tile|product|course|widget|block|item/.test(cls) ||
              tag === 'section' || tag === 'article' || tag === 'aside') {
            return parent;
          }
          parent = parent.parentElement;
        }
        // No semantic ancestor found — use direct parent
        return el.parentElement;
      }
    }
    return null;
  }

  /* ── Build widget ────────────────────────────────────────────── */
  function buildWidget(target) {
    if (document.getElementById('avx-notify-wrap')) return;

    var wrap = document.createElement('div');
    wrap.id = 'avx-notify-wrap';
    wrap.innerHTML =
      '<span id="avx-notify-label">Certifications Coming Soon</span>' +
      '<button id="avx-notify-cta" type="button">' +
        '<span>&#128276;</span> Notify Me' +
      '</button>' +
      '<div id="avx-notify-form-row">' +
        '<input id="avx-notify-email" type="email" placeholder="Enter your email address" autocomplete="email" />' +
        '<button id="avx-notify-submit" type="button">Send</button>' +
      '</div>' +
      '<div id="avx-notify-msg"></div>';

    target.appendChild(wrap);

    var cta    = document.getElementById('avx-notify-cta');
    var row    = document.getElementById('avx-notify-form-row');
    var input  = document.getElementById('avx-notify-email');
    var submit = document.getElementById('avx-notify-submit');
    var msg    = document.getElementById('avx-notify-msg');

    cta.addEventListener('click', function () {
      cta.style.display = 'none';
      row.classList.add('show');
      input.focus();
    });

    submit.addEventListener('click', sendNotify);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendNotify();
    });

    function sendNotify() {
      var email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg('error', 'Please enter a valid email address.');
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Sending…';

      fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email, source: 'certifications' }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            row.style.display = 'none';
            showMsg(
              'success',
              d.duplicate
                ? "You're already on the list! We'll email you when certifications go live. 🎓"
                : "You're on the list! We'll email you the moment AppViewX certifications go live. 🎓"
            );
          } else {
            submit.disabled = false;
            submit.textContent = 'Send';
            showMsg('error', d.error || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () {
          submit.disabled = false;
          submit.textContent = 'Send';
          showMsg('error', 'Could not connect. Please check your internet connection.');
        });
    }

    function showMsg(type, text) {
      msg.className = type;
      msg.textContent = text;
    }
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    var target = findTarget();
    if (target) {
      buildWidget(target);
    } else {
      // Retry once after a short delay for JS-rendered pages
      setTimeout(function () {
        var t = findTarget();
        if (t) buildWidget(t);
      }, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
