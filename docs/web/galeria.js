/* Galería por scroll: la captura avanza con el scroll y cambia con
   una transición de matriz de puntos + leve zoom. Sin dependencias. */
(function () {
  "use strict";

  var VERSION = "?v=0.14.0";
  var ITEMS = [
    { img: "01-deck", n: "01", t: { es: "Deck principal", en: "Main deck" }, d: { es: "Panel de música con visualizador de puntos, rejilla de 4x4 con iconos del catálogo y barra lateral con reloj, clima, sensores y RGB.", en: "Music panel with dot visualizer, 4x4 grid of catalog icons, and a sidebar with clock, weather, sensors and RGB." }, alt: { es: "Pantalla principal de VirtualDeck", en: "VirtualDeck main screen" } },
    { img: "02-editor", n: "02", t: { es: "Editor de acciones", en: "Action editor" }, d: { es: "Vista previa del botón, PRESETS con fichas de apps y APARIENCIA con el icono del catálogo, todo por secciones.", en: "Button preview, PRESETS with app cards and APPEARANCE with the catalog icon, all in sections." }, alt: { es: "Editor de botones por secciones", en: "Section-based button editor" } },
    { img: "03-catalogo", n: "03", t: { es: "Catálogo de iconos", en: "Icon catalog" }, d: { es: "Un buscador para marcas y acciones a la vez, con grupos, filtros por tipo y alias en español.", en: "One search for brands and actions at once, with groups, type filters and Spanish aliases." }, alt: { es: "Catálogo único de iconos", en: "Unified icon catalog" } },
    { img: "04-dock", n: "04", t: { es: "Dock N3", en: "N3 dock" }, d: { es: "La pantalla Dispositivos con el N3 conectado: rotación, brillo de teclas LCD, página pintada entera y perfiles.", en: "The Devices screen with the N3 plugged in: rotation, LCD key brightness, fully painted page and profiles." }, alt: { es: "Dock físico Stream Dock N3 configurado", en: "Configured Stream Dock N3 hardware" } },
    { img: "05-movil", n: "05", t: { es: "Mando móvil", en: "Mobile remote" }, d: { es: "La misma rejilla en el navegador del teléfono, con widgets, tema y acento del deck, sin instalar nada.", en: "The same grid in the phone browser, with the deck widgets, theme and accent, with nothing to install." }, alt: { es: "Mando móvil en el teléfono", en: "Mobile remote on the phone" } },
    { img: "05b-movil-marco", n: "06", t: { es: "Mando en vertical", en: "Portrait remote" }, d: { es: "El mando llena el alto del teléfono: dos franjas finas de fondo y nada más que botones.", en: "The remote fills the phone height: two thin background strips and nothing but buttons." }, alt: { es: "Mando móvil en vertical", en: "Portrait mobile remote" } },
    { img: "06-tienda", n: "07", t: { es: "Tienda", en: "Store" }, d: { es: "Ventana propia con buscador, filtros por tipo y app, y tarjetas con portada e icono.", en: "Its own window with search, type and app filters, and cards with cover and icon." }, alt: { es: "Tienda de perfiles", en: "Profile store" } },
    { img: "06b-tienda-ficha", n: "08", t: { es: "Ficha con riesgo", en: "Risk card" }, d: { es: "Cada entrada enseña su aviso completo —programas, scripts, atajos— antes de instalar.", en: "Each entry shows its full warning —programs, scripts, hotkeys— before installing." }, alt: { es: "Ficha de perfil con auditoría de riesgo", en: "Profile card with risk audit" } },
    { img: "07-barra-flotante", n: "09", t: { es: "Barra flotante", en: "Floating bar" }, d: { es: "La columna siempre encima del escritorio, con los mismos botones y widgets del deck.", en: "The always-on-top desktop column, with the same deck buttons and widgets." }, alt: { es: "Barra flotante sobre el escritorio", en: "Floating bar over the desktop" } },
    { img: "08-kiosko-barra", n: "10", t: { es: "Kiosko en barra", en: "Bar kiosk" }, d: { es: "Pantalla completa de verdad en 1280x480, pensada para una táctil secundaria o tableta.", en: "True fullscreen at 1280x480, meant for a secondary touchscreen or tablet." }, alt: { es: "Modo kiosko en formato barra", en: "Kiosk mode in bar format" } },
    { img: "09-rgb", n: "11", t: { es: "Luces RGB", en: "RGB lights" }, d: { es: "Dispositivos, zonas, pintor LED a LED y 18 presets vía OpenRGB.", en: "Devices, zones, LED-by-LED painter and 18 presets via OpenRGB." }, alt: { es: "Gestor de luces RGB", en: "RGB lighting manager" } }
  ];

  var gal = null;
  var canvas = null;
  var ctx = null;
  var capN = null;
  var capT = null;
  var capD = null;
  var count = null;
  var dotsNav = null;
  var idioma = "es";
  var pos = -1;
  var indice = -1;
  var sucio = true;
  var fotogramaPedido = false;
  var muestras = {};
  var imgs = {};
  var reducido = false;
  var cols = 84;
  var filas = 47;

  function ruta(it) { return "prensa/banners/" + idioma + "/" + it.img + ".png" + VERSION; }

  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }

  function medir() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(2, Math.round(r.width * dpr));
    canvas.height = Math.max(2, Math.round(r.height * dpr));
    cols = Math.max(48, Math.min(160, Math.round(r.width / 12)));
    filas = Math.max(27, Math.round((cols * canvas.height) / Math.max(1, canvas.width)));
    muestras = {};
    sucio = true;
    pedirFotograma();
  }

  /* Reduce cada imagen a una rejilla de colores para pintar puntos rápido. */
  function muestrear(it) {
    var img = imgs[it.img];
    if (!img || !img.naturalWidth) return null;
    var clave = it.img + "|" + idioma + "|" + cols + "x" + filas;
    if (muestras[clave]) return muestras[clave];
    var off = document.createElement("canvas");
    off.width = cols;
    off.height = filas;
    var c = off.getContext("2d", { willReadFrequently: true });
    if (!c) return null;
    c.fillStyle = "#000";
    c.fillRect(0, 0, cols, filas);
    var s = Math.min(cols / img.naturalWidth, filas / img.naturalHeight);
    c.drawImage(img, (cols - img.naturalWidth * s) / 2, (filas - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    var datos;
    try {
      datos = c.getImageData(0, 0, cols, filas).data;
    } catch {
      return null;
    }
    muestras[clave] = datos;
    return datos;
  }

  function colorDe(datos, x, y) {
    var i = (y * cols + x) * 4;
    return [datos[i], datos[i + 1], datos[i + 2]];
  }

  /* Dibuja una imagen quieta, encajada sin recortar. */
  function dibujarQuieta(it) {
    var img = imgs[it.img];
    var w = canvas.width;
    var h = canvas.height;
    ctx.fillStyle = "#070809";
    ctx.fillRect(0, 0, w, h);
    if (!img || !img.naturalWidth) return;
    var s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  }

  /* Transición: la saliente se disuelve en puntos y la entrante se compone
     desde puntos, con un leve zoom de acercamiento como segundo efecto. */
  function dibujarTransicion(a, b, t) {
    var da = muestrear(a);
    var db = muestrear(b);
    if (!da || !db) {
      dibujarQuieta(t < 0.5 ? a : b);
      return;
    }
    var w = canvas.width;
    var h = canvas.height;
    var cw = w / cols;
    var chh = h / filas;
    var zoom = 1.07 - 0.07 * t;
    ctx.fillStyle = "#070809";
    ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < filas; y++) {
      for (var x = 0; x < cols; x++) {
        var hh = hash(x, y);
        var entrante = hh < t;
        var c3;
        if (entrante) {
          var zx = Math.round((x - cols / 2) / zoom + cols / 2);
          var zy = Math.round((y - filas / 2) / zoom + filas / 2);
          if (zx < 0 || zy < 0 || zx >= cols || zy >= filas) continue;
          c3 = colorDe(db, zx, zy);
        } else {
          c3 = colorDe(da, x, y);
        }
        var prox = Math.abs(hh - t);
        var lado = Math.min(1, prox * 6);
        var r = Math.min(cw, chh) * (0.14 + 0.34 * lado);
        if (r < 0.5) continue;
        ctx.fillStyle = "rgb(" + c3[0] + "," + c3[1] + "," + c3[2] + ")";
        ctx.fillRect(x * cw + (cw - r) / 2, y * chh + (chh - r) / 2, r, r);
      }
    }
  }

  function pintar() {
    if (pos < 0 || !ctx) return;
    var i0 = Math.floor(pos);
    var f = pos - i0;
    if (i0 >= ITEMS.length - 1) {
      if (indice !== ITEMS.length - 1) mostrarIndice(ITEMS.length - 1);
      dibujarQuieta(ITEMS[ITEMS.length - 1]);
      return;
    }
    var redondo = Math.round(pos);
    if (redondo !== indice) mostrarIndice(redondo);
    if (reducido) {
      dibujarQuieta(ITEMS[redondo]);
    } else if (f < 0.02) {
      dibujarQuieta(ITEMS[i0]);
    } else if (f > 0.98) {
      dibujarQuieta(ITEMS[i0 + 1]);
    } else {
      dibujarTransicion(ITEMS[i0], ITEMS[i0 + 1], f);
    }
  }

  function mostrarIndice(k) {
    indice = k;
    var it = ITEMS[k];
    var l = idioma;
    if (capN) capN.textContent = it.n;
    if (capT) capT.textContent = it.t[l];
    if (capD) capD.textContent = it.d[l];
    if (canvas) canvas.setAttribute("aria-label", it.n + " — " + it.t[l] + ". " + it.alt[l]);
    if (count) count.textContent = it.n + " / " + ITEMS.length;
    if (dotsNav) {
      var bs = dotsNav.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].getAttribute("data-k") === String(k)) bs[i].setAttribute("aria-current", "true");
        else bs[i].removeAttribute("aria-current");
      }
    }
  }

  function pedirFotograma() {
    if (fotogramaPedido) return;
    fotogramaPedido = true;
    requestAnimationFrame(function () {
      fotogramaPedido = false;
      if (sucio) {
        sucio = false;
        pintar();
      }
    });
  }

  function leerScroll() {
    if (!gal) return;
    var vh = window.innerHeight;
    var arriba = gal.offsetTop;
    var total = gal.offsetHeight - vh;
    if (total <= 0) return;
    var p = (window.scrollY - arriba) / total;
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    var np = p * (ITEMS.length - 1);
    if (np !== pos) {
      pos = np;
      sucio = true;
      pedirFotograma();
    }
  }

  function irA(k, suave) {
    if (!gal) return;
    var vh = window.innerHeight;
    var total = gal.offsetHeight - vh;
    var y = gal.offsetTop + (total * k) / (ITEMS.length - 1);
    var animado = suave !== false && !reducido;
    window.scrollTo({ top: y, behavior: animado ? "smooth" : "auto" });
  }

  function cargar(i) {
    var it = ITEMS[i];
    if (!it || imgs[it.img]) return;
    var img = new Image();
    img.alt = "";
    img.onload = function () {
      sucio = true;
      pedirFotograma();
    };
    img.src = ruta(it);
    imgs[it.img] = img;
  }

  function armar() {
    gal = document.getElementById("scrollgal");
    if (!gal) return;
    canvas = document.getElementById("scrollgal-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    capN = document.getElementById("scrollgal-num");
    capT = document.getElementById("scrollgal-titulo");
    capD = document.getElementById("scrollgal-desc");
    count = document.getElementById("scrollgal-count");
    dotsNav = document.getElementById("scrollgal-dots");
    reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gal.style.height = ITEMS.length * 110 + 100 + "vh";

    if (dotsNav) {
      for (var i = 0; i < ITEMS.length; i++) {
        (function (k) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("data-k", String(k));
          b.setAttribute("aria-label", ITEMS[k].n + " — " + ITEMS[k].t[idioma]);
          b.addEventListener("click", function () { irA(k); });
          dotsNav.appendChild(b);
        })(i);
      }
    }

    cargar(0);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        for (var j = 0; j < es.length; j++) {
          if (es[j].isIntersecting) {
            for (var k = 0; k < ITEMS.length; k++) cargar(k);
            io.disconnect();
          }
        }
      }, { rootMargin: "600px" });
      io.observe(gal);
    } else {
      for (var k2 = 0; k2 < ITEMS.length; k2++) cargar(k2);
    }

    var tEspera = null;
    window.addEventListener("scroll", leerScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (tEspera) clearTimeout(tEspera);
      tEspera = setTimeout(medir, 150);
    });
    medir();
    leerScroll();
    fotoDesdeURL();
  }

  /* ?foto=N salta a esa captura (para revisar y enlazar estados). */
  function fotoDesdeURL() {
    var m = /[?&]foto=(\d+)/.exec(window.location.search || "");
    if (!m || !gal) return;
    var k = parseInt(m[1], 10);
    if (isNaN(k) || k < 0 || k >= ITEMS.length) return;
    setTimeout(function () { irA(k, false); }, 350);
    setTimeout(function () {
      leerScroll();
      pintar();
    }, 900);
  }

  function setLang(l) {
    idioma = l === "en" ? "en" : "es";
    imgs = {};
    muestras = {};
    cargar(indice < 0 ? 0 : indice);
    if ("IntersectionObserver" in window) {
      for (var k = 0; k < ITEMS.length; k++) cargar(k);
    }
    indice = -1;
    sucio = true;
    pedirFotograma();
    if (dotsNav) {
      var bs = dotsNav.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) {
        var kk = parseInt(bs[i].getAttribute("data-k"), 10);
        bs[i].setAttribute("aria-label", ITEMS[kk].n + " — " + ITEMS[kk].t[idioma]);
      }
    }
  }

  window.VDGaleria = { setLang: setLang, irA: irA };
  window.VDGaleria.debug = function () {
    var urls = {};
    for (var k in imgs) {
      if (Object.prototype.hasOwnProperty.call(imgs, k)) urls[k] = imgs[k].src;
    }
    return { pos: pos, indice: indice, scrollY: window.scrollY, imgs: urls };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", armar);
  } else {
    armar();
  }
})();
