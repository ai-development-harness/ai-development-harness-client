(function () {
  if (window.__executionRunDemo) return;
  window.__executionRunDemo = true;

  var style = document.createElement("style");
  style.textContent = [
    "#erd-demo{font-family:Inter,system-ui,sans-serif;color:#f5f7fb}",
    "#erd-demo *{box-sizing:border-box}",
    ".erd-fab{position:fixed;right:22px;bottom:22px;z-index:99998;border:1px solid #315a80;background:#0b1726;color:#f5f7fb;border-radius:14px;padding:10px 14px;min-height:44px;cursor:pointer;box-shadow:0 18px 50px rgba(0,0,0,.35)}",
    ".erd-fab small{display:block;color:#718198;font-size:10px}.erd-fab strong{font-size:13px}",
    ".erd-mask{position:fixed;inset:0;z-index:99999;background:rgba(2,7,13,.58);display:none}.erd-mask.on{display:block}",
    ".erd-panel{position:fixed;top:0;right:0;bottom:0;z-index:100000;width:min(790px,96vw);display:none;flex-direction:column;background:#050b14;border-left:1px solid #18314d;box-shadow:-30px 0 80px rgba(0,0,0,.4)}.erd-panel.on{display:flex}",
    ".erd-head,.erd-foot{padding:14px 18px;background:#0b1726;border-color:#18314d}.erd-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #18314d}.erd-foot{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #18314d}",
    ".erd-head h3{margin:3px 0;font-size:18px}.erd-muted{color:#718198;font-size:11px}.erd-sub{color:#a7b4c5;font-size:12px}",
    ".erd-status{display:inline-flex;align-items:center;gap:7px;border:1px solid #315a80;border-radius:999px;padding:5px 9px;font-size:11px;white-space:nowrap}.erd-dot{width:7px;height:7px;border-radius:50%;background:#2585ff}.erd-status.wait .erd-dot{background:#ffb84a}.erd-status.ok .erd-dot{background:#30d890}.erd-status.bad .erd-dot{background:#ff5364}",
    ".erd-x,.erd-btn{border:1px solid #315a80;background:#101f31;color:#f5f7fb;border-radius:10px;cursor:pointer}.erd-x{width:34px;height:34px;font-size:18px}.erd-btn{padding:8px 11px;min-height:38px;font-weight:650}.erd-btn.primary{background:#176fd4}.erd-btn.danger{color:#ff9aa6;border-color:#6b3440;background:#2a1118}",
    ".erd-body{padding:14px 18px 24px;overflow:auto;min-height:0;flex:1}",
    ".erd-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(250px,.75fr);gap:12px}.erd-card{border:1px solid #18314d;background:#0b1726;border-radius:14px;padding:13px}.erd-card h4{margin:0 0 9px;font-size:12px;color:#a7b4c5}",
    ".erd-meta{display:grid;grid-template-columns:105px minmax(0,1fr);gap:6px 9px;font-size:11px}.erd-meta b{color:#718198;font-weight:500}.erd-code{font-family:ui-monospace,Menlo,monospace;color:#cfe2ff;overflow-wrap:anywhere}",
    ".erd-sep{height:1px;background:#18314d;margin:9px 0}",
    ".erd-stream{margin-top:12px;border:1px solid #18314d;border-radius:14px;overflow:hidden;background:#07111d}.erd-stream-head{display:flex;justify-content:space-between;gap:10px;padding:9px 11px;background:#0b1726;border-bottom:1px solid #18314d;font-size:11px}.erd-log{height:245px;overflow:auto;padding:10px 12px;font:11px/1.55 ui-monospace,Menlo,monospace}.erd-line{display:grid;grid-template-columns:58px 1fr;gap:8px;padding:3px 0}.erd-time{color:#52667e}.erd-event{color:#8fc3ff}.erd-warn{color:#ffc873}.erd-ok{color:#61e5a7}.erd-err{color:#ff8491}",
    ".erd-interact{margin-top:12px;border:1px solid #6a5730;background:#171408;border-radius:14px;padding:13px}.erd-interact.approval{border-color:#563e80;background:#130d20}.erd-interact h4{margin:0 0 5px;font-size:13px}.erd-interact p{margin:0 0 10px;color:#a7b4c5;font-size:11px;line-height:1.45}.erd-opt{display:block;border:1px solid #315a80;background:#07111d;border-radius:10px;padding:8px;margin:6px 0;font-size:11px}.erd-opt input{accent-color:#2585ff}.erd-input{width:100%;margin-top:7px;border:1px solid #315a80;background:#07111d;color:#f5f7fb;border-radius:10px;padding:9px;font-size:12px}.erd-command{padding:9px;border:1px solid #315a80;background:#050b14;border-radius:10px;font:11px ui-monospace,Menlo,monospace;margin:8px 0}.erd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}",
    ".erd-result{margin-top:12px;border:1px solid #2a6b4b;background:#0a1b14;border-radius:14px;padding:13px}.erd-result h4{margin:0 0 8px;color:#8ff0bd}.erd-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.erd-result-grid div{border:1px solid #24563f;border-radius:9px;padding:8px;font-size:10px}.erd-result-grid strong{display:block;font-size:11px;margin-bottom:2px}",
    "[hidden]{display:none!important}",
    "@media(max-width:700px){.erd-panel{width:100%}.erd-grid,.erd-result-grid{grid-template-columns:1fr}.erd-foot{flex-direction:column}.erd-fab{right:12px;bottom:12px}}"
  ].join("");
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "erd-demo";
  root.innerHTML = [
    '<button class="erd-fab" type="button"><small>Harness v0.4.0</small><strong>Execution Run</strong></button>',
    '<div class="erd-mask"></div>',
    '<aside class="erd-panel" role="dialog" aria-modal="true" aria-label="Execution Run demo">',
      '<header class="erd-head"><div><div class="erd-muted">EXECUTION RUN · HARNESS v0.4.0</div><h3>STEP RUN STEP-017</h3><div class="erd-sub">Execution Status + runtime event stream + repository projections</div></div>',
      '<div style="display:flex;gap:7px;align-items:flex-start"><span class="erd-status"><span class="erd-dot"></span><span data-ui-status>streaming</span></span><button class="erd-x" data-act="close" type="button" aria-label="Закрыть">×</button></div></header>',
      '<div class="erd-body">',
        '<div class="erd-grid">',
          '<section class="erd-card"><h4>Execution context</h4><div class="erd-meta">',
            '<b>Project</b><span>ai-development-harness-client</span>',
            '<b>Runtime</b><span>Claude Code · Agent SDK</span>',
            '<b>executionId</b><span class="erd-code" data-execid>exec-demo</span>',
            '<b>Mode</b><span class="erd-code">orchestration</span>',
            '<b>Root</b><span class="erd-code">STEP RUN STEP-017</span>',
            '<b>Current</b><span class="erd-code" data-current>STEP IMPLEMENT STEP-017</span>',
            '<b>Attempt</b><span class="erd-code" data-attempt>1</span>',
          '</div></section>',
          '<section class="erd-card"><h4>Harness state ≠ runtime state</h4><div class="erd-meta">',
            '<b>Execution</b><span class="erd-code" data-exec-status>running</span>',
            '<b>Command</b><span class="erd-code" data-command-status>running</span>',
            '<b>Result</b><span class="erd-code" data-command-result>—</span>',
            '<b>Resolver</b><span class="erd-code" data-resolver>—</span>',
          '</div><div class="erd-sep"></div><div class="erd-muted">Runtime/UI state</div><div class="erd-code" data-runtime-state>streaming</div></section>',
        '</div>',
        '<section class="erd-stream"><div class="erd-stream-head"><strong>Runtime output & structured events</strong><span class="erd-muted">текст модели ≠ CTS / Execution Status</span></div><div class="erd-log" data-log aria-live="polite"></div></section>',
        '<section class="erd-interact" data-question hidden><h4>Требуется ответ пользователя</h4><p><span class="erd-code">interaction.required</span> — structured request runtime. Harness Execution Status при этом остаётся <span class="erd-code">running</span>.</p>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="auto" checked> Переподключаться автоматически по executionId</label>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="confirm"> Сначала показать unresolved execution и спросить</label>',
          '<label class="erd-opt"><input type="radio" name="erdChoice" value="custom"> Другой вариант</label>',
          '<input class="erd-input" data-custom placeholder="Свободный ответ (необязательно)">',
          '<div class="erd-actions"><button class="erd-btn primary" data-act="answer" type="button">Продолжить</button><button class="erd-btn danger" data-act="cancel" type="button">Остановить</button></div></section>',
        '<section class="erd-interact approval" data-approval hidden><h4>Требуется разрешение runtime</h4><p>Native permission request. Это не protocol transition и не распознавание текста модели.</p><div class="erd-command">npx nx test client</div><p>Verification выполняется внутри IMPLEMENT activity и не является отдельной canonical command.</p><div class="erd-actions"><button class="erd-btn primary" data-act="approve" type="button">Разрешить один раз</button><button class="erd-btn danger" data-act="deny" type="button">Отклонить</button></div></section>',
        '<section class="erd-result" data-result hidden><h4>✓ Root execution завершена — repository перечитан</h4><div class="erd-result-grid"><div><strong>Execution complete</strong>root STEP RUN</div><div><strong>Review PASS</strong>durable artifact</div><div><strong>3 files changed</strong>Git projection</div></div><p class="erd-sub">Финал получен из Execution Status + repository/Git state, а не из self-report модели.</p></section>',
      '</div>',
      '<footer class="erd-foot"><div class="erd-muted"><span data-elapsed>00:00</span> · панель можно закрыть, execution живёт отдельно от React surface</div><div class="erd-actions" style="margin:0"><button class="erd-btn" data-act="restart" type="button">Новый demo run</button><button class="erd-btn danger" data-act="cancel" type="button">Остановить</button></div></footer>',
    '</aside>'
  ].join("");
  document.body.appendChild(root);

  var panel = root.querySelector(".erd-panel");
  var mask = root.querySelector(".erd-mask");
  var fab = root.querySelector(".erd-fab");
  var status = root.querySelector(".erd-status");
  var uiStatus = root.querySelector("[data-ui-status]");
  var log = root.querySelector("[data-log]");
  var question = root.querySelector("[data-question]");
  var approval = root.querySelector("[data-approval]");
  var result = root.querySelector("[data-result]");
  var elapsed = root.querySelector("[data-elapsed]");
  var current = root.querySelector("[data-current]");
  var attempt = root.querySelector("[data-attempt]");
  var execStatus = root.querySelector("[data-exec-status]");
  var commandStatus = root.querySelector("[data-command-status]");
  var commandResult = root.querySelector("[data-command-result]");
  var resolver = root.querySelector("[data-resolver]");
  var runtimeState = root.querySelector("[data-runtime-state]");
  var state = "idle";
  var started = 0;
  var timers = [];
  var ticker = null;
  var token = 0;

  function openPanel(value) {
    panel.classList.toggle("on", value);
    mask.classList.toggle("on", value);
  }

  function setUiState(value, cls) {
    runtimeState.textContent = value;
    uiStatus.textContent = value;
    status.className = "erd-status" + (cls ? " " + cls : "");
    fab.querySelector("strong").textContent =
      value === "waiting-for-input" ? "Execution ожидает ответа" :
      value === "complete" ? "Execution завершена" :
      value === "blocked" ? "Execution blocked" :
      "Execution Run";
  }

  function setHarnessState(values) {
    if (values.current) current.textContent = values.current;
    if (values.attempt) attempt.textContent = String(values.attempt);
    if (values.execution) execStatus.textContent = values.execution;
    if (values.command) commandStatus.textContent = values.command;
    if (Object.prototype.hasOwnProperty.call(values, "result")) commandResult.textContent = values.result || "—";
    if (Object.prototype.hasOwnProperty.call(values, "resolver")) resolver.textContent = values.resolver || "—";
  }

  function stamp() {
    var d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) {
      return String(n).padStart(2, "0");
    }).join(":");
  }

  function line(value, kind) {
    var el = document.createElement("div");
    el.className = "erd-line";
    el.innerHTML = '<span class="erd-time">' + stamp() + '</span><span></span>';
    var out = el.lastChild;
    out.textContent = value;
    if (kind) out.className = "erd-" + kind;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function later(ms, fn) {
    var currentToken = token;
    timers.push(setTimeout(function () {
      if (currentToken === token) fn();
    }, ms));
  }

  function clearAll() {
    timers.forEach(clearTimeout);
    timers = [];
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function tick() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(function () {
      var seconds = Math.floor((Date.now() - started) / 1000);
      elapsed.textContent =
        String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
        String(seconds % 60).padStart(2, "0");
    }, 500);
  }

  function restart(recovered) {
    token += 1;
    clearAll();
    state = "running";
    started = Date.now();
    tick();
    openPanel(true);
    root.querySelector("[data-execid]").textContent = recovered ? "exec-017" : "exec-" + Math.random().toString(36).slice(2, 8);
    log.innerHTML = "";
    question.hidden = true;
    approval.hidden = true;
    result.hidden = true;
    elapsed.textContent = "00:00";

    setHarnessState({
      current: "STEP IMPLEMENT STEP-017",
      attempt: recovered ? 2 : 1,
      execution: "running",
      command: "running",
      result: null,
      resolver: recovered ? "RESUME · COMMAND_INTERRUPTED" : null
    });
    setUiState("streaming", "");

    if (recovered) {
      line("resolver → RESUME STEP IMPLEMENT STEP-017 · attempt=2", "event");
      line("Продолжаю существующую root execution STEP RUN STEP-017.");
    } else {
      line("execution.started · mode=orchestration · root=STEP RUN STEP-017", "event");
      line("STEP PLAN STEP-017 уже завершён: SUCCESS", "ok");
      line("CTS → NEXT: STEP IMPLEMENT STEP-017", "event");
    }

    later(700, function () {
      line("Runtime stream: анализирую ClientApi reconnect semantics...");
    });
    later(1500, function () {
      line("interaction.required · clarification", "warn");
      state = "waiting";
      setUiState("waiting-for-input", "wait");
      question.hidden = false;
      question.scrollIntoView({block:"nearest"});
    });
  }

  function answer() {
    if (state !== "waiting" || question.hidden) return;
    var choice = root.querySelector('input[name="erdChoice"]:checked');
    var custom = root.querySelector("[data-custom]").value.trim();
    var answerText =
      choice && choice.value === "confirm" ? "show-and-confirm" :
      choice && choice.value === "custom" ? (custom || "custom") :
      "auto-by-executionId";

    question.hidden = true;
    state = "running";
    setUiState("streaming", "");
    line("interaction.response · " + answerText, "event");
    line("Harness current.command остаётся STEP IMPLEMENT STEP-017.");

    later(700, function () {
      line("permission.required · deterministic verification", "warn");
      state = "waiting";
      setUiState("waiting-for-input", "wait");
      approval.hidden = false;
      approval.scrollIntoView({block:"nearest"});
    });
  }

  function approve() {
    if (state !== "waiting" || approval.hidden) return;
    approval.hidden = true;
    state = "running";
    setUiState("streaming", "");
    line("permission.response · allow_once", "event");
    line("$ npx nx test client");
    later(600, function () { line("✓ nx test client", "ok"); });
    later(1050, function () { line("✓ nx lint client", "ok"); });
    later(1500, function () {
      setHarnessState({
        current: "STEP REVIEW STEP-017",
        execution: "running",
        command: "running",
        result: null,
        resolver: "NEXT · ORCHESTRATION_CTS_TRANSITION"
      });
      line("STEP IMPLEMENT STEP-017 complete · SUCCESS", "ok");
      line("CTS → NEXT: STEP REVIEW STEP-017", "event");
    });
    later(2200, function () {
      line("Independent reviewer: verdict PASS", "ok");
      setHarnessState({
        current: "STEP RUN STEP-017",
        execution: "running",
        command: "running",
        result: null,
        resolver: "RESUME · ORCHESTRATION_CONTINUE"
      });
      line("STEP REVIEW STEP-017 complete · PASS", "ok");
      line("Нет следующего CTS edge → root RUN продолжает finalization.", "event");
    });
    later(2900, finish);
  }

  function finish() {
    setUiState("streaming", "");
    line("STEP RUN finalization · repository refresh", "event");
    later(650, function () {
      setHarnessState({
        current: "STEP RUN STEP-017",
        execution: "complete",
        command: "complete",
        result: "SUCCESS",
        resolver: "DONE · EXECUTION_COMPLETE"
      });
      line("repository.refresh.completed · evidence + review + Git projection loaded", "ok");
      state = "success";
      setUiState("complete", "ok");
      result.hidden = false;
      clearAll();
      result.scrollIntoView({block:"nearest"});
    });
  }

  function stop(message) {
    token += 1;
    clearAll();
    state = "blocked";
    question.hidden = true;
    approval.hidden = true;
    setHarnessState({
      execution: "blocked",
      command: "blocked",
      result: "BLOCKED",
      resolver: "BLOCKED"
    });
    setUiState("blocked", "bad");
    line(message || "execution blocked / cancelled by user", "err");
  }

  fab.addEventListener("click", function () {
    if (state === "idle") restart(false);
    else openPanel(true);
  });
  mask.addEventListener("click", function () { openPanel(false); });

  root.addEventListener("click", function (event) {
    var button = event.target.closest("[data-act]");
    if (!button) return;
    var action = button.getAttribute("data-act");
    if (action === "close") openPanel(false);
    if (action === "restart") restart(false);
    if (action === "answer") answer();
    if (action === "approve") approve();
    if (action === "deny") stop("permission.response · deny · root execution BLOCKED");
    if (action === "cancel") stop();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") openPanel(false);
  });

  document.addEventListener("click", function (event) {
    var recovery = event.target.closest("[data-recovery-run]");
    if (recovery) {
      event.preventDefault();
      restart(true);
      return;
    }

    var target = event.target.closest('button,a,[role="button"]');
    if (!target || root.contains(target)) return;
    var command = target.getAttribute("data-command") || "";
    if (command === "STEP RUN STEP-017") {
      event.preventDefault();
      event.stopPropagation();
      restart(false);
    }
  }, true);
}());
