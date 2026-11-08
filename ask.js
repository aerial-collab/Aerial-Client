// ask.js: the script for ai.html (the chat logic only; all markup lives in ai.html)
// Paste the address of your Cloudflare Worker (worker.js) below.
(function () {
  'use strict';
const WORKER_URL = 'https://aerial-ai.aerialss.workers.dev/';

  const $ = id => document.getElementById(id);
  const log = $('log'), chat = $('chat'), box = $('msg'), sendBtn = $('send'), form = $('form');
  const bubbleTpl = $('tpl-bubble');
  let history = [], busy = false;

  // ----- Formatting without writing any HTML strings: builds DOM nodes -----
  function renderInline(parent, text) {
    const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const tok = m[0], isCode = tok[0] === '`';
      const el = document.createElement(isCode ? 'code' : 'b');
      el.textContent = isCode ? tok.slice(1, -1) : tok.slice(2, -2);
      parent.appendChild(el);
      last = m.index + tok.length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function renderBot(node, text) {
    node.textContent = '';
    const re = /```[a-zA-Z0-9]*\n?([\s\S]*?)```/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) renderInline(node, text.slice(last, m.index));
      const pre = document.createElement('pre'), code = document.createElement('code');
      code.textContent = m[1].replace(/\n$/, '');
      pre.appendChild(code);
      node.appendChild(pre);
      last = m.index + m[0].length;
    }
    if (last < text.length) renderInline(node, text.slice(last));
  }

  // ----- Chat -----
  function add(cls, text) {
    const d = bubbleTpl.content.firstElementChild.cloneNode(true);
    d.classList.add(cls);
    if (cls === 'bot') renderBot(d, text); else d.textContent = text;
    log.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }

  async function send(text) {
    if (busy || !text) return;
    if (WORKER_URL.indexOf('PASTE') === 0) { add('bot', 'Add your Worker URL at the top of ask.js first.'); return; }
    busy = true; sendBtn.disabled = true;
    const chips = $('chips'); if (chips) chips.remove();
    add('me', text);
    history.push({ role: 'user', content: text });
    const wait = add('bot', 'Thinking…');
    try {
      const r = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      if (!r.ok) throw new Error(r.status);
      const reply = (((await r.json()).text) || '').trim() || 'I could not come up with an answer. Try asking again.';
      renderBot(wait, reply);
      history.push({ role: 'assistant', content: reply });
    } catch (e) {
      wait.textContent = 'Sorry, the AI could not answer right now. Check the Worker URL and try again.';
      history.pop();
    }
    busy = false; sendBtn.disabled = false; box.focus();
    chat.scrollTop = chat.scrollHeight;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = box.value.trim();
    box.value = ''; box.style.height = 'auto';
    send(t);
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  box.addEventListener('input', () => {
    box.style.height = 'auto';
    box.style.height = Math.min(box.scrollHeight, 180) + 'px';
  });
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  $('back').addEventListener('click', () => {
    if (document.referrer) history.back(); else location.href = 'aerial-client.html';
  });
  $('new').addEventListener('click', () => { history = []; location.reload(); });
})();
