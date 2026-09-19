(function () {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const state = {
    screen: "overview",
    runtime: "none",
    project: "initialized",
    initRunning: false,
    initialized: true,
  };

  const screenTitles = {
    open: "Open Project",
    overview: "Overview",
    project: "Project / INIT",
    roadmap: "Roadmap / STEP",
    step: "STEP Detail",
    requirements: "Requirements",
    adr: "Architecture / ADR",
    knowledge: "Knowledge / Project Files",
    reviews: "Reviews & Findings",
    audits: "Audits / Reconcile",
    releases: "Releases",
    skills: "Skills",
    git: "Git Workspace",
    github: "GitHub Collaboration",
    activity: "Activity / Runs",
    agents: "Agents & Models",
    updates: "Harness Updates",
    settings: "Policies & Settings"
  };

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("on"), 2700);
  }

  function showScreen(id) {
    if (!screenTitles[id]) id = "overview";
    state.screen = id;
    $$(".screen").forEach((el) => el.classList.toggle("active", el.dataset.screen === id));
    $$(".nav button[data-screen]").forEach((el) => el.classList.toggle("active", el.dataset.screen === id));
    $("#currentSurface").textContent = screenTitles[id];
    history.replaceState(null, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function runtimeLabel() {
    if (state.runtime === "codex") return "Codex";
    if (state.runtime === "claude-code") return "Claude Code";
    return "Не выбран";
  }

  function updateRuntimeUi() {
    $("#runtimeSelect").value = state.runtime;
    $$("[data-runtime-label]").forEach((el) => el.textContent = runtimeLabel());
    $$("[data-command]").forEach((btn) => {
      const requiresRuntime = btn.dataset.requiresRuntime !== "false";
      const blocked = requiresRuntime && state.runtime === "none";
      btn.disabled = blocked;
      btn.title = blocked ? "Сначала явно выберите runtime" : "";
    });
    const gate = $("#runtimeGate");
    if (gate) gate.hidden = state.runtime !== "none";
  }

  function setProject(kind) {
    state.project = kind;
    state.initialized = kind === "initialized";
    const data = {
      initialized: {
        name: "ai-development-harness-client",
        path: "~/projects/ai-development-harness-client",
        status: "Harness project · initialized",
        branch: "feat/refresh-interactive-prototype-v030"
      },
      preinit: {
        name: "billing-service",
        path: "~/projects/billing-service",
        status: "Harness project · pre-INIT",
        branch: "main"
      },
      invalid: {
        name: "ordinary-repository",
        path: "~/projects/ordinary-repository",
        status: "Harness not found",
        branch: "main"
      }
    }[kind];
    $$("[data-project-name]").forEach((el) => el.textContent = data.name);
    $$("[data-project-path]").forEach((el) => el.textContent = data.path);
    $$("[data-project-status]").forEach((el) => el.textContent = data.status);
    $$("[data-project-branch]").forEach((el) => el.textContent = data.branch);
    $("#projectState").value = kind;
    renderInitState();
  }

  function renderInitState() {
    const pre = state.project === "preinit" && !state.initialized;
    const invalid = state.project === "invalid";
    $("#preInitPanel").hidden = !pre;
    $("#initializedPanel").hidden = pre || invalid;
    $("#invalidPanel").hidden = !invalid;
    if (pre) {
      $("#initStatus").textContent = state.initRunning ? "Инициализация..." : "project.initialized: false";
      $("#initProjectBtn").disabled = state.runtime === "none" || state.initRunning;
    }
  }

  function runInitDemo() {
    if (state.runtime === "none") {
      toast("Сначала выберите Codex или Claude Code");
      return;
    }
    if (state.project !== "preinit" || state.initialized || state.initRunning) return;
    state.initRunning = true;
    renderInitState();
    const bar = $("#initProgress");
    const log = $("#initLog");
    bar.style.width = "14%";
    log.textContent = "PROJECT INIT · runtime=" + state.runtime + "\nПроверяю PROJECT_BRIEF.local.md...";
    setTimeout(() => {
      bar.style.width = "43%";
      log.textContent += "\nСоздаю PROJECT / REQ / ADR / STEP через Harness...";
    }, 650);
    setTimeout(() => {
      bar.style.width = "76%";
      log.textContent += "\nRepository refresh...";
    }, 1350);
    setTimeout(() => {
      bar.style.width = "100%";
      log.textContent += "\nproject.initialized: true\nГотово.";
      state.initRunning = false;
      state.initialized = true;
      $("#initStatus").textContent = "project.initialized: true";
      $("#preInitPanel").hidden = true;
      $("#initializedPanel").hidden = false;
      toast("PROJECT INIT завершён. Repository перечитан.");
    }, 2100);
  }

  function setupTabs() {
    $$("[data-tabs]").forEach((tabs) => {
      tabs.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-tab]");
        if (!button) return;
        const root = tabs.closest("[data-tab-root]");
        $$("[data-tab]", tabs).forEach((b) => b.classList.toggle("active", b === button));
        $$("[data-pane]", root).forEach((pane) => pane.classList.toggle("active", pane.dataset.pane === button.dataset.tab));
      });
    });
  }

  function setupRoadmapFilter() {
    const filter = $("#stepFilter");
    if (!filter) return;
    filter.addEventListener("input", () => {
      const q = filter.value.trim().toLowerCase();
      $$("#roadmapRows tr").forEach((row) => {
        row.hidden = q && !row.textContent.toLowerCase().includes(q);
      });
    });
  }

  function setupSettings() {
    const cycles = $("#maxCycles");
    const out = $("#maxCyclesValue");
    const security = $("#securityReview");
    const tests = $("#testsReview");
    const skills = $("#skillResults");
    const manifest = $("#manifestPreview");
    function render() {
      out.textContent = cycles.value;
      manifest.textContent =
`execution:
  maxFixReviewCycles: ${cycles.value}

review:
  security: ${security.value}
  tests: ${tests.value}

skills:
  search:
    maxResults: ${skills.value}`;
    }
    [cycles, security, tests, skills].forEach((el) => el && el.addEventListener("input", render));
    render();
  }

  function setupUpdateDemo() {
    const btn = $("#checkUpdateBtn");
    const apply = $("#applyUpdateBtn");
    const result = $("#updateResult");
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      result.hidden = false;
      result.innerHTML = "<strong>HARNESS UPDATE CHECK</strong><p>Текущий release: v0.4.0 · target: latest</p>";
      setTimeout(() => {
        result.innerHTML = "<strong>NO_UPDATE</strong><p>v0.4.0 уже является latest. При наличии нового target matching CHECK metadata хранится в общем Execution Status.</p>";
        apply.disabled = true;
        btn.disabled = false;
      }, 850);
    });
    apply.addEventListener("click", () => toast("Demo: HARNESS UPDATE APPLY требует matching CHECK для target/route/lock"));
  }

  function setupSkills() {
    const find = $("#findSkillBtn");
    if (!find) return;
    find.addEventListener("click", () => {
      $("#skillCandidates").hidden = false;
      toast("Shortlist построен по skills.search.maxResults");
    });
  }

  function demoPreflight(raw) {
    const value = raw.trim();
    if (!value) return { valid: false, code: "EMPTY_COMMAND", lines: [] };

    if (value === "GIT PR > COMMIT") {
      return {
        valid: false,
        code: "INVALID_CHAIN",
        lines: [
          "transition GIT PR -> GIT COMMIT is not allowed",
          "Ни один segment не будет выполнен."
        ]
      };
    }

    if (value === "GIT CHECK > COMMIT > PUSH > PR") {
      return {
        valid: true,
        code: "VALID_CHAIN",
        lines: [
          "GIT CHECK --PASS--> GIT COMMIT",
          "GIT COMMIT --SUCCESS--> GIT PUSH",
          "GIT PUSH --SUCCESS--> GIT PR"
        ]
      };
    }

    if (value === "STEP REVIEW STEP-017 > FIX > REVIEW") {
      return {
        valid: true,
        code: "VALID_CHAIN",
        lines: [
          "STEP REVIEW STEP-017 --FAIL--> STEP FIX STEP-017",
          "STEP FIX STEP-017 --SUCCESS--> STEP REVIEW STEP-017"
        ]
      };
    }

    if (/^(PROJECT|STEP|SKILL|GITHUB|RELEASE|HARNESS|GIT)\b/.test(value)) {
      return { valid: true, code: "VALID_COMMAND", lines: [value] };
    }

    return {
      valid: false,
      code: "MISSING_DOMAIN",
      lines: ["Первый segment должен начинаться с canonical DOMAIN."]
    };
  }

  function renderPreflight(raw, target) {
    const result = demoPreflight(raw);
    target.textContent = [
      result.code,
      ...result.lines
    ].join("\n");
    target.style.borderColor = result.valid ? "var(--success)" : "var(--error)";
    return result;
  }

  function setupCommandPreflight() {
    const input = $("#paletteCommandInput");
    const button = $("#paletteValidateBtn");
    const output = $("#palettePreflight");
    if (!input || !button || !output) return;

    button.addEventListener("click", () => renderPreflight(input.value, output));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderPreflight(input.value, output);
      }
    });
  }

  function setupGitChain() {
    const button = $("#gitChainBtn");
    const result = $("#gitChainResult");
    if (!button || !result) return;

    button.addEventListener("click", () => {
      if (state.runtime === "none") {
        toast("Сначала явно выберите runtime");
        return;
      }
      result.innerHTML = "<h2>VALID_CHAIN</h2><div class=\"codebox\">✓ GIT CHECK      PASS\n● GIT COMMIT     current\n○ GIT PUSH       pending\n○ GIT PR         pending</div><p>Chain зарегистрирован как одна execution sequence. Следующий segment определяется CTS.</p>";
    });
  }

  function setupPalette() {
    const backdrop = $("#paletteBackdrop");
    const input = $("#paletteSearch");
    const open = () => {
      backdrop.classList.add("on");
      input.value = "";
      $$(".palette-item").forEach((x) => x.hidden = false);
      setTimeout(() => input.focus(), 0);
    };
    const close = () => backdrop.classList.remove("on");
    $("#paletteBtn").addEventListener("click", open);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    input.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      $$(".palette-item").forEach((item) => item.hidden = !item.textContent.toLowerCase().includes(q));
    });
    $(".palette-item").forEach((item) => item.addEventListener("click", () => {
      const screen = item.dataset.goto;
      if (screen) {
        showScreen(screen);
        close();
        return;
      }
      if (item.dataset.command) {
        const commandInput = $("#paletteCommandInput");
        const preflight = $("#palettePreflight");
        if (commandInput) commandInput.value = item.dataset.command;
        if (preflight) renderPreflight(item.dataset.command, preflight);
      }
    }));
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape") close();
    });
  }

  function setupGenericCommands() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-command]");
      if (!button || button.disabled) return;
      const cmd = button.dataset.command;
      if (/STEP RUN|RUN STEP/.test(cmd)) return; // execution-run-demo.js handles this
      toast("Preflight PASS → demo dispatch: " + cmd);
    });
  }

  $$(".nav button[data-screen], [data-goto]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.screen || button.dataset.goto));
  });

  $("#runtimeSelect").addEventListener("change", (e) => {
    state.runtime = e.target.value;
    updateRuntimeUi();
    renderInitState();
  });
  $("#projectState").addEventListener("change", (e) => setProject(e.target.value));
  $("#saveBriefBtn").addEventListener("click", () => toast("PROJECT_BRIEF.local.md сохранён локально"));
  $("#initProjectBtn").addEventListener("click", runInitDemo);

  setupTabs();
  setupRoadmapFilter();
  setupSettings();
  setupUpdateDemo();
  setupSkills();
  setupCommandPreflight();
  setupGitChain();
  setupPalette();
  setupGenericCommands();

  const initial = location.hash.replace("#", "");
  showScreen(screenTitles[initial] ? initial : "overview");
  setProject("initialized");
  updateRuntimeUi();
}());
