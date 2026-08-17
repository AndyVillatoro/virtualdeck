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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
