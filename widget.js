(function () {
  if (window.__avxWidget) return;
  window.__avxWidget = true;

  var API     = 'https://appviewx-skill-assessment.vercel.app/api/chat';
  var messages = [];
  var isOpen   = false;
  var isTyping = false;

  /* ── CSS ─────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#avx-btn{',
      'all:unset;',
      'position:fixed!important;bottom:24px!important;right:24px!important;',
      'z-index:2147483647!important;',
      'width:54px!important;height:54px!important;border-radius:50%!important;',
      'background:linear-gradient(135deg,#6D28D9,#4F46E5)!important;',
      'box-shadow:0 4px 16px rgba(109,40,217,.45)!important;',
      'cursor:pointer!important;display:flex!important;',
      'align-items:center!important;justify-content:center!important;',
      'font-size:22px!important;line-height:1!important;',
      'transition:transform .18s,box-shadow .18s!important;',
      'border:none!important;outline:none!important;',
    '}',
    '#avx-btn:hover{transform:scale(1.1)!important;box-shadow:0 6px 22px rgba(109,40,217,.55)!important;}',

    '#avx-win{',
      'position:fixed!important;bottom:88px!important;right:24px!important;',
      'z-index:2147483646!important;',
      'width:360px!important;max-width:calc(100vw - 32px)!important;',
      'height:500px!important;max-height:calc(100vh - 110px)!important;',
      'background:#ffffff!important;border-radius:16px!important;',
      'box-shadow:0 8px 40px rgba(0,0,0,.2)!important;',
      'display:flex!important;flex-direction:column!important;overflow:hidden!important;',
      'font-family:-apple-system,"Segoe UI",Arial,sans-serif!important;',
      'font-size:14px!important;',
      'transition:opacity .2s,transform .2s!important;',
      'transform-origin:bottom right!important;',
    '}',
    '#avx-win.avx-hidden{opacity:0!important;transform:scale(.92) translateY(8px)!important;pointer-events:none!important;}',

    '#avx-hdr{',
      'background:linear-gradient(135deg,#6D28D9,#4F46E5)!important;',
      'padding:13px 14px!important;display:flex!important;align-items:center!important;',
      'gap:10px!important;flex-shrink:0!important;',
    '}',
    '#avx-hdr-ic{',
      'width:36px!important;height:36px!important;border-radius:50%!important;',
      'background:rgba(255,255,255,.2)!important;display:flex!important;',
      'align-items:center!important;justify-content:center!important;',
      'font-size:17px!important;flex-shrink:0!important;color:#fff!important;',
      'font-weight:700!important;letter-spacing:-.5px!important;',
    '}',
    '#avx-hdr-txt{flex:1!important;min-width:0!important;}',
    '#avx-hdr-name{color:#fff!important;font-size:13.5px!important;font-weight:700!important;margin:0!important;line-height:1.25!important;}',
    '#avx-hdr-sub{color:rgba(255,255,255,.75)!important;font-size:11px!important;margin:2px 0 0!important;line-height:1.2!important;}',
    '#avx-cls{',
      'all:unset;',
      'width:28px!important;height:28px!important;border-radius:6px!important;',
      'background:rgba(255,255,255,.15)!important;color:#fff!important;',
      'cursor:pointer!important;display:flex!important;align-items:center!important;',
      'justify-content:center!important;font-size:16px!important;',
      'flex-shrink:0!important;transition:background .15s!important;',
    '}',
    '#avx-cls:hover{background:rgba(255,255,255,.3)!important;}',

    '#avx-msgs{',
      'flex:1!important;overflow-y:auto!important;padding:14px!important;',
      'display:flex!important;flex-direction:column!important;gap:10px!important;',
      'background:#F8F9FB!important;',
    '}',
    '#avx-msgs::-webkit-scrollbar{width:4px!important;}',
    '#avx-msgs::-webkit-scrollbar-thumb{background:#D1D5DB!important;border-radius:4px!important;}',

    '.avx-m{',
      'max-width:88%!important;padding:9px 12px!important;border-radius:12px!important;',
      'font-size:13px!important;line-height:1.55!important;word-break:break-word!important;',
      'display:block!important;flex-shrink:0!important;',
    '}',
    '.avx-u{',
      'background:linear-gradient(135deg,#6D28D9,#4F46E5)!important;',
      'color:#fff!important;align-self:flex-end!important;margin-left:auto!important;',
      'border-bottom-right-radius:3px!important;',
    '}',
    '.avx-b{',
      'background:#fff!important;color:#111827!important;',
      'align-self:flex-start!important;border-bottom-left-radius:3px!important;',
      'box-shadow:0 1px 4px rgba(0,0,0,.08)!important;',
    '}',
    '.avx-b strong{font-weight:700!important;color:#111!important;}',
    '.avx-b em{font-style:italic!important;}',
    '.avx-b a{color:#6D28D9!important;text-decoration:underline!important;}',
    '.avx-b ul,.avx-b ol{padding-left:16px!important;margin:5px 0!important;}',
    '.avx-b li{margin:2px 0!important;}',
    '.avx-b p{margin:3px 0!important;}',
    '.avx-b code{background:#F3F4F6!important;padding:1px 4px!important;border-radius:3px!important;font-size:12px!important;}',

    '#avx-typ{',
      'align-self:flex-start!important;background:#fff!important;',
      'border-radius:12px!important;border-bottom-left-radius:3px!important;',
      'box-shadow:0 1px 4px rgba(0,0,0,.08)!important;',
      'padding:11px 14px!important;display:none!important;gap:5px!important;align-items:center!important;',
      'flex-shrink:0!important;',
    '}',
    '#avx-typ.show{display:flex!important;}',
    '.avx-dot{width:7px!important;height:7px!important;border-radius:50%!important;background:#C4B5FD!important;animation:avxb 1.2s infinite!important;}',
    '.avx-dot:nth-child(2){animation-delay:.2s!important;}',
    '.avx-dot:nth-child(3){animation-delay:.4s!important;}',
    '@keyframes avxb{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}',

    '#avx-foot-row{',
      'display:flex!important;gap:8px!important;padding:10px!important;',
      'border-top:1px solid #E5E7EB!important;background:#fff!important;',
      'flex-shrink:0!important;align-items:flex-end!important;',
    '}',
    '#avx-inp{',
      'flex:1!important;border:1.5px solid #E5E7EB!important;border-radius:10px!important;',
      'padding:8px 11px!important;font-size:13px!important;font-family:inherit!important;',
      'resize:none!important;outline:none!important;background:#F9FAFB!important;',
      'color:#111827!important;line-height:1.4!important;max-height:90px!important;overflow-y:auto!important;',
      'transition:border-color .15s!important;',
    '}',
    '#avx-inp:focus{border-color:#6D28D9!important;background:#fff!important;}',
    '#avx-inp::placeholder{color:#9CA3AF!important;}',
    '#avx-snd{',
      'all:unset;',
      'width:36px!important;height:36px!important;border-radius:8px!important;',
      'background:linear-gradient(135deg,#6D28D9,#4F46E5)!important;',
      'color:#fff!important;cursor:pointer!important;',
      'display:flex!important;align-items:center!important;justify-content:center!important;',
      'flex-shrink:0!important;font-size:17px!important;',
      'transition:opacity .15s!important;',
    '}',
    '#avx-snd:hover{opacity:.85!important;}',
    '#avx-snd[disabled]{opacity:.35!important;cursor:not-allowed!important;}',
    '#avx-credit{text-align:center!important;font-size:10px!important;color:#9CA3AF!important;padding:3px 10px 7px!important;background:#fff!important;flex-shrink:0!important;}',
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ─────────────────────────────────────────────────────── */
  var btn = document.createElement('button');
  btn.id = 'avx-btn';
  btn.setAttribute('aria-label', 'Open AppViewX Academy Assistant');
  btn.textContent = '💬';

  var win = document.createElement('div');
  win.id = 'avx-win';
  win.className = 'avx-hidden';

  win.innerHTML =
    '<div id="avx-hdr">' +
      '<div id="avx-hdr-ic">AV</div>' +
      '<div id="avx-hdr-txt">' +
        '<div id="avx-hdr-name">AppViewX Academy Assistant</div>' +
        '<div id="avx-hdr-sub">Powered by Claude &middot; Ask me anything</div>' +
      '</div>' +
      '<button id="avx-cls" aria-label="Close">&#x2715;</button>' +
    '</div>' +
    '<div id="avx-msgs">' +
      '<div id="avx-typ"><div class="avx-dot"></div><div class="avx-dot"></div><div class="avx-dot"></div></div>' +
    '</div>' +
    '<div id="avx-foot-row">' +
      '<textarea id="avx-inp" rows="1" placeholder="Talk to AppViewX Academy Assistant…"></textarea>' +
      '<button id="avx-snd" aria-label="Send">&#x27A4;</button>' +
    '</div>' +
    '<div id="avx-credit">AppViewX Academy &middot; academy.appviewx.com</div>';

  document.body.appendChild(btn);
  document.body.appendChild(win);

  var msgsEl  = document.getElementById('avx-msgs');
  var typEl   = document.getElementById('avx-typ');
  var inp     = document.getElementById('avx-inp');
  var snd     = document.getElementById('avx-snd');
  var cls     = document.getElementById('avx-cls');

  /* ── Helpers ─────────────────────────────────────────────────── */
  function mdToHtml(t) {
    return t
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(https?:\/\/[^\s<"]+)/g,function(u){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>';})
      .replace(/^#{1,3}\s+(.+)$/gm,'<strong>$1</strong>')
      .replace(/^[\*\-]\s+(.+)$/gm,'<li>$1</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g,'<ul>$1</ul>')
      .replace(/^\d+\.\s+(.+)$/gm,'<li>$1</li>')
      .replace(/\n\n+/g,'</p><p>')
      .replace(/\n/g,'<br>');
  }

  function addMsg(role, text) {
    var d = document.createElement('div');
    d.className = 'avx-m ' + (role === 'user' ? 'avx-u' : 'avx-b');
    if (role === 'user') {
      d.textContent = text;
    } else {
      d.innerHTML = '<p>' + mdToHtml(text) + '</p>';
    }
    msgsEl.insertBefore(d, typEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function setTyping(on) {
    isTyping = on;
    typEl.className = on ? 'show' : '';
    snd.disabled    = on;
    if (on) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function autoGrow() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  }

  /* ── Open / Close ────────────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    win.classList.remove('avx-hidden');
    btn.textContent = '✕';
    if (messages.length === 0) welcome();
    setTimeout(function(){ inp.focus(); }, 220);
  }

  function closeChat() {
    isOpen = false;
    win.classList.add('avx-hidden');
    btn.textContent = '💬';
  }

  function welcome() {
    addMsg('assistant',
      "Hi! I'm your AppViewX Academy Learning Assistant 👋\n\n" +
      "I can help with:\n" +
      "- **Product questions** — CLM, PKIaaS, Kubernetes, SSH, Code Signing, ADC, DDI\n" +
      "- **Finding the right course** for your role and experience level\n" +
      "- **Technical concepts** around certificate and key lifecycle management\n\n" +
      "What would you like to know?"
    );
  }

  /* ── Send ────────────────────────────────────────────────────── */
  async function send() {
    var text = inp.value.trim();
    if (!text || isTyping) return;
    inp.value = '';
    inp.style.height = 'auto';
    messages.push({ role: 'user', content: text });
    addMsg('user', text);
    setTyping(true);
    try {
      var r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages }),
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
  snd.addEventListener('click', send);
  inp.addEventListener('input', autoGrow);
  inp.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });
  document.addEventListener('click', function(e){
    if (isOpen && !win.contains(e.target) && e.target !== btn) closeChat();
  });

})();
