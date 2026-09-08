(function () {
  if (window.__avxWidget) return;
  window.__avxWidget = true;

  var API = 'https://appviewx-skill-assessment.vercel.app/api/chat';
  var messages = [];
  var isOpen   = false;
  var isTyping = false;

  /* ── Inject CSS ─────────────────────────────────────────────── */
  var css = `
    #avx-btn {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      width: 54px !important;
      height: 54px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #6D28D9, #4F46E5) !important;
      box-shadow: 0 4px 16px rgba(109,40,217,.45) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: none !important;
      transition: transform .2s, box-shadow .2s !important;
      outline: none !important;
    }
    #avx-btn:hover {
      transform: scale(1.08) !important;
      box-shadow: 0 6px 22px rgba(109,40,217,.55) !important;
    }
    #avx-btn svg { pointer-events: none; }

    #avx-win {
      position: fixed !important;
      bottom: 90px !important;
      right: 24px !important;
      z-index: 2147483646 !important;
      width: 360px !important;
      max-width: calc(100vw - 32px) !important;
      height: 500px !important;
      max-height: calc(100vh - 120px) !important;
      background: #fff !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 40px rgba(0,0,0,.18) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      font-family: -apple-system, 'Segoe UI', sans-serif !important;
      transform-origin: bottom right !important;
      transition: opacity .2s, transform .2s !important;
    }
    #avx-win.avx-hidden {
      opacity: 0 !important;
      transform: scale(.92) translateY(8px) !important;
      pointer-events: none !important;
    }

    #avx-header {
      background: linear-gradient(135deg, #6D28D9, #4F46E5) !important;
      padding: 14px 16px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      flex-shrink: 0 !important;
    }
    #avx-header-icon {
      width: 34px !important;
      height: 34px !important;
      border-radius: 50% !important;
      background: rgba(255,255,255,.2) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
    }
    #avx-header-text { flex: 1 !important; }
    #avx-header-title {
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      line-height: 1.2 !important;
      margin: 0 !important;
    }
    #avx-header-sub {
      color: rgba(255,255,255,.75) !important;
      font-size: 11px !important;
      margin: 2px 0 0 !important;
    }
    #avx-close {
      background: rgba(255,255,255,.15) !important;
      border: none !important;
      border-radius: 6px !important;
      color: #fff !important;
      width: 28px !important;
      height: 28px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 16px !important;
      flex-shrink: 0 !important;
      line-height: 1 !important;
      padding: 0 !important;
    }
    #avx-close:hover { background: rgba(255,255,255,.25) !important; }

    #avx-msgs {
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 16px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      background: #F9FAFB !important;
      scroll-behavior: smooth !important;
    }
    #avx-msgs::-webkit-scrollbar { width: 4px; }
    #avx-msgs::-webkit-scrollbar-track { background: transparent; }
    #avx-msgs::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }

    .avx-msg {
      max-width: 88% !important;
      padding: 10px 13px !important;
      border-radius: 12px !important;
      font-size: 13.5px !important;
      line-height: 1.55 !important;
      word-break: break-word !important;
    }
    .avx-msg.avx-user {
      background: linear-gradient(135deg, #6D28D9, #4F46E5) !important;
      color: #fff !important;
      align-self: flex-end !important;
      border-bottom-right-radius: 4px !important;
      margin-left: auto !important;
    }
    .avx-msg.avx-bot {
      background: #fff !important;
      color: #111827 !important;
      align-self: flex-start !important;
      border-bottom-left-radius: 4px !important;
      box-shadow: 0 1px 4px rgba(0,0,0,.08) !important;
    }
    .avx-msg strong { font-weight: 700 !important; }
    .avx-msg em { font-style: italic !important; }
    .avx-msg a { color: #6D28D9 !important; text-decoration: underline !important; }
    .avx-msg ul, .avx-msg ol {
      padding-left: 18px !important;
      margin: 6px 0 !important;
    }
    .avx-msg li { margin: 3px 0 !important; }
    .avx-msg p { margin: 4px 0 !important; }

    #avx-typing {
      align-self: flex-start !important;
      background: #fff !important;
      border-radius: 12px !important;
      border-bottom-left-radius: 4px !important;
      box-shadow: 0 1px 4px rgba(0,0,0,.08) !important;
      padding: 12px 16px !important;
      display: none !important;
      gap: 5px !important;
      align-items: center !important;
    }
    #avx-typing.avx-show { display: flex !important; }
    .avx-dot {
      width: 7px !important;
      height: 7px !important;
      border-radius: 50% !important;
      background: #9CA3AF !important;
      animation: avxBounce 1.2s infinite !important;
    }
    .avx-dot:nth-child(2) { animation-delay: .2s !important; }
    .avx-dot:nth-child(3) { animation-delay: .4s !important; }
    @keyframes avxBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%            { transform: translateY(-5px); }
    }

    #avx-input-row {
      display: flex !important;
      gap: 8px !important;
      padding: 12px !important;
      border-top: 1px solid #E5E7EB !important;
      background: #fff !important;
      flex-shrink: 0 !important;
      align-items: flex-end !important;
    }
    #avx-input {
      flex: 1 !important;
      border: 1.5px solid #E5E7EB !important;
      border-radius: 10px !important;
      padding: 9px 12px !important;
      font-size: 13.5px !important;
      font-family: inherit !important;
      resize: none !important;
      outline: none !important;
      background: #F9FAFB !important;
      color: #111827 !important;
      line-height: 1.4 !important;
      max-height: 100px !important;
      overflow-y: auto !important;
      transition: border-color .15s !important;
    }
    #avx-input:focus { border-color: #6D28D9 !important; background: #fff !important; }
    #avx-input::placeholder { color: #9CA3AF !important; }
    #avx-send {
      width: 36px !important;
      height: 36px !important;
      border-radius: 8px !important;
      background: linear-gradient(135deg, #6D28D9, #4F46E5) !important;
      border: none !important;
      color: #fff !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      transition: opacity .15s !important;
    }
    #avx-send:hover { opacity: .85 !important; }
    #avx-send:disabled { opacity: .4 !important; cursor: not-allowed !important; }

    #avx-footer {
      text-align: center !important;
      font-size: 10.5px !important;
      color: #9CA3AF !important;
      padding: 0 12px 8px !important;
      background: #fff !important;
      flex-shrink: 0 !important;
    }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Build DOM ──────────────────────────────────────────────── */
  // Bubble button
  var btn = document.createElement('button');
  btn.id = 'avx-btn';
  btn.setAttribute('aria-label', 'Open AppViewX Academy Assistant');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Chat window
  var win = document.createElement('div');
  win.id = 'avx-win';
  win.className = 'avx-hidden';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'AppViewX Academy Assistant');

  win.innerHTML = `
    <div id="avx-header">
      <div id="avx-header-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div id="avx-header-text">
        <div id="avx-header-title">AppViewX Academy Assistant</div>
        <div id="avx-header-sub">Powered by Claude · Ask me anything</div>
      </div>
      <button id="avx-close" aria-label="Close chat">✕</button>
    </div>
    <div id="avx-msgs"></div>
    <div id="avx-input-row">
      <textarea id="avx-input" rows="1" placeholder="Ask about AppViewX products or courses…"></textarea>
      <button id="avx-send" aria-label="Send message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <line x1="22" y1="2" x2="11" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </button>
    </div>
    <div id="avx-footer">AppViewX Academy · academy.appviewx.com</div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  /* ── References ─────────────────────────────────────────────── */
  var msgsEl  = win.querySelector('#avx-msgs');
  var inputEl = win.querySelector('#avx-input');
  var sendEl  = win.querySelector('#avx-send');
  var closeEl = win.querySelector('#avx-close');

  // Typing indicator (appended into msgs)
  var typingEl = document.createElement('div');
  typingEl.id = 'avx-typing';
  typingEl.innerHTML = '<div class="avx-dot"></div><div class="avx-dot"></div><div class="avx-dot"></div>';
  msgsEl.appendChild(typingEl);

  /* ── Helpers ────────────────────────────────────────────────── */
  function mdToHtml(text) {
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(https?:\/\/[^\s<>"]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/^#{1,3} (.+)$/gm,'<strong>$1</strong>')
      .replace(/^[\*\-] (.+)$/gm,'<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s,'<ul>$1</ul>')
      .replace(/^\d+\. (.+)$/gm,'<li>$1</li>')
      .replace(/\n\n/g,'</p><p>')
      .replace(/\n/g,'<br>');
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'avx-msg ' + (role === 'user' ? 'avx-user' : 'avx-bot');
    if (role === 'user') {
      div.textContent = text;
    } else {
      div.innerHTML = '<p>' + mdToHtml(text) + '</p>';
    }
    msgsEl.insertBefore(div, typingEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  function setTyping(on) {
    isTyping = on;
    typingEl.className = on ? 'avx-show' : '';
    sendEl.disabled = on;
    if (on) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function autoGrow() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  }

  /* ── Open / Close ───────────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    win.classList.remove('avx-hidden');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="white" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>';
    if (messages.length === 0) showWelcome();
    setTimeout(function () { inputEl.focus(); }, 220);
  }

  function closeChat() {
    isOpen = false;
    win.classList.add('avx-hidden');
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function showWelcome() {
    addMessage('assistant',
      "Hi! I'm your AppViewX Academy Learning Assistant 👋\n\n" +
      "I can help you with:\n" +
      "- **Product questions** — CLM, PKIaaS, Kubernetes, SSH, Code Signing, ADC, DDI\n" +
      "- **Finding the right course** for your role and experience\n" +
      "- **Technical concepts** around certificate and key lifecycle management\n\n" +
      "What would you like to know?"
    );
  }

  /* ── Send ───────────────────────────────────────────────────── */
  async function send() {
    var text = inputEl.value.trim();
    if (!text || isTyping) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendEl.disabled = true;

    messages.push({ role: 'user', content: text });
    addMessage('user', text);
    setTyping(true);

    try {
      var res = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: messages }),
      });
      var data = await res.json();
      var reply = data.reply || data.error || 'Sorry, something went wrong. Please try again.';
      messages.push({ role: 'assistant', content: reply });
      setTyping(false);
      addMessage('assistant', reply);
    } catch (err) {
      setTyping(false);
      addMessage('assistant', 'Connection error. Please check your internet and try again.');
    }
    sendEl.disabled = false;
  }

  /* ── Events ─────────────────────────────────────────────────── */
  btn.addEventListener('click', function () { isOpen ? closeChat() : openChat(); });
  closeEl.addEventListener('click', closeChat);

  sendEl.addEventListener('click', send);

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  inputEl.addEventListener('input', autoGrow);

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (isOpen && !win.contains(e.target) && e.target !== btn) closeChat();
  });

})();
