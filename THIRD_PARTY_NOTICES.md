# Third-party notices

VirtualDeck incluye o adapta obras de terceros. Este archivo reúne los avisos y
licencias que corresponden.

---

## 1. Bitfocus — `companion-surface-mirabox-stream-dock`

El protocolo HID de los Stream Dock / Mirabox / Ajazz y la tabla de modelos
que implementa el driver de superficies (`electron/main/superficies/modelos/`,
`protocoloMirabox.ts` y `dispositivoMirabox.ts`) están adaptados del módulo
[`bitfocus/companion-surface-mirabox-stream-dock`](https://github.com/bitfocus/companion-surface-mirabox-stream-dock),
en particular de `src/streamdock.ts`, `src/main.ts` y las doce definiciones de
`src/models/*.ts` (N3-293N3, 293V3, Mirabox-XL, N4-1234, N4-1245, HSV-293S,
HSV-293S-2, HSV-293S-3, M18V3, Ajazz-AKP03E, Ajazz-AKP153 y Ajazz-AKP153E).
No se usa código de OpenDeck ni de `opendeck-akp03` (GPL).

Licencia MIT completa:

```
MIT License

Copyright (c) 2022 Bitfocus AS - Open Source

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
```

---

## 2. `simple-icons` — catálogo de marcas en puntos

El catálogo `src/data/iconosDot/marcas.json` se genera con
`scripts/generar-iconos-dot.mjs` a partir de los SVG de
[`simple-icons`](https://github.com/simple-icons/simple-icons) (v16.34.0,
`node_modules/simple-icons/icons`), rasterizados a 16×16. No se redistribuye el
paquete, solo el mapa de puntos derivado.

- El proyecto `simple-icons` se publica bajo **CC0 1.0 Universal**:
  https://creativecommons.org/publicdomain/zero/1.0/
- El propio proyecto avisa de que algunos iconos tienen licencia propia; el
  generador **excluye** los que declaran una licencia distinta de CC0/Unlicense
  (GPL, AGPL, CC-BY-NC, CC-BY-ND, etc.), 211 en la versión usada.

Aviso de marcas registradas, tal como lo trae el paquete (`DISCLAIMER.md`):

> **Note**
> Simple Icons is released under CC0 - though that doesn't mean to imply that all icons within the project are also CC0. Please see individual licenses where available.
>
> If an icon includes a registered trademark (®) or trademark symbol (™) the recommendations outlined in the Simple Icons Contributing Guidelines are followed to decide whether to include the symbol or not.
>
> Simple Icons cannot be held responsible for any legal activity raised by a brand, or users of the package. We ask that our users seek the correct permissions to use the icons relevant to their project.

Las marcas y los logotipos son propiedad de sus titulares; el uso de un icono
en la aplicación **no** concede ningún derecho sobre la marca.

---

## 3. `@tabler/icons` — catálogo de acciones en puntos

El catálogo `src/data/iconosDot/acciones.json` se genera con el mismo script a
partir de los SVG de
[`@tabler/icons`](https://github.com/tabler/tabler-icons) (v3.48.0,
`node_modules/@tabler/icons/icons/outline`). Licencia **MIT**:

```
MIT License

Copyright (c) 2020-2026 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 4. `node-hid`

Dependencia de ejecución del driver de superficies (acceso HID multiplataforma).

- Licencia declarada por el paquete: `(MIT OR X11)`.
- Copyright Hans Huebner and contributors.
- El paquete distribuye el texto X11/BSD en `node_modules/node-hid/LICENSE-bsd.txt`:

```
Copyright Hans Huebner and contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Signal 11 Software nor the names of its
      contributors may be used to endorse or promote products derived from
      this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```
