(function () {
  if (window.__executionRunDemo) return;
  window.__executionRunDemo = true;

  var style = document.createElement('style');
  style.textContent = [
    '#erd-demo{font-family:Inter,system-ui,sans-serif;color:#f5f7fb}',
    '#erd-demo *{box-sizing:border-box}',
    '.erd-fab{position:fixed;right:22px;bottom:22px;z-index:99998;border:1px solid #315a80;background:#0b1726;color:#f5f7fb;border-radius:14px;padding:10px 14px;min-height:44px;cursor:pointer;box-shadow:0 18px 50px rgba(0,0,0,.35)}',
    '.erd-fab small{display:block;color:#718198;font-size:10px}.erd-fab strong{font-size:13px}',
    '.erd-mask{position:fixed;inset:0;z-index:99999;background:rgba(2,7,13,.58);display:none}',
    '.erd-mask.on{display:block}',
    '.erd-panel{position:fixed;top:0;right:0;bottom:0;z-index:100000;width:min(760px,96vw);display:none;flex-direction:column;background:#050b14;border-left:1px solid #18314d;box-shadow:-30px 0 80px rgba(0,0,0,.4)}',
    '.erd-panel.on{display:flex}',
    '.erd-head,.erd-foot{padding:14px 18px;background:#0b1726;border-color:#18314d}.erd-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #18314d}.erd-foot{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #18314d}',
    '.erd-head h3{margin:3px 0;font-size:18px}.erd-muted{color:#718198;font-size:11px}.erd-sub{color:#a7b4c5;font-size:12px}',
    '.erd-status{display:inline-flex;align-items:center;gap:7px;border:1px solid #315a80;border-radius:999px;padding:5px 9px;font-size:11px;white-space:nowrap}.erd-dot{width:7px;height:7px;border-radius:50%;background:#2585ff}.erd-status.wait .erd-dot{background:#ffb84a}.erd-status.ok .erd-dot{background:#30d890}.erd-status.bad .erd-dot{background:#ff5364}',
    '.erd-x,.erd-btn{border:1px solid #315a80;background:#101f31;color:#f5f7fb;border-radius:10px;cursor:pointer}.erd-x{width:34px;height:34px;font-size:18px}.erd-btn{padding:8px 11px;min-height:38px;font-weight:650}.erd-btn.primary{background:#176fd4}.erd-btn.danger{color:#ff9aa6;border-color:#6b3440;background:#2a1118}',
    '.erd-body{padding:14px 18px 24px;overflow:auto;min-height:0;flex:1}',
    '.erd-top{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px}.erd-card,.erd-box{border:1px solid #18314d;background:#0b1726;border-radius:14px;padding:13px}',
    '.erd-card h4,.erd-box h4{margin:0 0 9px;font-size:12px;color:#a7b4c5}.erd-meta{display:grid;grid-template-columns:82px minmax(0,1fr);gap:6px 9px;font-size:11px}.erd-meta b{color:#718198;font-weight:500}.erd-code{font-family:ui-monospace,Menlo,monospace;color:#cfe2ff}',
    '.erd-flow{list-style:none;margin:0;padding:0;display:grid;gap:7px}.erd-flow li{display:grid;grid-template-columns:17px 1fr auto;gap:7px;align-items:center;color:#718198;font-size:11px}.erd-flow li.done{color:#d8e5f4}.erd-flow li.active{color:#f5f7fb;font-weight:700}.erd-flow li.blocked{color:#ff9aa6}.erd-mark{width:17px;height:17px;border:1px solid #315a80;border-radius:50%;display:grid;place-items:center;font-size:9px}.done .erd-mark{color:#30d890}.active .erd-mark{color:#8fc3ff}.blocked .erd-mark{color:#ff5364}',
    '.erd-stream{margin-top:12px;border:1px solid #18314d;border-radius:14px;overflow:hidden;background:#07111d}.erd-stream-head{display:flex;justify-content:space-between;gap:10px;padding:9px 11px;background:#0b1726;border-bottom:1px solid #18314d;font-size:11px}.erd-log{height:220px;overflow:auto;padding:10px 12px;font:11px/1.55 ui-monospace,Menlo,monospace}.erd-line{display:grid;grid-template-columns:58px 1fr;gap:8px;padding:3px 0}.erd-time{color:#52667e}.erd-event{color:#8fc3ff}.erd-warn{color:#ffc873}.erd-ok{color:#61e5a7}.erd-err{color:#ff8491}',
    '.erd-interact{margin-top:12px;border:1px solid #6a5730;background:#171408;border-radius:14px;padding:13px}.erd-interact.approval{border-color:#563e80;background:#130d20}.erd-interact h4{margin:0 0 5px;font-size:13px}.erd-interact p{margin:0 0 10px;color:#a7b4c5;font-size:11px;line-height:1.45}.erd-opt{display:block;border:1px solid #315a80;background:#07111d;border-radius:10px;padding:8px;margin:6px 0;font-size:11px}.erd-opt input{accent-color:#2585ff}.erd-input{width:100%;margin-top:7px;border:1px solid #315a80;background:#07111d;color:#f5f7fb;border-radius:10px;padding:9px;font-size:12px}.erd-command{padding:9px;border:1px solid #315a80;background:#050b14;border-radius:10px;font:11px ui-monospace,Menlo,monospace;margin:8px 0}.erd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}',
    '.erd-result{margin-top:12px;border:1px solid #2a6b4b;background:#0a1b14;border-radius:14px;padding:13px}.erd-result h4{margin:0 0 8px;color:#8ff0bd}.erd-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.erd-result-grid div{border:1px solid #24563f;border-radius:9px;padding:8px;font-size:10px}.erd-result-grid strong{display:block;font-size:11px;margin-bottom:2px}',
    '[hidden]{display:none!important}',
    '@media(max-width:700px){.erd-panel{width:100%}.erd-top,.erd-result-grid{grid-template-columns:1fr}.erd-foot{flex-direction:column}.erd-fab{right:12px;bottom:12px}}'
  ].join('');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'erd-demo';
  root.innerHTML = [
    '<button class="erd-fab" type="button"><small>Интерактивный пример</small><strong>Execution Run</strong></button>',
    '<div class="erd-mask"></div>',
    '<aside class="erd-panel" role="dialog" aria-modal="true" aria-label="Execution Run demo">',
      '<header class="erd-head"><div><div class="erd-muted">EXECUTION RUN · DEMO</div><h3>RUN STEP-017</h3><div class="erd-sub">Claude Code · Agent SDK · тот же run продолжается после ответа</div></div>',
      '<div style="display:flex;gap:7px;align-items:flex-start"><span class="erd-status"><span class="erd-dot"></span><span data-status>Выполняется</span></span><button class="erd-x" data-act="close" type="button" aria-label="Закрыть">×</button></div></header>',
      '<div class="erd-body">',
        '<div class="erd-top">',
          '<section class="erd-card"><h4>Неизменяемый контекст запуска</h4><div class="erd-meta"><b>Project</b><span>ai-development-harness-client</span><b>Repository</b><span class="erd-code">~/projects/ai-development-harness-client</span><b>Runtime</b><span>Claude Code · Agent SDK</span><b>Command</b><span class="erd-code">RUN STEP-017</span><b>Run ID</b><span class="erd-code" data-runid>run_demo</span></div></section>',
          '<section class="erd-card"><h4>Harness flow · structured state</h4><ol class="erd-flow"><li data-phase="plan" class="done"><span class="erd-mark">✓</span><span>PLAN</span><small>done</small></li><li data-phase="implement" class="active"><span class="erd-mark">●</span><span>IMPLEMENT</span><small>active</small></li><li data-phase="verify"><span class="erd-mark">○</span><span>VERIFY</span><small>pending</small></li><li data-phase="review"><span class="erd-mark">○</span><span>REVIEW</span><small>pending</small></li><li data-phase="close"><span class="erd-mark">○</span><span>CLOSE</span><small>pending</small></li></ol></section>',
        '</div>',
        '<section class="erd-stream"><div class="erd-stream-head"><strong>Runtime output</strong><span class="erd-muted">текст модели ≠ состояние Harness</span></div><div class="erd-log" data-log aria-live="polite"></div></section>',
        '<section class="erd-interact" data-question hidden><h4>Требуется ответ пользователя</h4><p><span class="erd-code">interaction.required</span> пришёл как структурированный запрос runtime. Как восстанавливать активный run после перезагрузки страницы?</p>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="auto" checked> Переподключаться автоматически по runId</label>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="confirm"> Сначала показать активный run и спросить</label>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="custom"> Другой вариант</label>',
          '<input class="erd-input" data-custom placeholder="Свободный ответ (необязательно)">',
          '<div class="erd-actions"><button class="erd-btn primary" data-act="answer" type="button">Продолжить run</button><button class="erd-btn danger" data-act="cancel" type="button">Остановить</button></div></section>',
        '<section class="erd-interact approval" data-approval hidden><h4>Требуется разрешение</h4><p>Это нативный permission request от runtime, а не вопрос, распознанный из текста модели.</p><div class="erd-command">npx nx test client</div><p>Причина: runtime запрашивает разрешение на запуск обязательной deterministic verification.</p><div class="erd-actions"><button class="erd-btn primary" data-act="approve" type="button">Разрешить один раз</button><button class="erd-btn danger" data-act="deny" type="button">Отклонить</button></div></section>',
        '<section class="erd-result" data-result hidden><h4>✓ Run завершён — repository перечитан</h4><div class="erd-result-grid"><div><strong>3 файла изменено</strong>из Git projection</div><div><strong>Verification PASS</strong>deterministic checks</div><div><strong>Review PASS</strong>durable artifact</div></div><p class="erd-sub">Итог получен из repository artifacts и Git state, а не из фразы модели «готово».</p></section>',
      '</div>',
      '<footer class="erd-foot"><div class="erd-muted"><span data-elapsed>00:00</span> · run продолжает жить, если закрыть панель</div><div class="erd-actions" style="margin:0"><button class="erd-btn" data-act="restart" type="button">Повторить демо</button><button class="erd-btn danger" data-act="cancel" type="button">Остановить</button></div></footer>',
    '</aside>'
  ].join('');
  document.body.appendChild(root);

  var panel = root.querySelector('.erd-panel');
  var mask = root.querySelector('.erd-mask');
  var fab = root.querySelector('.erd-fab');
  var status = root.querySelector('.erd-status');
  var statusText = root.querySelector('[data-status]');
  var log = root.querySelector('[data-log]');
  var question = root.querySelector('[data-question]');
  var approval = root.querySelector('[data-approval]');
  var result = root.querySelector('[data-result]');
  var elapsed = root.querySelector('[data-elapsed]');
  var state = 'idle';
  var started = 0;
  var timers = [];
  var ticker = null;
  var token = 0;

  function openPanel(v) { panel.classList.toggle('on', v); mask.classList.toggle('on', v); }
  function setStatus(text, cls) { statusText.textContent = text; status.className = 'erd-status' + (cls ? ' ' + cls : ''); fab.querySelector('strong').textContent = state === 'waiting' ? 'Run ожидает ответа' : state === 'success' ? 'Run завершён' : state === 'blocked' ? 'Run остановлен' : 'Execution Run'; }
  function phase(name, cls, note) { var el = root.querySelector('[data-phase="' + name + '"]'); el.className = cls || ''; el.querySelector('.erd-mark').textContent = cls === 'done' ? '✓' : cls === 'active' ? '●' : cls === 'blocked' ? '!' : '○'; el.querySelector('small').textContent = note || 'pending'; }
  function stamp() { var d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, '0'); }).join(':'); }
  function line(text, kind) { var el = document.createElement('div'); el.className = 'erd-line'; el.innerHTML = '<span class="erd-time">' + stamp() + '</span><span></span>'; var out = el.lastChild; out.textContent = text; if (kind) out.className = 'erd-' + kind; log.appendChild(el); log.scrollTop = log.scrollHeight; }
  function later(ms, fn) { var t = token; timers.push(setTimeout(function () { if (t === token) fn(); }, ms)); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; if (ticker) clearInterval(ticker); ticker = null; }
  function tick() { if (ticker) clearInterval(ticker); ticker = setInterval(function () { var s = Math.floor((Date.now() - started) / 1000); elapsed.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500); }

  function restart() {
    token += 1; clearAll(); state = 'running'; started = Date.now(); tick(); openPanel(true);
    root.querySelector('[data-runid]').textContent = 'run_' + Math.random().toString(36).slice(2, 8);
    log.innerHTML = ''; question.hidden = true; approval.hidden = true; result.hidden = true; elapsed.textContent = '00:00';
    phase('plan', 'done', 'done'); phase('implement', 'active', 'active'); phase('verify', '', 'pending'); phase('review', '', 'pending'); phase('close', '', 'pending'); setStatus('Выполняется', '');
    line('run.started · projectRoot + runtimeId зафиксированы', 'event');
    later(500, function () { line('Читаю STEP-017 и связанные CLIENT-REQ...'); });
    later(1100, function () { line('PLAN уже существует. Перехожу к IMPLEMENT.', 'event'); });
    later(1750, function () { line('Проверяю ClientApi и восстановление активного run после навигации...'); });
    later(2450, function () { line('interaction.required · clarification', 'warn'); state = 'waiting'; setStatus('Ожидает ответа', 'wait'); question.hidden = false; question.scrollIntoView({ block: 'nearest' }); });
  }

  function answer() {
    if (state !== 'waiting' || question.hidden) return;
    var choice = root.querySelector('input[name="erdChoice"]:checked'); var custom = root.querySelector('[data-custom]').value.trim();
    var answerText = choice && choice.value === 'confirm' ? 'спросить перед переподключением' : choice && choice.value === 'custom' ? (custom || 'другой вариант') : 'переподключаться автоматически';
    question.hidden = true; state = 'running'; setStatus('Выполняется', ''); line('interaction.response · ' + answerText, 'event'); line('Тот же runtime session продолжает выполнение.');
    later(700, function () { line('Изменяю run subscription contract и reconnect handling...'); });
    later(1400, function () { phase('implement', 'done', 'done'); phase('verify', 'active', 'approval'); line('permission.required · verification command', 'warn'); state = 'waiting'; setStatus('Нужно разрешение', 'wait'); approval.hidden = false; approval.scrollIntoView({ block: 'nearest' }); });
  }

  function approve() {
    if (state !== 'waiting' || approval.hidden) return;
    approval.hidden = true; state = 'running'; setStatus('Выполняется', ''); phase('verify', 'active', 'active'); line('permission.response · allow_once', 'event'); line('$ npx nx test client');
    later(650, function () { line('✓ nx test client', 'ok'); });
    later(1100, function () { line('✓ nx lint client', 'ok'); });
    later(1550, function () { phase('verify', 'done', 'done'); phase('review', 'active', 'active'); line('VERIFY PASS · запускаю independent REVIEW', 'event'); });
    later(2200, function () { line('Reviewer: критических findings нет.'); });
    later(2700, finish);
  }

  function finish() {
    phase('review', 'done', 'PASS'); phase('close', 'active', 'refresh'); setStatus('Обновление проекта', ''); line('REVIEW PASS · перечитываю repository projections и Git state', 'event');
    later(600, function () { phase('close', 'done', 'done'); line('repository.refresh.completed · 3 changed files · evidence + review loaded', 'ok'); state = 'success'; setStatus('Завершён', 'ok'); result.hidden = false; clearAll(); result.scrollIntoView({ block: 'nearest' }); });
  }

  function stop(blockedText) { token += 1; clearAll(); state = 'blocked'; question.hidden = true; approval.hidden = true; setStatus('Остановлен', 'bad'); line(blockedText || 'run.cancelled · пользователь остановил выполнение', 'err'); }

  fab.addEventListener('click', function () { if (state === 'idle') restart(); else openPanel(true); });
  mask.addEventListener('click', function () { openPanel(false); });
  root.addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act'); if (a === 'close') openPanel(false); if (a === 'restart') restart(); if (a === 'answer') answer(); if (a === 'approve') approve(); if (a === 'deny') stop('permission.response · deny · run заблокирован'); if (a === 'cancel') stop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openPanel(false); });
  document.addEventListener('click', function (e) { var t = e.target.closest('button,a,[role="button"]'); if (!t || root.contains(t)) return; var s = (t.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase(); if (/\bRUN\s+STEP(?:-|\s)/.test(s) || s === 'RUN' || s === 'STEP RUN') { e.preventDefault(); e.stopPropagation(); restart(); } }, true);
}());
