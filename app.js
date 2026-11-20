/* Writing Timers — plain JavaScript, no frameworks. */
(function () {
  "use strict";

  /* ======================================================
     Defaults & settings
     ====================================================== */
  var ACTIVITIES = [
    { id: "morning", name: "Morning Page" },
    { id: "practice", name: "Practice" },
    { id: "draft", name: "Draft" }
  ];

  var DEFAULTS = {
    durations: { morning: 10, practice: 60, draft: 180 }, // minutes
    messages: ["Surrender", "Saidar", "Let go", "Listen", "Let it come", "Clear, as if for kids"],
    warning: true,
    breakReminder: true
  };

  var SETTINGS_KEY = "writingTimers.settings.v1";
  var SESSION_KEY = "writingTimers.session.v1";

  var WARNING_MS = 2 * 60 * 1000;
  var BIG_MESSAGE_MS = 5000;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable — keep working in memory */ }
  }
  function load(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function loadSettings() {
    var s = load(SETTINGS_KEY) || {};
    var d = clone(DEFAULTS);
    if (s.durations) {
      ACTIVITIES.forEach(function (a) {
        var m = Number(s.durations[a.id]);
        if (m > 0) d.durations[a.id] = m;
      });
    }
    if (Array.isArray(s.messages)) d.messages = s.messages.map(String);
    if (typeof s.warning === "boolean") d.warning = s.warning;
    if (typeof s.breakReminder === "boolean") d.breakReminder = s.breakReminder;
    return d;
  }

  var settings = loadSettings();
  function saveSettings() { store(SETTINGS_KEY, settings); }

  /* ======================================================
     Helpers
     ====================================================== */
  var $ = function (id) { return document.getElementById(id); };

  function formatDurationLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + " hr " + m + " min";
    if (h) return h + (h === 1 ? " hour" : " hours");
    return m + " min";
  }

  function formatClock(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : pad(m) + ":" + pad(s);
  }

  /* ======================================================
     Sound — synthesized woodblock knocks (Web Audio API)
     ====================================================== */
  var audio = null;
  var master = null;

  function ensureAudio() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        // Let sounds play even when the iPhone's silent switch is on (Safari 17+).
        if (navigator.audioSession) navigator.audioSession.type = "playback";
      } catch (e) {}
      audio = new AC();
      master = audio.createGain();
      master.gain.value = 0.9;
      // Gentle low-pass keeps every sound warm and rounded, never shrill.
      var tone = audio.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 2200;
      master.connect(tone);
      tone.connect(audio.destination);
    }
    if (audio.state === "suspended") { audio.resume().catch(function () {}); }
    return audio;
  }

  // First tap anywhere unlocks audio (required on iPhone).
  function unlockAudio() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var buf = ctx.createBuffer(1, 1, 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
    ["touchend", "pointerdown", "keydown"].forEach(function (ev) {
      document.removeEventListener(ev, unlockAudio, true);
    });
  }
  ["touchend", "pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, unlockAudio, true);
  });

  var noiseBuffer = null;
  function getNoise(ctx) {
    if (!noiseBuffer) {
      var len = Math.floor(ctx.sampleRate * 0.04);
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    return noiseBuffer;
  }

  /**
   * One woody knock.
   * freq  – fundamental pitch (low = hollow)
   * level – loudness 0..1
   * decay – ring length in seconds
   * delay – seconds from now
   */
  function knock(freq, level, decay, delay) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var t = ctx.currentTime + 0.02 + (delay || 0);

    // Body: a rounded tone that drops slightly in pitch, like wood being struck.
    var body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(freq * 1.12, t);
    body.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    var bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, t);
    bodyGain.gain.exponentialRampToValueAtTime(level, t + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    body.connect(bodyGain).connect(master);

    // Hollow overtone — the inharmonic partial that makes it sound like a woodblock.
    var over = ctx.createOscillator();
    over.type = "sine";
    over.frequency.value = freq * 2.57;
    var overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.0001, t);
    overGain.gain.exponentialRampToValueAtTime(level * 0.22, t + 0.003);
    overGain.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.4);
    over.connect(overGain).connect(master);

    // Soft attack: a tiny, filtered tap of noise.
    var tap = ctx.createBufferSource();
    tap.buffer = getNoise(ctx);
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq * 3;
    bp.Q.value = 1.2;
    var tapGain = ctx.createGain();
    tapGain.gain.setValueAtTime(level * 0.35, t);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    tap.connect(bp).connect(tapGain).connect(master);

    body.start(t); body.stop(t + decay + 0.05);
    over.start(t); over.stop(t + decay + 0.05);
    tap.start(t); tap.stop(t + 0.04);
  }

  var sounds = {
    start:   function () { knock(430, 0.55, 0.12, 0); },                                 // one click
    warning: function () { knock(250, 0.38, 0.32, 0); },                                 // one soft knock
    breakIt: function () { knock(240, 0.85, 0.38, 0); knock(240, 0.85, 0.38, 1.1); },    // two slow knocks
    end:     function () { knock(230, 0.9, 0.42, 0); knock(230, 0.9, 0.42, 1.0); knock(230, 0.9, 0.42, 2.0); } // three slow knocks
  };

  /* ======================================================
     Screen Wake Lock (fails silently when unsupported)
     ====================================================== */
  var wakeLock = null;
  function keepScreenOn() {
    if (wakeLock || !("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (lock) {
      wakeLock = lock;
      lock.addEventListener("release", function () { wakeLock = null; });
    }).catch(function () {});
  }
  function allowScreenOff() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} }
    wakeLock = null;
  }

  /* ======================================================
     Screens
     ====================================================== */
  var currentScreen = "list";
  var screenBeforeSettings = "list";

  function show(name) {
    var next = $("screen-" + name);
    document.querySelectorAll(".screen.active").forEach(function (el) {
      if (el !== next) el.classList.remove("active", "shown");
    });
    next.classList.add("active");
    requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.add("shown"); }); });
    currentScreen = name;
    if (name === "list") setToday();
    updateBreakNote();
  }

  // The sticky-note break reminder shows on the list and the timer screen.
  function updateBreakNote() {
    $("break-banner").hidden = !(session && session.breakBanner &&
      (currentScreen === "timer" || currentScreen === "list"));
    $("break-banner").classList.toggle("at-bottom", currentScreen === "list");
  }

  function setToday() {
    try {
      $("today").textContent = new Date().toLocaleDateString(undefined,
        { weekday: "long", day: "numeric", month: "long" });
    } catch (e) { $("today").textContent = ""; }
  }

  /* ======================================================
     Activity list
     ====================================================== */
  function renderActivities() {
    var wrap = $("activity-buttons");
    wrap.innerHTML = "";
    ACTIVITIES.forEach(function (a) {
      var b = document.createElement("button");
      b.className = "activity";
      b.setAttribute("data-id", a.id);
      b.innerHTML = '<span class="activity-name"></span><span class="activity-time"></span>';
      b.querySelector(".activity-name").textContent = a.name;
      b.querySelector(".activity-time").textContent = formatDurationLabel(settings.durations[a.id]);
      b.addEventListener("click", function () { chooseActivity(a); });
      wrap.appendChild(b);
    });
    updateRunningCard();
  }

  // While a timer is going, its card shows the time left; tapping it returns to the timer.
  function updateRunningCard() {
    document.querySelectorAll(".activity").forEach(function (card) {
      var a = ACTIVITIES.filter(function (x) { return x.id === card.getAttribute("data-id"); })[0];
      var isCurrent = !!(session && session.id === a.id);
      card.classList.toggle("running", isCurrent);
      var label = card.querySelector(".activity-time");
      if (isCurrent) {
        var state = session.running ? "In progress" : "Paused";
        label.textContent = state + " · " + formatClock(remainingMs());
      } else {
        label.textContent = formatDurationLabel(settings.durations[a.id]);
      }
    });
  }

  function chooseActivity(a) {
    if (session && session.id === a.id) { showTimerScreen(false); return; }
    if (session && !window.confirm("Stop " + session.name + " and start " + a.name + "?")) return;
    startActivity(a);
  }

  /* ======================================================
     Timer
     ====================================================== */
  // The running session. Time left is always computed from a stored
  // end timestamp, so it stays correct if the phone sleeps.
  var session = null;
  var ticker = null;
  var bigMessageTimer = null;

  function saveSession() { store(SESSION_KEY, session); }

  function remainingMs() {
    if (!session) return 0;
    return session.running ? session.endAt - Date.now() : session.remaining;
  }

  function pickMessage() {
    var list = settings.messages.map(function (m) { return m.trim(); }).filter(Boolean);
    if (!list.length) return "";
    return list[Math.floor(Math.random() * list.length)];
  }

  function startActivity(activity) {
    ensureAudio();
    var duration = settings.durations[activity.id] * 60 * 1000;
    session = {
      id: activity.id,
      name: activity.name,
      duration: duration,
      running: true,
      endAt: Date.now() + duration,
      remaining: duration,
      breakFired: false,
      breakBanner: false,
      warnFired: false,
      message: pickMessage()
    };
    saveSession();
    sounds.start();
    keepScreenOn();
    showTimerScreen(true);
    startTicking();
  }

  function showTimerScreen(withBigMessage) {
    $("timer-name").textContent = session.name;
    var big = $("message-big"), small = $("message-small");
    big.textContent = session.message;
    small.textContent = session.message;
    clearTimeout(bigMessageTimer);
    if (withBigMessage && session.message) {
      small.classList.remove("visible");
      big.classList.add("visible");
      bigMessageTimer = setTimeout(settleMessage, BIG_MESSAGE_MS);
    } else {
      big.classList.remove("visible");
      small.classList.toggle("visible", !!session.message);
    }
    show("timer");
    render();
  }

  // Fade the big message into the small line at the bottom.
  function settleMessage() {
    clearTimeout(bigMessageTimer);
    $("message-big").classList.remove("visible");
    setTimeout(function () { $("message-small").classList.add("visible"); }, 500);
  }
  $("message-big").addEventListener("click", settleMessage);

  function startTicking() {
    stopTicking();
    ticker = setInterval(tick, 250);
    tick();
  }
  function stopTicking() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function tick() {
    if (!session) return;
    if (session.running) {
      var left = remainingMs();
      var elapsed = session.duration - left;

      if (left <= 0) { finish(true); return; }

      var played = false;

      // Draft break reminder — halfway through, once per session.
      if (session.id === "draft" && settings.breakReminder && !session.breakFired &&
          elapsed >= session.duration / 2) {
        session.breakFired = true;
        session.breakBanner = true;
        sounds.breakIt();
        played = true;
        saveSession();
      }

      // Gentle 2-minute warning.
      if (settings.warning && !session.warnFired && left <= WARNING_MS) {
        session.warnFired = true;
        if (session.duration > WARNING_MS) {
          if (played) setTimeout(sounds.warning, 2600); else sounds.warning();
        }
        saveSession();
      }
    }
    render();
  }

  function render() {
    if (!session) return;
    var left = remainingMs();
    var count = $("timer-count");
    var text = formatClock(left);
    count.textContent = text;
    count.classList.toggle("long", text.length > 5);

    var fresh = !session.running && session.remaining >= session.duration;
    $("btn-pause").textContent = session.running ? "Pause" : (fresh ? "Start" : "Resume");
    $("timer-state").textContent = session.running ? "" : (fresh ? "Ready" : "Paused");
    updateBreakNote();
    updateRunningCard();
    document.title = (session.running ? text + " · " : "") + "Writing Timers";
  }

  function pauseOrResume() {
    if (!session) return;
    if (session.running) {
      session.remaining = Math.max(0, session.endAt - Date.now());
      session.running = false;
      session.breakBanner = false; // tapping Pause dismisses the break banner
      allowScreenOff();
    } else {
      session.endAt = Date.now() + session.remaining;
      session.running = true;
      sounds.start();
      keepScreenOn();
    }
    saveSession();
    tick();
  }

  function resetTimer() {
    if (!session) return;
    session.running = false;
    session.remaining = session.duration;
    session.breakFired = false;
    session.breakBanner = false;
    session.warnFired = false;
    allowScreenOff();
    saveSession();
    render();
  }

  function stopTimer() {
    clearSession();
    show("list");
  }

  function clearSession() {
    stopTicking();
    allowScreenOff();
    clearTimeout(bigMessageTimer);
    session = null;
    store(SESSION_KEY, null);
    document.title = "Writing Timers";
    updateRunningCard();
    updateBreakNote();
  }

  function finish(playSound) {
    var name = session ? session.name : "";
    clearSession();
    if (playSound) sounds.end();
    $("done-sub").textContent = name ? name + " is complete." : "";
    show("done");
  }

  $("btn-pause").addEventListener("click", pauseOrResume);
  $("btn-reset").addEventListener("click", resetTimer);
  $("btn-stop").addEventListener("click", stopTimer);
  $("btn-done").addEventListener("click", function () { show("list"); });

  // Back arrow: return to all the timers. The timer keeps running.
  $("btn-back").addEventListener("click", function () {
    if ($("message-big").classList.contains("visible")) settleMessage();
    show("list");
  });

  // Tapping the sticky note opens the timer, where Pause is.
  $("break-banner").addEventListener("click", function () {
    if (session && currentScreen !== "timer") showTimerScreen(false);
  });

  // When the app comes back to the front, catch up straight away
  // and ask for the wake lock again (browsers drop it when hidden).
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && currentScreen === "list") setToday();
    if (document.visibilityState === "visible" && session) {
      if (session.running) { ensureAudio(); keepScreenOn(); }
      tick();
    }
  });

  /* ======================================================
     Settings screen
     ====================================================== */
  function buildSelect(max, value, step) {
    var sel = document.createElement("select");
    for (var i = 0; i <= max; i += (step || 1)) {
      var o = document.createElement("option");
      o.value = i;
      o.textContent = i;
      if (i === value) o.selected = true;
      sel.appendChild(o);
    }
    return sel;
  }

  function renderSettings() {
    // Durations
    var rows = $("duration-rows");
    rows.innerHTML = "";
    ACTIVITIES.forEach(function (a) {
      var total = settings.durations[a.id];
      var row = document.createElement("div");
      row.className = "duration-row";
      var label = document.createElement("span");
      label.className = "label";
      label.textContent = a.name;
      var inputs = document.createElement("div");
      inputs.className = "duration-inputs";

      var hSel = buildSelect(12, Math.floor(total / 60));
      var mSel = buildSelect(59, total % 60);
      hSel.setAttribute("aria-label", a.name + " hours");
      mSel.setAttribute("aria-label", a.name + " minutes");

      var hLab = document.createElement("label"); hLab.appendChild(hSel); hLab.appendChild(document.createTextNode("h"));
      var mLab = document.createElement("label"); mLab.appendChild(mSel); mLab.appendChild(document.createTextNode("m"));
      inputs.appendChild(hLab); inputs.appendChild(mLab);

      function update() {
        var mins = Number(hSel.value) * 60 + Number(mSel.value);
        if (mins < 1) { mins = 1; mSel.value = 1; } // at least one minute
        settings.durations[a.id] = mins;
        saveSettings();
        renderActivities();
      }
      hSel.addEventListener("change", update);
      mSel.addEventListener("change", update);

      row.appendChild(label); row.appendChild(inputs);
      rows.appendChild(row);
    });

    // Toggles
    $("set-warning").checked = settings.warning;
    $("set-break").checked = settings.breakReminder;

    renderMessages();
  }

  function renderMessages() {
    var wrap = $("message-rows");
    wrap.innerHTML = "";
    settings.messages.forEach(function (msg, i) {
      var row = document.createElement("div");
      row.className = "message-row";
      var input = document.createElement("input");
      input.type = "text";
      input.value = msg;
      input.setAttribute("aria-label", "Message " + (i + 1));
      input.addEventListener("input", function () {
        settings.messages[i] = input.value;
        saveSettings();
      });
      var rm = document.createElement("button");
      rm.className = "remove-btn";
      rm.setAttribute("aria-label", "Remove message");
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        settings.messages.splice(i, 1);
        saveSettings();
        renderMessages();
      });
      row.appendChild(input); row.appendChild(rm);
      wrap.appendChild(row);
    });
  }

  $("set-warning").addEventListener("change", function (e) { settings.warning = e.target.checked; saveSettings(); });
  $("set-break").addEventListener("change", function (e) { settings.breakReminder = e.target.checked; saveSettings(); });

  $("btn-add-message").addEventListener("click", function () {
    settings.messages.push("");
    saveSettings();
    renderMessages();
    var inputs = $("message-rows").querySelectorAll("input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  $("btn-defaults").addEventListener("click", function () {
    if (!window.confirm("Reset all durations, messages and reminders to the defaults?")) return;
    settings = clone(DEFAULTS);
    saveSettings();
    renderSettings();
    renderActivities();
  });

  function openSettings() {
    screenBeforeSettings = currentScreen === "settings" ? "list" : currentScreen;
    // Tidy away blank messages left over from last time.
    settings.messages = settings.messages.filter(function (m) { return m.trim(); });
    saveSettings();
    renderSettings();
    show("settings");
    $("screen-settings").querySelector(".settings-body").scrollTop = 0;
  }
  document.querySelectorAll("[data-open-settings]").forEach(function (b) {
    b.addEventListener("click", openSettings);
  });
  $("btn-settings-back").addEventListener("click", function () {
    settings.messages = settings.messages.filter(function (m) { return m.trim(); });
    saveSettings();
    renderActivities();
    show(screenBeforeSettings);
  });

  /* ======================================================
     Navigation & start-up
     ====================================================== */
  renderActivities();

  // If the app was closed mid-timer, pick up where it left off.
  var saved = load(SESSION_KEY);
  if (saved && saved.duration) {
    session = saved;
    if (session.running && session.endAt <= Date.now()) {
      finish(false);
    } else {
      showTimerScreen(false);
      if (session.running) keepScreenOn();
      startTicking();
    }
  } else {
    show("list");
  }

  // Offline support.
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }
})();
