/* VirtualDeck web: idioma, registro de novedades, tráiler y consola DOT. */
(function () {
  "use strict";

  /* ============ Registro de novedades (editar aquí) ============ */
  var FEATURES = [
    { version: "v0.14.0", date: "2026-10-07", items: [
      { code: "F-14-01", t: { es: "Docks físicos Stream Dock", en: "Physical Stream Docks" }, d: { es: "El N3 se detecta al conectarlo: teclas LCD pintadas, botones y perillas que disparan, paginas propias y 3 perfiles completos.", en: "The N3 is detected on plug-in: painted LCD keys, buttons and dials that fire, own pages and 3 full profiles." } },
      { code: "F-14-02", t: { es: "Doce modelos + page-nav", en: "Twelve models + page-nav" }, d: { es: "Cada aparato sale de su modelo; varias páginas por dock y acción page-nav para moverse entre ellas.", en: "Each device follows its model; several pages per dock and a page-nav action to move between them." } },
      { code: "F-14-03", t: { es: "Catálogo único de iconos", en: "Unified icon catalog" }, d: { es: "Unas 2.900 marcas y 5.100 iconos de acción con buscador en español, listos para copiar a cualquier botón.", en: "About 2,900 brands and 5,100 action icons with Spanish search, ready to copy onto any button." } },
      { code: "F-14-04", t: { es: "Editor por familias", en: "Family-based editor" }, d: { es: "La acción se elige por fichas con buscador; cada tipo tiene su formulario y los presets llevan su icono.", en: "Pick actions from searchable family cards; every type has its own form and presets carry their icon." } },
      { code: "F-14-05", t: { es: "Música plegable + progreso", en: "Folding music + progress" }, d: { es: "El panel se pliega a una lengüeta, se tumba en pantallas bajas y muestra la barra de progreso con aleatorio y repetición.", en: "The panel folds into a tab, lies down on short screens and shows the progress bar with shuffle and repeat." } },
      { code: "F-14-06", t: { es: "Formato barra 1280x480", en: "1280x480 bar format" }, d: { es: "Principal, kiosko y Dispositivos se adaptan a monitores anchos y bajos como una táctil secundaria.", en: "Main, kiosk and Devices adapt to wide short monitors like a secondary touchscreen." } },
      { code: "F-14-07", t: { es: "Mando móvil renovado", en: "Refreshed mobile remote" }, d: { es: "Mismo tema y acento del deck, widgets en vivo, marcas y mantener pulsado desde el navegador del teléfono.", en: "Same deck theme and accent, live widgets, brands and hold-to-press from the phone browser." } },
      { code: "F-14-08", t: { es: "Tienda en ventana propia", en: "Store in its own window" }, d: { es: "Perfiles y páginas con icono, portada y capturas; la ficha enseña el riesgo completo antes de instalar.", en: "Profiles and pages with icon, cover and screenshots; the card shows the full risk before installing." } },
      { code: "F-14-09", t: { es: "Voz nativa + días de semana", en: "Native voice + weekdays" }, d: { es: "Texto a voz del núcleo sin PowerShell y disparos por hora solo los días que elijas.", en: "Core text-to-speech with no PowerShell, and hourly triggers only on the days you pick." } },
      { code: "F-14-10", t: { es: "Contraste que se lee", en: "Contrast you can read" }, d: { es: "Widgets y deslizadores legibles sobre cualquier fondo en los dos temas; la ventana recuerda su monitor.", en: "Widgets and sliders readable over any background in both themes; the window remembers its monitor." } }
    ] },
    { version: "v0.13.0", date: "2026-09-15", items: [
      { code: "F-13-01", t: { es: "Tienda en ventana propia", en: "Store in its own window" }, d: { es: "Manifiesto v2, buscador, filtros y ficha con auditoría de riesgo antes de instalar.", en: "Manifest v2, search, filters, and risk-audit card before installing." } },
      { code: "F-13-02", t: { es: "Radial Dot Sweep", en: "Radial Dot Sweep" }, d: { es: "Onda expansiva de micro-puntos LED al pulsar, acelerada por GPU.", en: "GPU-accelerated micro-dot sweep on every key press." } },
      { code: "F-13-03", t: { es: "Editor de glifos 5x7", en: "5x7 glyph editor" }, d: { es: "Diseña iconos punto a punto con espejo, invertir y deshacer.", en: "Design icons dot by dot with mirror, invert, and undo." } },
      { code: "F-13-04", t: { es: "Portapapeles de botones", en: "Button clipboard" }, d: { es: "Copiar, pegar, duplicar y vaciar celdas con deshacer en toast.", en: "Copy, paste, duplicate, and clear cells with toast undo." } },
      { code: "F-13-05", t: { es: "PIN real de kiosko", en: "Real kiosk PIN" }, d: { es: "La pantalla completa ahora sí se bloquea con PIN de salida.", en: "Fullscreen now truly locks behind an exit PIN." } },
      { code: "F-13-06", t: { es: "Núcleo nativo Rust", en: "Native Rust core" }, d: { es: "Procesos, ventanas y monitores migrados de PowerShell a Rust.", en: "Processes, windows, and monitors moved from PowerShell to Rust." } },
      { code: "F-13-07", t: { es: "Discord + Spotify", en: "Discord + Spotify" }, d: { es: "Mute por RPC local y control de playlists y dispositivos.", en: "Mute via local RPC plus playlist and device control." } },
      { code: "F-13-08", t: { es: "Automatización Store", en: "Store automation" }, d: { es: "Empaquetado y validación MSIX con build-store.mjs.", en: "MSIX packaging and validation with build-store.mjs." } },
      { code: "F-13-09", t: { es: "Presets web ampliados", en: "Extended web presets" }, d: { es: "Gemini, Claude, ChatGPT, GitHub, YouTube, Twitch y más.", en: "Gemini, Claude, ChatGPT, GitHub, YouTube, Twitch, and more." } },
      { code: "F-13-10", t: { es: "Modo claro anti-glare", en: "Anti-glare light mode" }, d: { es: "Grises cemento mate en vez de blanco puro deslumbrante.", en: "Matte cement grays instead of glaring pure white." } },
      { code: "F-13-11", t: { es: "Ajustes colapsables", en: "Collapsible settings" }, d: { es: "Acordeón modular con memoria de estado por sección.", en: "Modular accordion with per-section state memory." } },
      { code: "F-13-12", t: { es: "Transporte en carátula", en: "On-artwork transport" }, d: { es: "Anterior, reproducir y siguiente sobre la imagen en franja DOT.", en: "Previous, play, and next over the artwork in a DOT strip." } }
    ] },
    { version: "v0.12.0", date: "2026-09-13", items: [
      { code: "F-12-01", t: { es: "Mando móvil con 2x2", en: "Mobile remote with 2x2" }, d: { es: "Mosaico y sliders táctiles proyectados al teléfono en red local.", en: "Mosaic and touch sliders mirrored to your phone over LAN." } },
      { code: "F-12-02", t: { es: "Monitores hotplug", en: "Hotplug monitors" }, d: { es: "Detección en caliente con auto-clamping anti-pérdida.", en: "Hot detection with anti-loss auto-clamping." } },
      { code: "F-12-03", t: { es: "Auto-perfiles + anclados", en: "Auto-profiles + pinned" }, d: { es: "Cambio por app activa y botones PIN persistentes.", en: "Active-app switching plus persistent PIN buttons." } },
      { code: "F-12-04", t: { es: "Mosaico modular 2x2", en: "Modular 2x2 mosaic" }, d: { es: "Cuatro mini-botones independientes por celda.", en: "Four independent mini-buttons per cell." } },
      { code: "F-12-05", t: { es: "Dial rotativo DOT", en: "DOT rotary dial" }, d: { es: "Anillo de 16 LEDs que responde a la rueda del ratón.", en: "16-LED ring that answers the mouse wheel." } },
      { code: "F-12-06", t: { es: "Sistema DOT / 480", en: "DOT / 480 system" }, d: { es: "Iconografía bitmask 8x8, cero emojis, OLED puro.", en: "8x8 bitmask icons, zero emojis, pure OLED." } }
    ] }
  ];

  function lang() { return document.documentElement.lang === "en" ? "en" : "es"; }

  function renderRegistro() {
    var host = document.getElementById("registro");
    if (!host) return;
    host.innerHTML = "";
    FEATURES.forEach(function (rel) {
      var block = document.createElement("div");
      block.className = "rel-block";
      var head = document.createElement("div");
      head.className = "rel-head";
      head.innerHTML = '<span class="rel-ver">' + rel.version + "</span>" +
        '<span class="rel-date">' + rel.date + "</span>" +
        '<span class="rel-count">' + rel.items.length + " FEATURES</span>";
      block.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "rel-grid";
      rel.items.forEach(function (f) {
        var cell = document.createElement("div");
        cell.className = "feat";
        var h = document.createElement("div");
        h.className = "feat-code";
        h.textContent = f.code;
        var t = document.createElement("h3");
        t.textContent = f.t[lang()];
        t.setAttribute("data-feat", f.code);
        var p = document.createElement("p");
        p.textContent = f.d[lang()];
        p.setAttribute("data-feat-d", f.code);
        cell.appendChild(h);
        cell.appendChild(t);
        cell.appendChild(p);
        grid.appendChild(cell);
      });
      block.appendChild(grid);
      host.appendChild(block);
    });
    applyLangToFeatures();
  }

  function applyLangToFeatures() {
    var l = lang();
    FEATURES.forEach(function (rel) {
      rel.items.forEach(function (f) {
        var t = document.querySelector('[data-feat="' + f.code + '"]');
        var p = document.querySelector('[data-feat-d="' + f.code + '"]');
        if (t) t.textContent = f.t[l];
        if (p) p.textContent = f.d[l];
      });
    });
  }

  /* ============ Idioma ============ */
  function recordado() { try { return localStorage.getItem("vd-lang"); } catch { return null; } }
  function recordar(l) { try { localStorage.setItem("vd-lang", l); } catch { return null; } }

  function aplicar(l) {
    document.documentElement.lang = l;
    var btns = document.querySelectorAll(".idioma-bar button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-lang") === l));
    }
    applyLangToFeatures();
    var fotos = document.querySelectorAll("img[data-alt-en]");
    for (var j = 0; j < fotos.length; j++) {
      var altEn = fotos[j].getAttribute("data-alt-en");
      if (l === "en") {
        if (!fotos[j].getAttribute("data-alt-es")) fotos[j].setAttribute("data-alt-es", fotos[j].getAttribute("alt") || "");
        fotos[j].setAttribute("alt", altEn);
      } else if (fotos[j].getAttribute("data-alt-es")) {
        fotos[j].setAttribute("alt", fotos[j].getAttribute("data-alt-es"));
      }
    }
    var banners = document.querySelectorAll("img[src*='prensa/banners/']");
    for (var k = 0; k < banners.length; k++) {
      var s = banners[k].getAttribute("src");
      if (l === "en" && s.indexOf("/es/") !== -1) {
        banners[k].setAttribute("src", s.replace("/es/", "/en/"));
      } else if (l === "es" && s.indexOf("/en/") !== -1) {
        banners[k].setAttribute("src", s.replace("/en/", "/es/"));
      }
    }
    if (window.VDGaleria && window.VDGaleria.setLang) window.VDGaleria.setLang(l);
    setTrailer(l);
  }

  /* ============ Tráiler por idioma ============ */
  function setTrailer(l) {
    var v = document.getElementById("trailer");
    if (!v) return;
    var src = l === "es" ? "video/trailer-es.mp4?v=0.14.0" : "video/trailer-en.mp4?v=0.14.0";
    if (v.getAttribute("src") !== src) {
      var t = v.currentTime || 0;
      v.setAttribute("src", src);
      v.load();
      try { v.currentTime = Math.min(t, 1); } catch { return null; }
    }
    var tracks = v.querySelectorAll("track");
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].track.mode = tracks[i].getAttribute("srclang") === l ? "showing" : "disabled";
    }
  }

  /* ============ Versión viva desde GitHub ============ */
  function versionViva() {
    fetch("https://api.github.com/repos/AndyVillatoro/virtualdeck/releases/latest")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.tag_name) return;
        var es = document.querySelector(".badge-tag [data-es]");
        var en = document.querySelector(".badge-tag [data-en]");
        if (es) es.textContent = "VirtualDeck " + d.tag_name + " · 100% Local y Gratuito";
        if (en) en.textContent = "VirtualDeck " + d.tag_name + " · 100% Local & Free";
      })
      .catch(function () { return null; });
  }

  /* ============ Consola DOT ============ */
  var audioCtx = null;
  var audioOn = true;
  function click() {
    if (!audioOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.02);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch { return null; }
  }

  function armarConsola() {
    var hud = document.getElementById("hud-read");
    var audioBtn = document.getElementById("audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", function () {
        audioOn = !audioOn;
        audioBtn.textContent = audioOn ? "AUDIO: ON" : "AUDIO: OFF";
      });
    }
    var hudTimer = null;
    var keys = document.querySelectorAll(".dotkey");
    for (var i = 0; i < keys.length; i++) {
      (function (key) {
        key.addEventListener("click", function () {
          click();
          key.classList.add("hit");
          setTimeout(function () { key.classList.remove("hit"); }, 160);
        var l = lang();
        var msg = l === "es" ? key.getAttribute("data-hud-es") : key.getAttribute("data-hud-en");
        var idleTxt = l === "es" ? "[ LISTO ] Pulsa una tecla de la consola" : "[ READY ] Press a console key";
        if (hud) hud.textContent = "[>] " + msg;
        if (hudTimer) clearTimeout(hudTimer);
        hudTimer = setTimeout(function () {
          if (!hud) return;
          hud.innerHTML = "";
          var idle = document.createElement("span");
          idle.className = "idle";
          idle.textContent = idleTxt;
          hud.appendChild(idle);
        }, 2200);
        });
      })(keys[i]);
    }
  }

  /* ============ Arranque ============ */
  function arrancar() {
    var delNavegador = (navigator.language || "").toLowerCase().indexOf("es") === 0 ? "es" : "en";
    var btns = document.querySelectorAll(".idioma-bar button");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener("click", function () {
          aplicar(b.getAttribute("data-lang"));
          recordar(b.getAttribute("data-lang"));
        });
      })(btns[i]);
    }
    renderRegistro();
    aplicar(recordado() || delNavegador);
    versionViva();
    armarConsola();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
