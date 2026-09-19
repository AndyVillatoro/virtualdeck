# Exportar e importar la configuracion de OpenCode

Generado por `scripts/export-opencode-config.ps1` a partir de la PC origen;
se regenera en cada ejecucion. Describe como llevar la configuracion global de
OpenCode y la plantilla de proyecto a otra PC.

## 1. Que se exporta

| Zip | Contenido | Destino en la PC nueva |
|---|---|---|
| `opencode-global-20260919-0158.zip` | opencode.json, AGENTS.md, agents/, bin/agy-gemini.ps1, plugins/ | %USERPROFILE%\.config\opencode\ |
| `opencode-plantilla-20260919-0158.zip` | opencode.json, .opencode/, AGENTS.md generico | raiz de un proyecto nuevo |

Ambos zips quedan en %TEMP% de la PC origen y se copian a la PC nueva tal cual.
Se excluyen siempre: *.bak*, node_modules/ y .env*.

## 2. Requisitos en la PC nueva

- Node.js y npm instalados.
- OpenCode instalado (misma version o superior a la de origen).
- CLI de Antigravity (agy) instalada para el acceso a Gemini (seccion 6).
- Los zips no incluyen binarios, sesiones ni credenciales.

## 3. Importar la configuracion global

1. Cerrar OpenCode si esta abierto.
2. Si ya existe `%USERPROFILE%\.config\opencode`, renombrarlo como respaldo:
   ```powershell
   Rename-Item "$env:USERPROFILE\.config\opencode" "opencode.bak-<fecha>"
   ```
3. Crear el directorio y descomprimir el zip dentro:
   ```powershell
   New-Item -ItemType Directory "$env:USERPROFILE\.config\opencode" -Force | Out-Null
   Expand-Archive -Path "C:\ruta\al\zip\opencode-global-20260919-0158.zip" -DestinationPath "$env:USERPROFILE\.config\opencode" -Force
   ```
   Los archivos deben quedar en la raiz: opencode.json, AGENTS.md, agents/, bin/ y plugins/.
4. Revisar `opencode.json`: los providers locales (lmstudio, ollama, bonsai)
   apuntan a localhost de la PC de origen; ajustarlos o eliminarlos si no se usan.

## 4. Crear un proyecto nuevo con la plantilla

1. Descomprimir `opencode-plantilla-20260919-0158.zip` en la raiz del proyecto nuevo:
   ```powershell
   Expand-Archive -Path "C:\ruta\al\zip\opencode-plantilla-20260919-0158.zip" -DestinationPath "C:\proyectos\nuevo" -Force
   ```
   Deja `opencode.json`, `.opencode/` y `AGENTS.md` (generico) en la raiz.
2. Completar `AGENTS.md` con las reglas del proyecto.
3. Si el proyecto se clona desde git, copiar los tres elementos del zip a la
   raiz clonada.

## 5. Dependencias y verificacion

1. Instalar dependencias en la raiz del proyecto:
   ```powershell
   npm install
   ```
2. Pasar la suite de calidad (obligatoria antes de cada commit):
   ```powershell
   npm run check
   ```
   Debe terminar con 0 errores.
3. Chequeo de tipos y capas (si aplica al proyecto):
   ```powershell
   npx tsc --noEmit
   npx depcruise src electron
   ```

## 6. Credenciales y tokens (nunca se exportan)

- Auth de providers de OpenCode: `opencode auth login` en la PC nueva.
- Spotify: el token vive en localStorage del cliente (clave `vd-spotify-token`);
  iniciar sesion de nuevo desde el panel de integraciones.
- Discord: reintroducir el Client ID / token de StreamKit en el panel de ajustes.
- Agy (Gemini via Antigravity CLI): instalar la CLI y validar:
  ```powershell
  agy -p="Reply with exactly: OK"
  ```
  Debe responder exactamente `OK`.

## 7. Comprobacion final

- Abrir OpenCode y confirmar que el agente por defecto, los subagentes y el
  plugin cargan sin errores.
- Ejecutar un turno corto en el proyecto nuevo para validar permisos y skills.
- Borrar los respaldos `.bak` una vez confirmada la importacion.