(function () {
  if (window.__avxWidget) return;
  window.__avxWidget = true;

  var API  = 'https://appviewx-skill-assessment.vercel.app/api/chat';
  var ICON = 'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2Fa9lh53olunxmywo86nor5h626%2Fpublic%2F1789181125%2Flogo-only.1789181124942.png';
  var messages = [];
  var isOpen   = false;
  var isTyping = false;
  var isMax    = false;
  var convId   = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  var STARTERS = [
    'What are the Foundational Courses?',
    'How long are the Professional Courses?',
    'What does AVX Automation cover?',
    "I'm new to AppViewX, where do I start?",
  ];

  /* ── CSS ─────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#avx-btn{',
      'all:unset;',
      'position:fixed!important;bottom:24px!important;right:24px!important;',
      'z-index:2147483647!important;',
      'width:56px!important;height:56px!important;border-radius:50%!important;',
      'background:#fff url("' + ICON + '") no-repeat center/62%!important;',
      'box-shadow:0 4px 20px rgba(0,0,0,.18)!important;',
      'cursor:pointer!important;',
      'transition:transform .18s,box-shadow .18s!important;',
      'border:none!important;outline:none!important;',
      'font-size:0!important;',
    '}',
    '#avx-btn.avx-open{',
      'background:#5B21B6!important;',
      'font-size:22px!important;color:#fff!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
    '}',
    '#avx-btn:hover{transform:scale(1.08)!important;box-shadow:0 6px 24px rgba(0,0,0,.22)!important;}',

    '#avx-win{',
      'position:fixed!important;bottom:90px!important;right:24px!important;',
      'z-index:2147483646!important;',
      'width:380px!important;max-width:calc(100vw - 32px)!important;',
      'height:560px!important;max-height:calc(100vh - 110px)!important;min-height:300px!important;',
      'background:#F5F6F7!important;border-radius:16px!important;',
      'box-shadow:0 8px 40px rgba(0,0,0,.18)!important;',
      'display:flex!important;flex-direction:column!important;overflow:clip!important;',
      'font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;',
      'font-size:14px!important;',
      'transition:opacity .2s,transform .2s,width .25s,height .25s!important;',
      'transform-origin:bottom right!important;',
    '}',
    '#avx-win.avx-hidden{opacity:0!important;transform:scale(.92) translateY(8px)!important;pointer-events:none!important;}',
    '#avx-win.avx-max{width:min(680px,calc(100vw - 32px))!important;height:min(720px,calc(100vh - 110px))!important;}',

    /* Header */
    '#avx-hdr{',
      'background:linear-gradient(135deg,#5B21B6,#4F46E5)!important;',
      'padding:12px 14px!important;display:flex!important;align-items:center!important;',
      'gap:10px!important;flex-shrink:0!important;border-radius:16px 16px 0 0!important;',
    '}',
    '#avx-hdr-ic{',
      'width:36px!important;height:36px!important;border-radius:10px!important;',
      'background:#fff!important;padding:5px!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;',
      'overflow:hidden!important;',
    '}',
    '#avx-hdr-ic img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;}',
    '#avx-hdr-txt{flex:1!important;min-width:0!important;}',
    '#avx-hdr-name{color:#fff!important;font-size:14px!important;font-weight:700!important;margin:0!important;line-height:1.25!important;}',
    '#avx-hdr-btns{display:flex!important;gap:4px!important;align-items:center!important;}',
    '#avx-clr,#avx-max,#avx-cls{',
      'all:unset;position:relative!important;overflow:hidden!important;',
      'width:32px!important;height:32px!important;border-radius:8px!important;',
      'background:rgba(255,255,255,.18)!important;',
      'border:1px solid rgba(255,255,255,.35)!important;',
      'color:#fff!important;',
      'cursor:pointer!important;display:flex!important;align-items:center!important;',
      'justify-content:center!important;font-size:15px!important;',
      'flex-shrink:0!important;transition:background .15s,border-color .15s!important;',
    '}',
    '#avx-clr:hover,#avx-max:hover,#avx-cls:hover{background:rgba(255,255,255,.32)!important;border-color:rgba(255,255,255,.6)!important;}',

    /* Messages area */
    '#avx-msgs{',
      'flex:1!important;min-height:80px!important;overflow-y:auto!important;',
      'padding:16px 14px 8px!important;',
      'display:flex!important;flex-direction:column!important;gap:4px!important;',
      'background:#F5F6F7!important;',
      '-webkit-overflow-scrolling:touch!important;',
      'overscroll-behavior:contain!important;',
      'touch-action:pan-y!important;',
      'scrollbar-gutter:stable!important;',
    '}',
    '#avx-msgs::-webkit-scrollbar{width:4px!important;}',
    '#avx-msgs::-webkit-scrollbar-thumb{background:#D1D5DB!important;border-radius:4px!important;}',
    '#avx-msgs::-webkit-scrollbar-track{background:transparent!important;}',

    /* User messages */
    '.avx-u{',
      'max-width:82%!important;padding:10px 14px!important;border-radius:18px!important;border-bottom-right-radius:4px!important;',
      'font-size:13.5px!important;line-height:1.6!important;word-break:break-word!important;',
      'background:linear-gradient(135deg,#5B21B6,#4F46E5)!important;',
      'color:#fff!important;align-self:flex-end!important;margin-left:auto!important;',
      'margin-bottom:8px!important;flex-shrink:0!important;display:block!important;',
    '}',

    /* Bot message row (avatar + bubble + actions) */
    '.avx-row-b{',
      'display:flex!important;align-items:flex-start!important;gap:8px!important;',
      'align-self:flex-start!important;max-width:92%!important;margin-bottom:4px!important;flex-shrink:0!important;',
    '}',
    '.avx-av{',
      'width:28px!important;height:28px!important;border-radius:8px!important;flex-shrink:0!important;',
      'background:#fff!important;padding:3px!important;margin-top:2px!important;',
      'box-shadow:0 1px 3px rgba(0,0,0,.1)!important;overflow:hidden!important;',
    '}',
    '.avx-av img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;}',
    '.avx-b-wrap{display:flex!important;flex-direction:column!important;gap:4px!important;min-width:0!important;}',
    '.avx-b{',
      'padding:10px 14px!important;border-radius:18px!important;border-bottom-left-radius:4px!important;',
      'font-size:13.5px!important;line-height:1.6!important;word-break:break-word!important;',
      'background:#fff!important;color:#1F2937!important;',
      'box-shadow:0 1px 3px rgba(0,0,0,.08)!important;',
      'display:block!important;',
    '}',
    '.avx-b strong{font-weight:600!important;color:#111!important;}',
    '.avx-b em{font-style:italic!important;}',
    '.avx-b a{color:#5B21B6!important;text-decoration:underline!important;}',
    '.avx-b a:hover{opacity:.8!important;}',
    '.avx-b ul,.avx-b ol{padding-left:18px!important;margin:6px 0!important;}',
    '.avx-b li{margin:3px 0!important;}',
    '.avx-b p{margin:4px 0!important;}',
    '.avx-b p:first-child{margin-top:0!important;}',
    '.avx-b p:last-child{margin-bottom:0!important;}',
    '.avx-b code{background:#F3F4F6!important;padding:1px 5px!important;border-radius:4px!important;font-size:12px!important;font-family:monospace!important;}',
    '.avx-b .avx-h{display:block!important;font-weight:700!important;margin:8px 0 4px!important;color:#111!important;font-size:14px!important;}',

    /* Tables */
    '.avx-tbl-wrap{overflow-x:auto!important;margin:8px 0!important;border-radius:8px!important;border:1px solid #E5E7EB!important;}',
    '.avx-tbl{width:100%!important;border-collapse:collapse!important;font-size:12.5px!important;}',
    '.avx-tbl th{background:#F3F4F6!important;font-weight:600!important;color:#374151!important;padding:7px 12px!important;text-align:left!important;border-bottom:1px solid #E5E7EB!important;white-space:nowrap!important;}',
    '.avx-tbl td{padding:6px 12px!important;color:#1F2937!important;border-bottom:1px solid #F3F4F6!important;}',
    '.avx-tbl tr:last-child td{border-bottom:none!important;}',
    '.avx-tbl tr:hover td{background:#FAFAFA!important;}',

    /* Copy button */
    '.avx-msg-actions{display:flex!important;gap:4px!important;padding:0 2px!important;}',
    '.avx-copy-btn{',
      'all:unset;cursor:pointer!important;position:relative!important;',
      'font-size:11px!important;color:#9CA3AF!important;',
      'display:flex!important;align-items:center!important;gap:3px!important;',
      'padding:2px 6px!important;border-radius:5px!important;',
      'transition:color .15s,background .15s!important;',
      'overflow:hidden!important;',
    '}',
    '.avx-copy-btn:hover{color:#5B21B6!important;background:#EDE9FE!important;}',
    '.avx-copy-btn.copied{color:#059669!important;background:#D1FAE5!important;}',

    /* Typing indicator */
    '#avx-typ{',
      'display:flex!important;align-items:flex-start!important;gap:8px!important;',
      'align-self:flex-start!important;flex-shrink:0!important;',
    '}',
    '#avx-typ-av{',
      'width:28px!important;height:28px!important;border-radius:8px!important;flex-shrink:0!important;',
      'background:#fff!important;padding:3px!important;margin-top:2px!important;',
      'box-shadow:0 1px 3px rgba(0,0,0,.1)!important;overflow:hidden!important;',
    '}',
    '#avx-typ-av img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;}',
    '#avx-typ-dots{',
      'background:#fff!important;',
      'border-radius:18px!important;border-bottom-left-radius:4px!important;',
      'box-shadow:0 1px 3px rgba(0,0,0,.08)!important;',
      'padding:12px 16px!important;display:flex!important;gap:5px!important;align-items:center!important;',
    '}',
    '#avx-typ.avx-typ-hide{display:none!important;}',
    '.avx-dot{width:7px!important;height:7px!important;border-radius:50%!important;background:#C4B5FD!important;animation:avxb 1.2s infinite!important;}',
    '.avx-dot:nth-child(2){animation-delay:.2s!important;}',
    '.avx-dot:nth-child(3){animation-delay:.4s!important;}',
    '@keyframes avxb{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}',

    /* Starter questions */
    '#avx-starters{',
      'display:flex!important;flex-wrap:wrap!important;gap:7px!important;',
      'padding:4px 0 10px!important;align-self:flex-start!important;width:100%!important;flex-shrink:0!important;',
    '}',
    '.avx-starter{',
      'all:unset;cursor:pointer!important;position:relative!important;overflow:hidden!important;',
      'font-size:12px!important;color:#5B21B6!important;',
      'background:#EDE9FE!important;border-radius:20px!important;',
      'padding:5px 12px!important;line-height:1.4!important;',
      'transition:background .15s,color .15s!important;',
      'max-width:100%!important;word-break:break-word!important;',
    '}',
    '.avx-starter:hover{background:#5B21B6!important;color:#fff!important;}',

    /* Footer */
    '#avx-foot-row{',
      'display:flex!important;gap:8px!important;padding:10px 12px!important;',
      'border-top:1px solid #E5E7EB!important;background:#fff!important;',
      'flex-shrink:0!important;align-items:flex-end!important;',
    '}',
    '#avx-inp{',
      'flex:1!important;border:1.5px solid #E5E7EB!important;border-radius:10px!important;',
      'padding:9px 12px!important;font-size:13px!important;font-family:inherit!important;',
      'resize:none!important;outline:none!important;background:#F9FAFB!important;',
      'color:#1F2937!important;line-height:1.45!important;max-height:90px!important;overflow-y:auto!important;',
      'transition:border-color .15s!important;',
    '}',
    '#avx-inp:focus{border-color:#5B21B6!important;background:#fff!important;}',
    '#avx-inp::placeholder{color:#9CA3AF!important;}',
    '#avx-snd{',
      'all:unset;position:relative!important;',
      'width:36px!important;height:36px!important;border-radius:9px!important;',
      'background:linear-gradient(135deg,#5B21B6,#4F46E5)!important;',
      'color:#fff!important;cursor:pointer!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
      'flex-shrink:0!important;font-size:16px!important;transition:opacity .15s!important;',
    '}',
    '#avx-snd:hover{opacity:.85!important;}',
    '#avx-snd[disabled]{opacity:.35!important;cursor:not-allowed!important;}',
    '#avx-credit{text-align:center!important;font-size:10px!important;color:#9CA3AF!important;padding:4px 10px 8px!important;background:#fff!important;flex-shrink:0!important;}',

    /* Skilljar override — neutralise ALL button pseudo-elements inside the widget */
    '#avx-win button::before,#avx-win button::after,#avx-btn::before,#avx-btn::after{content:none!important;display:none!important;position:static!important;width:0!important;height:0!important;}',
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ─────────────────────────────────────────────────────── */
  var btn = document.createElement('button');
  btn.id = 'avx-btn';
  btn.setAttribute('aria-label', 'Open AppViewX Academy Assistant');

  var win = document.createElement('div');
  win.id = 'avx-win';
  win.className = 'avx-hidden';

  win.innerHTML =
    '<div id="avx-hdr">' +
      '<div id="avx-hdr-ic"><img src="' + ICON + '" alt="AppViewX" /></div>' +
      '<div id="avx-hdr-txt">' +
        '<div id="avx-hdr-name">AVX Academy Assistant</div>' +
      '</div>' +
      '<div id="avx-hdr-btns">' +
        '<button id="avx-clr" aria-label="Clear conversation" title="Clear conversation">&#x1F5D1;</button>' +
        '<button id="avx-max" aria-label="Maximize">&#x26F6;</button>' +
        '<button id="avx-cls" aria-label="Close">&#x2715;</button>' +
      '</div>' +
    '</div>' +
    '<div id="avx-msgs">' +
      '<div id="avx-typ" class="avx-typ-hide">' +
        '<div id="avx-typ-av"><img src="' + ICON + '" alt="" /></div>' +
        '<div id="avx-typ-dots"><div class="avx-dot"></div><div class="avx-dot"></div><div class="avx-dot"></div></div>' +
      '</div>' +
    '</div>' +
    '<div id="avx-foot-row">' +
      '<textarea id="avx-inp" rows="1" placeholder="Ask about courses, learning paths…"></textarea>' +
      '<button id="avx-snd" aria-label="Send">&#x27A4;</button>' +
    '</div>' +
    '<div id="avx-credit">AppViewX Academy &middot; academy.appviewx.com</div>';

  document.body.appendChild(btn);
  document.body.appendChild(win);

  var msgsEl = document.getElementById('avx-msgs');
  var typEl  = document.getElementById('avx-typ');
  var inp    = document.getElementById('avx-inp');
  var snd    = document.getElementById('avx-snd');
  var cls    = document.getElementById('avx-cls');
  var maxBtn = document.getElementById('avx-max');
  var clrBtn = document.getElementById('avx-clr');

  /* ── Markdown renderer ───────────────────────────────────────── */
  function mdToHtml(raw) {
    // escape HTML
    var t = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // tables: | header | \n |---| \n | row |
    t = t.replace(/(\|.+\|\n\|[\-:| ]+\|\n(?:\|.+\|(?:\n|$))*)/g, function(block) {
      var lines = block.trim().split('\n');
      if (lines.length < 3) return block;
      var ths = lines[0].split('|').slice(1,-1).map(function(c){
        return '<th>' + c.trim() + '</th>';
      }).join('');
      var trs = lines.slice(2).map(function(row) {
        var tds = row.split('|').slice(1,-1).map(function(c){
          return '<td>' + c.trim() + '</td>';
        }).join('');
        return '<tr>' + tds + '</tr>';
      }).join('');
      return '<div class="avx-tbl-wrap"><table class="avx-tbl"><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table></div>';
    });

    // inline
    t = t
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(https?:\/\/[^\s<"&]+)/g,function(u){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>';})
      .replace(/^#{1,3}\s+(.+)$/gm,'<span class="avx-h">$1</span>')
      .replace(/^[\*\-]\s+(.+)$/gm,'<li>$1</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g,'<ul>$1</ul>')
      .replace(/^\d+\.\s+(.+)$/gm,'<li>$1</li>')
      .replace(/\n\n+/g,'</p><p>')
      .replace(/\n/g,'<br>');

    return '<p>' + t + '</p>';
  }

  /* ── Add message ─────────────────────────────────────────────── */
  function addMsg(role, text) {
    if (role === 'user') {
      var d = document.createElement('div');
      d.className = 'avx-u';
      d.textContent = text;
      msgsEl.insertBefore(d, typEl);
    } else {
      var row = document.createElement('div');
      row.className = 'avx-row-b';

      var av = document.createElement('div');
      av.className = 'avx-av';
      av.innerHTML = '<img src="' + ICON + '" alt="" />';

      var wrap = document.createElement('div');
      wrap.className = 'avx-b-wrap';

      var bubble = document.createElement('div');
      bubble.className = 'avx-b';
      bubble.innerHTML = mdToHtml(text);

      var actions = document.createElement('div');
      actions.className = 'avx-msg-actions';

      var copyBtn = document.createElement('button');
      copyBtn.className = 'avx-copy-btn';
      copyBtn.innerHTML = '&#x2398; Copy';
      copyBtn.setAttribute('aria-label', 'Copy response');
      copyBtn.setAttribute('data-raw', text);
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var raw = copyBtn.getAttribute('data-raw');
        navigator.clipboard.writeText(raw).then(function() {
          copyBtn.innerHTML = '&#x2713; Copied';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.innerHTML = '&#x2398; Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(function() {
          // Fallback for older browsers
          var ta = document.createElement('textarea');
          ta.value = raw;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.innerHTML = '&#x2713; Copied';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.innerHTML = '&#x2398; Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });

      actions.appendChild(copyBtn);
      wrap.appendChild(bubble);
      wrap.appendChild(actions);
      row.appendChild(av);
      row.appendChild(wrap);
      msgsEl.insertBefore(row, typEl);
    }
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  /* ── Starter questions ───────────────────────────────────────── */
  function addStarters() {
    var el = document.createElement('div');
    el.id = 'avx-starters';
    STARTERS.forEach(function(q) {
      var chip = document.createElement('button');
      chip.className = 'avx-starter';
      chip.textContent = q;
      chip.addEventListener('click', function(e) {
        e.stopPropagation();
        el.remove();
        inp.value = q;
        send();
      });
      el.appendChild(chip);
    });
    msgsEl.insertBefore(el, typEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  /* ── Typing indicator ────────────────────────────────────────── */
  function setTyping(on) {
    isTyping = on;
    typEl.className = on ? '' : 'avx-typ-hide';
    snd.disabled = on;
    if (on) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function autoGrow() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  }

  /* ── Scroll isolation ────────────────────────────────────────── */
  msgsEl.addEventListener('wheel', function(e) {
    e.stopPropagation();
    var atTop    = msgsEl.scrollTop === 0 && e.deltaY < 0;
    var atBottom = msgsEl.scrollTop + msgsEl.clientHeight >= msgsEl.scrollHeight - 1 && e.deltaY > 0;
    if (!atTop && !atBottom) e.preventDefault();
    msgsEl.scrollTop += e.deltaY;
  }, { passive: false });

  var _touchY = 0;
  msgsEl.addEventListener('touchstart', function(e) { _touchY = e.touches[0].clientY; }, { passive: true });
  msgsEl.addEventListener('touchmove', function(e) {
    var delta = _touchY - e.touches[0].clientY;
    _touchY = e.touches[0].clientY;
    msgsEl.scrollTop += delta;
    e.stopPropagation();
    var atTop    = msgsEl.scrollTop <= 0 && delta < 0;
    var atBottom = msgsEl.scrollTop + msgsEl.clientHeight >= msgsEl.scrollHeight - 1 && delta > 0;
    if (!atTop && !atBottom) e.preventDefault();
  }, { passive: false });

  /* ── Open / Close / Maximize / Clear ────────────────────────── */
  function openChat() {
    isOpen = true;
    win.classList.remove('avx-hidden');
    btn.classList.add('avx-open');
    btn.textContent = '✕';
    if (messages.length === 0) welcome();
    setTimeout(function(){ inp.focus(); }, 220);
  }

  function closeChat() {
    isOpen = false;
    win.classList.add('avx-hidden');
    btn.classList.remove('avx-open');
    btn.textContent = '';
  }

  function toggleMax() {
    isMax = !isMax;
    win.classList.toggle('avx-max', isMax);
    maxBtn.innerHTML = isMax ? '&#x2922;' : '&#x26F6;';
    maxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
  }

  function clearChat() {
    messages = [];
    convId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    // Remove all message nodes except the typing indicator
    var nodes = Array.prototype.slice.call(msgsEl.childNodes);
    nodes.forEach(function(n) { if (n !== typEl) msgsEl.removeChild(n); });
    welcome();
  }

  function welcome() {
    addMsg('assistant', "Hi! I'm your AppViewX Academy Learning Assistant.\n\nI can help you find the right courses, understand learning paths, and answer questions about AppViewX products.");
    addStarters();
  }

  /* ── Send ────────────────────────────────────────────────────── */
  async function send() {
    var text = inp.value.trim();
    if (!text || isTyping) return;
    // Remove starters if still visible
    var st = document.getElementById('avx-starters');
    if (st) st.remove();
    inp.value = '';
    inp.style.height = 'auto';
    messages.push({ role: 'user', content: text });
    addMsg('user', text);
    setTyping(true);
    try {
      var r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, convId: convId }),
      });
      var d = await r.json();
      var reply = d.reply || d.error || 'Sorry, something went wrong. Please try again.';
      messages.push({ role: 'assistant', content: reply });
      setTyping(false);
      addMsg('assistant', reply);
    } catch (e) {
      setTyping(false);
      addMsg('assistant', 'Could not reach the assistant. Please check your connection and try again.');
    }
  }

  /* ── Events ──────────────────────────────────────────────────── */
  btn.addEventListener('click', function(){ isOpen ? closeChat() : openChat(); });
  cls.addEventListener('click', closeChat);
  maxBtn.addEventListener('click', toggleMax);
  clrBtn.addEventListener('click', clearChat);
  snd.addEventListener('click', send);
  inp.addEventListener('input', autoGrow);
  inp.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });
  document.addEventListener('click', function(e){
    if (isOpen && !win.contains(e.target) && e.target !== btn) closeChat();
  });

})();
