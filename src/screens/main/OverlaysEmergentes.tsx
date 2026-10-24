import type React from 'react';
import type { ButtonConfig, DeckConfig, SoundProfileId } from '../../types';
import type { EntornoPulsacion } from '../../utils/pulsarBoton';
import type { useEstadoSistema } from '../../utils/estadoSistema';
import { FolderOverlay } from './OverlayCarpeta';
import { ModalVincularApp } from './ModalVincularApp';

/**
 * Las dos capas que salen por encima de todo en `MainB`: el overlay de la
 * carpeta y el modal de vincular una app a una página. Movido tal cual desde
 * `MainB.tsx` para que la pantalla quede por debajo del límite de líneas.
 */
export function OverlaysEmergentes({
  openFolderBtn, setOpenFolderBtn, bindingAppPageId, setBindingAppPageId,
  config, soundOnPress, soundProfile, entorno, estadoSistema,
  onFijarTargetApp, onConfigChange, onCrearDesdePlantilla,
}: {
  openFolderBtn: ButtonConfig | null;
  setOpenFolderBtn: React.Dispatch<React.SetStateAction<ButtonConfig | null>>;
  bindingAppPageId: string | null;
  setBindingAppPageId: React.Dispatch<React.SetStateAction<string | null>>;
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  entorno: () => EntornoPulsacion;
  estadoSistema: ReturnType<typeof useEstadoSistema>;
  onFijarTargetApp?: (pageId: string, app: string, iconoApp?: string) => void;
  onConfigChange: (c: DeckConfig) => void;
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
}) {
  return (
    <>
      {/* Folder overlay */}
      {openFolderBtn && (
        <FolderOverlay
          btn={openFolderBtn}
          accent={config.accent}
          soundEnabled={soundOnPress}
          soundProfile={soundProfile}
          entorno={entorno}
          onClose={() => setOpenFolderBtn(null)}
        />
      )}

      {/* App binding modal */}
      {bindingAppPageId && (() => {
        const targetPage = config.pages.find((p) => p.id === bindingAppPageId);
        if (!targetPage) return null;
        return (
          <ModalVincularApp
            page={targetPage}
            accent={config.accent}
            runningProcesses={estadoSistema.runningProcesses}
            onSave={(cleaned, iconoApp) => {
              // Con deshacer, como en Dispositivos: antes era un
              // `onConfigChange` directo sin historial.
              if (onFijarTargetApp) onFijarTargetApp(bindingAppPageId, cleaned, iconoApp);
              else {
                const updatedPages = config.pages.map((p) =>
                  p.id === bindingAppPageId
                    ? { ...p, targetApp: cleaned || undefined, iconoApp: cleaned ? iconoApp : undefined }
                    : p,
                );
                onConfigChange({ ...config, pages: updatedPages });
              }
              setBindingAppPageId(null);
            }}
            onClose={() => setBindingAppPageId(null)}
            onCrearDesdePlantilla={onCrearDesdePlantilla}
          />
        );
      })()}
    </>
  );
}
