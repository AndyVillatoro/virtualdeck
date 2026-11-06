import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
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
// distingue por el hash con el que se abre (ver electron/main/ventana/floatingBar.ts).
// Asi no hay que compilar un segundo renderer solo para una columna de tiles.
// La tienda va igual (`electron/main/ventana/tienda.ts`): mismo bundle, otra ventana.
const esBarra = window.location.hash === '#barra';
const esTienda = window.location.hash === '#tienda';

// Estas dos ventanas son hashes sobre el mismo bundle: en la ventana principal
// (#/ o sin hash) no se ven nunca, así que su código no hace falta en el primer
// pintado. Se piden con `React.lazy` y entran por su propio chunk.
const FloatingBarB = React.lazy(() => import('./screens/FloatingBarB').then((m) => ({ default: m.FloatingBarB })));
const TiendaB = React.lazy(() => import('./screens/TiendaB').then((m) => ({ default: m.TiendaB })));

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
    <React.Suspense fallback={null}>
      {esBarra ? <FloatingBarB /> : esTienda ? <TiendaB /> : <App />}
    </React.Suspense>
  </React.StrictMode>,
)
