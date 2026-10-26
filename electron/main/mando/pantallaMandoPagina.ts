/**
 * Las pantallas del mando móvil, como texto para incrustar: emparejar con el
 * código de seis cifras, la rejilla del deck (páginas, 2×2, sliders, iconos,
 * rótulos y toque) y el olvido del token.
 *
 * Vive aquí y no en `paginaMando.ts` por lo mismo que `guionMandoPagina.ts`:
 * es código de la página (sin tipos, con `var`), no del servidor, y
 * `plantillaMandoPagina` lo interpola dentro del script que lleva el nonce.
 * Por eso no lleva ni comillas invertidas ni interpolaciones.
 */
export const PANTALLA_MANDO_PAGINA = `
function pantallaEmparejar(error) {
  btnOlvidar.style.display = 'none';
  vaciar();
  app.append(nodo('p', { textContent: t.pedirCodigo }));
  if (error) app.append(nodo('p', { className: 'mal', textContent: error }));
  const campo = nodo('input', { inputMode: 'numeric', maxLength: 6, autocomplete: 'off', placeholder: '······' });
  const boton = nodo('button', { className: 'principal', textContent: t.emparejar });
  const enviar = async () => {
    boton.disabled = true;
    try {
      const r = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: campo.value.trim() }),
      });
      const d = await r.json();
      if (!d.ok) return pantallaEmparejar(t.codigoMal);
      token = d.token;
      try { localStorage.setItem('vd-token', token); } catch (e) { /* modo privado */ }
      pantallaDeck();
    } catch (e) {
      pantallaEmparejar(t.sinConexion);
    } finally { boton.disabled = false; }
  };
  boton.onclick = enviar;
  campo.onkeydown = (e) => { if (e.key === 'Enter') enviar(); };
  app.append(campo, boton);
  campo.focus();
}

async function pantallaDeck() {
  btnOlvidar.style.display = 'inline-flex';
  let datos;
  try {
    const [rBtn, rTema] = await Promise.all([
      pedir('/api/buttons'),
      pedir('/api/tema').catch(() => null),
    ]);
    if (rBtn.status === 401) { olvidar(); return; }
    datos = await rBtn.json();
    if (rTema && rTema.ok) {
      const dt = await rTema.json();
      if (dt.ok && dt.theme) aplicarTema(dt.theme, dt.accent);
    }
  } catch (e) {
    vaciar();
    app.append(nodo('p', { className: 'mal', textContent: t.sinConexion }),
               nodo('button', { className: 'principal', textContent: t.reintentar, onclick: pantallaDeck }));
    return;
  }
  const botones = datos.buttons || [];
  vaciar();
  animadosMovil = [];
  // Lo que hay ahora: el tic vivo redibuja solo si esto cambia.
  ultimoBotonesVivo = JSON.stringify(botones);
  if (rafMovil) { cancelAnimationFrame(rafMovil); rafMovil = 0; }
  const paginas = [...new Set(botones.map((b) => b.page))].sort((a, b) => a - b);
  if (paginas.length > 0 && !paginas.includes(paginaViva)) {
    paginaViva = paginas[0];
  }
  if (paginas.length > 1) {
    const barra = nodo('div', { className: 'pestanas' });
    paginas.forEach((p, idx) => {
      barra.append(nodo('div', {
        className: 'pest' + (p === paginaViva ? ' viva' : ''),
        textContent: t.pagina + ' ' + (idx + 1),
        onclick: () => { paginaViva = p; pantallaDeck(); },
      }));
    });
    app.append(barra);
  }
  const rejilla = nodo('div', { className: 'rejilla' });
  const visibles = botones.filter((b) => paginas.length <= 1 || b.page === paginaViva || b.fijo);
  if (visibles.length === 0) app.append(nodo('p', { textContent: t.sinBotones }));
  const esClaro = document.documentElement.getAttribute('data-theme') === 'light';

  for (const b of visibles) {
    const celda = nodo('div', { className: 'celda' });
    // Para pintar los widgets en su sitio sin redibujar la rejilla.
    celda.setAttribute('data-boton', b.id);
    let colorFrente = b.fgColor || (b.bgColor ? textoSobreMovil(b.bgColor) : null);
    if (esClaro && colorFrente && colorFrente.toLowerCase() === '#ffffff') colorFrente = '#111418';
    if (b.bgColor) celda.style.backgroundColor = b.bgColor;
    if (colorFrente) celda.style.color = colorFrente;

    if (b.fijo) {
      celda.append(nodo('span', { className: 'pin-insignia', textContent: '•PIN•' }));
    }

    if (b.subButtons && b.subButtons.length === 4) {
      celda.style.cursor = 'default';
      const m2x2 = nodo('div', { className: 'mosaico-2x2' });
      for (const sub of b.subButtons) {
        const sc = nodo('div', { className: 'sub-celda' });
        let subFrente = sub.fgColor || (sub.bgColor ? textoSobreMovil(sub.bgColor) : null);
        if (esClaro && subFrente && subFrente.toLowerCase() === '#ffffff') subFrente = '#111418';
        if (sub.bgColor) sc.style.backgroundColor = sub.bgColor;
        if (subFrente) sc.style.color = subFrente;
        const subCeldas = [];
        const icoEl = dibujarIconoBoton(sub, subFrente, 12, subCeldas);
        if (icoEl && (sub.icon || sub.dotGlyph) !== sub.label) sc.append(icoEl);
        if (sub.label) sc.append(nodo('span', { className: 'sub-txt', textContent: sub.label }));
        sc.onclick = async (e) => {
          e.stopPropagation();
          if ('vibrate' in navigator) { try { navigator.vibrate(25); } catch (err) {} }
          animarPulsoMovil(sub, sc, subCeldas);
          let ok = false;
          try { ok = (await pedir('/api/press/' + encodeURIComponent(sub.id))).ok; } catch (err) { ok = false; }
          sc.classList.add(ok ? 'ok' : 'mal');
          setTimeout(() => sc.classList.remove('ok', 'mal'), 300);
        };
        m2x2.append(sc);
      }
      celda.append(m2x2);
      rejilla.append(celda);
      continue;
    }

    if (b.widget === 'slider' || b.sliderWidget) {
      celda.style.cursor = 'default';
      const sw = b.sliderWidget || { target: 'volume', min: 0, max: 100, step: 2 };
      const target = sw.target || 'volume';
      const min = sw.min ?? 0;
      const max = sw.max ?? 100;
      const step = sw.step ?? (target === 'variable' ? 1 : 5);
      const sc = nodo('div', { className: 'slider-celda' });
      const cab = nodo('div', { className: 'slider-cab' });
      const gly = target === 'volume' ? CROMO.SPEAKER : target === 'brightness' ? CROMO.WEATHER_SUN : CROMO.CPU;
      const eti = sw.label || (target === 'volume' ? t.volumen : target === 'brightness' ? t.brillo : (sw.varName || 'VAR'));
      const cabEti = nodo('span', { className: 'slider-eti' });
      const glyEl = svgPuntos({ lado: 8, filas: gly }, 'currentColor', 10);
      if (glyEl) cabEti.append(glyEl);
      cabEti.append(document.createTextNode(' ' + eti));
      cab.append(cabEti);
      const valSpan = nodo('span', { className: 'slider-val', textContent: '50%' });
      cab.append(valSpan);
      sc.append(cab);

      // Pista de puntos DOT que respeta la orientación del widget (roadmap
      // 101); el constructor vive en vivoMandoPagina (este archivo va cargado).
      sc.append(sliderPuntosMovil({
        target, min, max, step, valSpan,
        orientation: sw.orientation === 'vertical' ? 'vertical' : 'horizontal',
      }));
      celda.append(sc);
      rejilla.append(celda);
      continue;
    }

    // Las capas de fondo, en la misma precedencia que la celda
    // (CapasDeFondo): la imagen del plugin (83 c) gana a la propia, y la
    // propia a la marca. Ambas son data URI (o ruta sirve en /media/): aquí
    // solo se meten en un img, que la CSP admite.
    const conPlugin = !!b.pluginImagen;
    if (conPlugin) {
      const img = nodo('img', { className: 'fondo-img', alt: '' });
      ponerImagen(img, b.pluginImagen);
      celda.append(img);
    } else if (b.imageData) {
      const img = nodo('img', { className: 'fondo-img', alt: '' });
      ponerImagen(img, b.imageData);
      celda.append(img);
    } else if (b.marca) {
      celda.append(nodo('img', { className: 'marca-img', alt: '', src: b.marca }));
    }
    // Con marca de fondo el centro solo se pinta si hay icono explícito
    // (iconoSobreMarca), como CentroSobreFondo en la celda: si no, la marca
    // tapa el icono de puntos. Con imagen (propia o de plugin) se queda como
    // estaba.
    const marcaFondo = !conPlugin && !b.imageData && !!b.marca;

    // Con imagen del plugin el centro va vacío, igual que la celda con
    // imagenAjena: la imagen ya lo llena todo (el widget en vivo lo recupera).
    if (conPlugin) {
      celda._nodoIcono = null;
    } else if (b.customGlyph57 && b.customGlyph57.length === 7 && !marcaFondo) {
      const wrap = nodo('div', { className: 'glifo57' });
      wrap.append(svgGlifo57(b.customGlyph57, colorFrente));
      celda.append(wrap);
      celda._nodoIcono = wrap;
    } else if ((b.iconTexto || b.puntos) && (!marcaFondo || b.iconoSobreMarca)) {
      const rejillaCeldas = [];
      const icoEl = dibujarIconoBoton(b, colorFrente, 22, rejillaCeldas);
      if (icoEl) celda.append(icoEl);
      celda._nodoIcono = icoEl || null;
      registrarAnimado(b, celda, rejillaCeldas);
      celda._rejillaCeldas = rejillaCeldas;
    } else {
      celda._nodoIcono = null;
    }
    // Hueco del widget en vivo: se rellena al llegar /api/widgets (y cada
    // 3 s), escondiendo el icono como hace la celda del deck.
    const slotW = nodo('div', { className: 'widget-vivo' });
    slotW.style.display = 'none';
    celda.append(slotW);
    celda._slotWidget = slotW;

    // El título del plugin sustituye al rótulo (CuerpoCelda dibuja la franja
    // con el plugin.titulo por encima del nombre); sin él, el propio.
    const textoRotulo = b.pluginTitulo || b.label;
    if (textoRotulo || b.sublabel) {
      const rotulo = nodo('div', { className: 'rotulo' });
      // Sobre la imagen de un plugin, franja oscura y texto claro, igual que
      // la franja sobreImagenPropia de la celda (RotuloCelda). Con fondo
      // propio la franja va clara u oscura según el fondo, como en la celda:
      // el velo del tema no sirve sobre un fondo del otro tono.
      if (conPlugin) {
        rotulo.style.background = 'linear-gradient(180deg, rgba(7,8,9,0) 0%, rgba(7,8,9,0.88) 45%)';
      } else if (b.bgColor) {
        const fondoClaro = textoSobreMovil(b.bgColor) === '#070809';
        rotulo.style.background = fondoClaro ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
        rotulo.style.borderTop = fondoClaro ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.08)';
      }
      if (textoRotulo) {
        const el = nodo('span', { className: 'label-txt', textContent: textoRotulo });
        if (conPlugin) {
          // El mismo gris claro con sombra que el rótulo del deck sobre imagen
          // (TEXTO_SOBRE_IMAGEN): nada de blanco puro (regla del proyecto).
          el.style.color = '#e6e8eb';
          el.style.textShadow = '0 1px 2px rgba(0,0,0,0.9)';
        }
        rotulo.append(el);
      }
      if (b.sublabel) {
        const subEl = nodo('span', { className: 'sublabel-txt', textContent: b.sublabel });
        // La subetiqueta lleva el mismo color con transparencia, como en la celda.
        if (conPlugin) {
          subEl.style.color = '#9da2a8';
        } else if (b.fgColor || b.bgColor) {
          if (colorFrente) subEl.style.color = colorFrente;
          subEl.style.opacity = '0.65';
        }
        rotulo.append(subEl);
      }
      celda.append(rotulo);
    }

    // El toque normal y el largo comparten dispararPulsacionMando
    // (tactilMandoPagina.ts); solo las celdas con largo miden el tiempo.
    if (b.largo) engancharTactilLargo(celda, b);
    else celda.onclick = () => dispararPulsacionMando(b, celda, false);
    rejilla.append(celda);
  }
  app.append(rejilla);
  refrescarWidgetsVivos();
  arrancarVivo();
}

function olvidar() {
  token = null;
  try { localStorage.removeItem('vd-token'); } catch (e) { /* modo privado */ }
  pantallaEmparejar();
}

if (token) pantallaDeck(); else pantallaEmparejar();
`;
