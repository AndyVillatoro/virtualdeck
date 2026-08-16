; Instalador de VirtualDeck.
;
; Se compila con `scripts/build-installer.ps1`, que pasa /DVERSION y /DEXE.
;
; DECISIONES
;
; - **Por usuario, no para toda la máquina.** Instala en LOCALAPPDATA, así que no
;   pide permisos de administrador. VirtualDeck es una herramienta personal: sus
;   perfiles, atajos y RGB son de quien la usa, no del equipo. Además evita el
;   aviso de UAC, que es la primera pantalla donde la gente abandona.
;
; - **Un solo archivo.** El binario no tiene dependencias externas: ni runtime,
;   ni DLLs, ni Visual C++ Redistributable. Esa es la razón de que esto quepa en
;   pocos megas frente a los ~90 MB de la versión Electron.
;
; - **La configuración no se borra al desinstalar.** Vive en APPDATA y puede ser
;   el trabajo de meses de alguien. El desinstalador ofrece borrarla, pero por
;   defecto la deja.

Unicode true

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef EXE
  !define EXE "..\target\release\vd-app.exe"
!endif
; Windows exige cuatro números en los datos de versión del recurso, así que
; `1.0.0-alpha.1` no vale tal cual. El script de compilación pasa la parte
; numérica aquí, y VERSION —la legible— se sigue usando en todo lo demás.
!ifndef VERSION_NUM
  !define VERSION_NUM "0.0.0.0"
!endif

!define NOMBRE      "VirtualDeck"
!define EMPRESA     "Andy Villatoro"
!define CLAVE_DESINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NOMBRE}"

Name "${NOMBRE} ${VERSION}"
OutFile "..\dist\VirtualDeck-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\${NOMBRE}"
InstallDirRegKey HKCU "Software\${NOMBRE}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

VIProductVersion "${VERSION_NUM}"
VIAddVersionKey "ProductName"     "${NOMBRE}"
VIAddVersionKey "FileDescription" "Instalador de ${NOMBRE}"
VIAddVersionKey "FileVersion"     "${VERSION}"
VIAddVersionKey "ProductVersion"  "${VERSION}"
VIAddVersionKey "CompanyName"     "${EMPRESA}"
VIAddVersionKey "LegalCopyright"  "© ${EMPRESA}"

!include "MUI2.nsh"
!include "FileFunc.nsh"   ; GetSize, para el tamaño que muestra Windows

!define MUI_ICON   "..\crates\vd-app\assets\icon.ico"
!define MUI_UNICON "..\crates\vd-app\assets\icon.ico"
!define MUI_ABORTWARNING

!define MUI_FINISHPAGE_RUN "$INSTDIR\${NOMBRE}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir ${NOMBRE}"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_LANGUAGE "English"

; ---------------------------------------------------------------------------

Function .onInit
  ; Si ya está instalado y corriendo, el archivo estaría bloqueado y la copia
  ; fallaría a medias. Mejor decirlo antes que dejar una instalación rota.
  FindWindow $0 "" "${NOMBRE}"
  StrCmp $0 0 seguir
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "${NOMBRE} está abierto. Ciérralo (también desde la bandeja del sistema) y vuelve a intentarlo." \
      IDOK seguir
    Abort
  seguir:
FunctionEnd

Section "Instalar"
  SetOutPath "$INSTDIR"
  File /oname=${NOMBRE}.exe "${EXE}"
  File "..\crates\vd-app\assets\icon.ico"

  WriteRegStr HKCU "Software\${NOMBRE}" "InstallDir" "$INSTDIR"

  ; Acceso directo del menú Inicio. El nombre y la ruta tienen que ser los que
  ; busca `notify.rs`: NSIS no sabe escribir el identificador de aplicación que
  ; Windows exige para notificar, así que lo añade la propia aplicación la
  ; primera vez que lo necesita — sobre *este* acceso directo, sin tocarle el
  ; icono ni la carpeta de trabajo. Si no lo encontrara, crearía otro y en el
  ; menú Inicio aparecerían dos.
  CreateShortcut "$SMPROGRAMS\${NOMBRE}.lnk" "$INSTDIR\${NOMBRE}.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$DESKTOP\${NOMBRE}.lnk"    "$INSTDIR\${NOMBRE}.exe" "" "$INSTDIR\icon.ico" 0

  ; Entrada en «Aplicaciones instaladas».
  WriteRegStr   HKCU "${CLAVE_DESINST}" "DisplayName"     "${NOMBRE}"
  WriteRegStr   HKCU "${CLAVE_DESINST}" "DisplayVersion"  "${VERSION}"
  WriteRegStr   HKCU "${CLAVE_DESINST}" "Publisher"       "${EMPRESA}"
  WriteRegStr   HKCU "${CLAVE_DESINST}" "DisplayIcon"     "$INSTDIR\icon.ico"
  WriteRegStr   HKCU "${CLAVE_DESINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${CLAVE_DESINST}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegDWORD HKCU "${CLAVE_DESINST}" "NoModify" 1
  WriteRegDWORD HKCU "${CLAVE_DESINST}" "NoRepair" 1

  ; El tamaño que muestra Windows, en KB.
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${CLAVE_DESINST}" "EstimatedSize" "$0"

  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ---------------------------------------------------------------------------

Section "Uninstall"
  Delete "$INSTDIR\${NOMBRE}.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\uninstall.exe"
  RMDir  "$INSTDIR"

  Delete "$SMPROGRAMS\${NOMBRE}.lnk"
  Delete "$DESKTOP\${NOMBRE}.lnk"

  DeleteRegKey HKCU "${CLAVE_DESINST}"
  DeleteRegKey HKCU "Software\${NOMBRE}"
  ; El arranque con Windows lo pone la propia aplicación; si queda, arrancaría un
  ; ejecutable que ya no está.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${NOMBRE}"

  ; La configuración es del usuario y puede ser el trabajo de meses. Se pregunta,
  ; y el «no» es la respuesta segura por defecto.
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "¿Borrar también los perfiles, botones y ajustes?$\n$\nSi piensas reinstalar, elige No." \
    IDNO conservar
    RMDir /r "$APPDATA\${NOMBRE}"
  conservar:
SectionEnd
