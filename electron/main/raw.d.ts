// `import x from '...?raw'`: Vite (electron-vite) lo resuelve a una cadena con
// el contenido del archivo. Lo usa el mando móvil para incrustar el motor DOT
// (`src/components/dot480/efectosPuntos.js`) en su página.
declare module '*?raw' {
  const contenido: string;
  export default contenido;
}
