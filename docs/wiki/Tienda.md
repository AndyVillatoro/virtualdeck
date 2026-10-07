# Tienda y galería

> [English version](Store)

VirtualDeck puede traer decks, páginas y perfiles hechos por otros desde un
catálogo estático en GitHub.

## Abrir la tienda

Ajustes (rueda) → **GALERÍA DE PERFILES** → **ABRIR TIENDA**. Se abre en una ventana propia
(`#tienda`) con buscador por nombre/autor/texto, filtros por tipo
(perfil/página), app destino y etiquetas, y fichas con nota del autor.

## Antes de instalar: el aviso de riesgo

Un perfil no son datos: es código que se ejecutará cuando pulses un botón.
Antes de instalar se muestra, sin recortar: cuántos botones trae, cada
programa que abre, cada script que ejecuta (con su texto), los atajos
globales que registrará y lo que se ejecuta solo (temporizadores, sensores).
Instala con criterio: es como bajar un programa.

## Cómo instalar

- En la tienda, elige el perfil o la página y pulsa instalar. Los atajos
  globales que choquen con los tuyos se quitan y se avisa cuántos. La página
  instalada puede heredar el auto-perfil de su app destino.
- Fuera de la tienda, en **GALERÍA DE PERFILES** pegas la dirección de un
  `manifest.json` y lo mismo: lista, ficha de riesgo e importación.
- Todo importado entra **como perfil o página suelta**, nunca como
  configuración: tu deck montado no se toca, y para probarlo hay que cargarlo
  a mano. El backup anterior lo cubre el sistema de backups.

## Insignias

Cada entrada trae su versión y desde dónde vino (`origen`). La tienda enseña
**INSTALADO** y **UPDATE → vX** cuando el publicado es más nuevo que el tuyo.

## Repo público

El catálogo del proyecto (`virtualdeck-gallery`) tiene 4 perfiles en formato
v1 (esencial, streaming, trabajo, rgb). Para publicar los tuyos, sigue
[`docs/galeria.md`](https://github.com/AndyVillatoro/virtualdeck/blob/main/docs/galeria.md).
