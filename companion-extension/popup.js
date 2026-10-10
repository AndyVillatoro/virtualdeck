/**
 * VirtualDeck Companion - Popup Controller
 * Interfaz técnica OLED para control de streaming, emparejamiento y diagnóstico local.
 */

(() => {
  const estadoConexion = document.getElementById('estado-conexion');
  const textoConexion = document.getElementById('texto-conexion');
  const btnCaptura = document.getElementById('btn-captura');
  const infoCaptura = document.getElementById('info-captura');
  const inputCodigo = document.getElementById('input-codigo');
  const btnEmparejar = document.getElementById('btn-emparejar');
  const mensajeEmparejar = document.getElementById('mensaje-emparejar');
  const inputPuerto = document.getElementById('input-puerto');
  const inputToken = document.getElementById('input-token');
  const btnGuardar = document.getElementById('btn-guardar');

  let tabActiva = null;
  let estadoActual = null;

  async function inicializar() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tabActiva = tabs[0] || null;

    refrescarEstado();
    // El estado lo cambia el service worker (captura que empieza o termina): sin esto el botón quedaba desfasado.
    setInterval(refrescarEstado, 1000);
  }

  function refrescarEstado() {
    chrome.runtime.sendMessage({ tipo: 'obtener_estado' }, (res) => {
      if (!res) return;
      estadoActual = res;

      // Estado de conexión
      if (res.conectado) {
        estadoConexion.className = 'estado conectado';
        textoConexion.textContent = `CONECTADO (${res.puerto})`;
      } else {
        estadoConexion.className = 'estado desconectado';
        textoConexion.textContent = 'DESCONECTADO';
      }

      // Estado de captura
      if (res.tabCapturada) {
        btnCaptura.textContent = 'DETENER TRANSMISIÓN';
        btnCaptura.className = 'boton boton-peligro';
        infoCaptura.classList.remove('oculta');
      } else {
        btnCaptura.textContent = 'CAPTURAR PESTAÑA ACTUAL';
        btnCaptura.className = 'boton boton-primario';
        infoCaptura.classList.add('oculta');
      }

      // Ajustes
      if (res.puerto && !inputPuerto.matches(':focus')) {
        inputPuerto.value = res.puerto;
      }
      if (res.token && !inputToken.matches(':focus')) {
        inputToken.value = res.token;
      }
    });
  }

  btnCaptura.addEventListener('click', () => {
    if (!estadoActual) return;

    if (estadoActual.tabCapturada) {
      chrome.runtime.sendMessage({ tipo: 'detener_captura' }, () => {
        refrescarEstado();
      });
    } else if (tabActiva && tabActiva.id) {
      btnCaptura.textContent = 'INICIANDO...';
      chrome.runtime.sendMessage({ tipo: 'iniciar_captura', tabId: tabActiva.id }, (res) => {
        if (res && !res.ok) {
          mostrarMensaje(res.error || 'No se pudo iniciar la captura de la pestaña.', true);
        }
        refrescarEstado();
      });
    }
  });

  btnEmparejar.addEventListener('click', () => {
    const codigo = inputCodigo.value.trim();
    if (!codigo || codigo.length < 6) {
      mostrarMensaje('Introduce un código de 6 dígitos.', true);
      return;
    }

    btnEmparejar.disabled = true;
    btnEmparejar.textContent = '...';

    chrome.runtime.sendMessage({ tipo: 'emparejar', code: codigo }, (res) => {
      btnEmparejar.disabled = false;
      btnEmparejar.textContent = 'EMPAREJAR';

      if (res && res.ok) {
        mostrarMensaje('Emparejamiento correcto. Guardando token...');
        inputCodigo.value = '';
        setTimeout(refrescarEstado, 500);
      } else {
        mostrarMensaje(res?.error || 'Código incorrecto o caducado.', true);
      }
    });
  });

  btnGuardar.addEventListener('click', () => {
    const puerto = Number(inputPuerto.value) || 48201;
    const token = inputToken.value.trim();

    btnGuardar.textContent = 'GUARDANDO...';
    chrome.runtime.sendMessage({ tipo: 'guardar_ajustes', puerto, token }, () => {
      btnGuardar.textContent = 'GUARDADO';
      setTimeout(() => {
        btnGuardar.textContent = 'GUARDAR Y RECONECTAR';
        refrescarEstado();
      }, 1000);
    });
  });

  function mostrarMensaje(texto, error = false) {
    mensajeEmparejar.textContent = texto;
    mensajeEmparejar.style.color = error ? '#f87171' : '#4ade80';
    mensajeEmparejar.classList.remove('oculta');
    setTimeout(() => {
      mensajeEmparejar.classList.add('oculta');
    }, 4000);
  }

  inicializar();
  setInterval(refrescarEstado, 1500);
})();
