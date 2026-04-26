# Firma y distribución

Notas operativas para empaquetar VirtualDeck. No hay instaladores firmados aún — esta guía documenta los pasos para llegar ahí.

---

## Empaquetado actual

```
npm run build:win
```

Esto invoca `electron-builder --win --dir` y deja el bundle en `out/`. Útil para pruebas locales pero **Windows mostrará SmartScreen** porque el binario no está firmado.

## Firma con un certificado self-signed (mínimo)

Si solo lo distribuyes a amigos/equipo:

1. Genera un certificado de code-signing self-signed en una máquina con OpenSSL o `New-SelfSignedCertificate` (PowerShell):

   ```powershell
   $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=VirtualDeck Dev" -CertStoreLocation Cert:\CurrentUser\My
   $pwd = ConvertTo-SecureString -String "tupasswd" -Force -AsPlainText
   Export-PfxCertificate -Cert $cert -FilePath .\virtualdeck-codesign.pfx -Password $pwd
   ```

2. Configura `electron-builder` en `package.json`:

   ```json
   "build": {
     "win": {
       "target": "nsis",
       "certificateFile": "./virtualdeck-codesign.pfx",
       "certificatePassword": "tupasswd"
     }
   }
   ```

3. Cada usuario que reciba el instalador debe importar el `.cer` en *Trusted Publishers* la primera vez. Para audiencias externas, considera un cert real.

## Firma con un certificado real (producción)

- Compra un certificado EV o estándar (DigiCert, Sectigo, etc.).
- Usa el mismo formato `electron-builder` pero apuntando al `.pfx` real.
- Si el cert es EV, SmartScreen confía inmediatamente. Si es estándar, requiere reputación acumulada.

## Auto-update con `electron-updater`

Está scaffolding listo en `electron/main/index.ts` (función `checkForUpdates`). Para activarlo:

1. Instala la dependencia:

   ```
   npm install electron-updater
   ```

2. Cambia el target de `package.json` a `nsis` (no `dir`) para generar instaladores firmados.
3. Configura `publish` en `electron-builder`:

   ```json
   "build": {
     "publish": [{
       "provider": "github",
       "owner": "TU_USER",
       "repo": "virtualdeck"
     }]
   }
   ```

4. Genera releases en GitHub y `electron-builder` subirá los artefactos. La app verifica updates al arrancar (ver `bootstrap.ts`).

## Checklist de release

- [ ] Bump `version` en `package.json`.
- [ ] `npm run build:win` corre sin errores.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] Iconos del tray se ven correctos en barra y menú.
- [ ] Hotkeys globales funcionan (ej. `Ctrl+Alt+1`).
- [ ] El bundle empaquetado abre y carga el config persistido.
- [ ] Verificar que `.exe` está firmado: `signtool verify /pa /v out\VirtualDeck.exe`.

## Distribución sin firma

Si decides distribuir sin firma:

- Documenta claramente cómo "Más información → Ejecutar de todas formas" en el SmartScreen.
- Considera publicar el `.exe` a través de WinGet o Scoop, que reducen fricción aunque no eliminan el warning.
