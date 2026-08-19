import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { FloatingBarB } from './screens/FloatingBarB'
import './index.css'
import './vd-icons.css'
import './brand-icons.css'

// Activa las fuentes web una vez que la interfaz ya está en pantalla.
//
// En `index.html` se piden con `media="print"` para que no bloqueen el primer
// pintado: si la red no llega a Google Fonts, la ventana se quedaría en negro
// para siempre. Aquí se pasan a `all`, y si nunca llegan, la aplicación se ve
// con las fuentes del sistema en vez de no verse.
const fuentes = document.getElementById('vd-fuentes') as HTMLLinkElement | null;
if (fuentes) {
  const activar = () => { fuentes.media = 'all'; };
  // Si ya cargó (viene de la caché), se activa al momento.
  if (fuentes.sheet) activar();
  else fuentes.addEventListener('load', activar, { once: true });
}

// La barra flotante es otra ventana de Electron, pero el mismo bundle: se
// distingue por el hash con el que se abre (ver electron/main/floatingBar.ts).
// Asi no hay que compilar un segundo renderer solo para una columna de tiles.
const esBarra = window.location.hash === '#barra';

if (esBarra) {
  // Sin fondo: la ventana es transparente y lo unico que debe verse son los
  // tiles. El CSS global le pone color al body, asi que hay que quitarselo.
  // Los tres: `index.css` le pone el mismo fondo opaco a `html`, `body` y
  // `#root`. Con dejarse uno, se ve un recuadro solido detras de los tiles y la
  // barra deja de parecer que flota.
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  const raiz = document.getElementById('root');
  if (raiz) raiz.style.background = 'transparent';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esBarra ? <FloatingBarB /> : <App />}
  </React.StrictMode>,
)
