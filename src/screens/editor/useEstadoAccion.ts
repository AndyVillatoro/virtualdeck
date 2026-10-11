import { useEffect, useState } from 'react';
import type { accionInicial } from './valoresIniciales';

/** Qué hace el botón: la acción, su secuencia, el interruptor y la carpeta. */
export function useEstadoAccion(ini: ReturnType<typeof accionInicial>) {
  const api = window.electronAPI;

  const [action, setAction] = useState(ini.action);
  const [extraActions, setExtraActions] = useState(ini.extraActions);
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [isToggle, setIsToggle] = useState(ini.isToggle);
  const [actionToggleOff, setActionToggleOff] = useState(ini.actionToggleOff);
  const [longPressAction, setLongPressAction] = useState(ini.longPressAction);
  const [radioGroup, setRadioGroup] = useState(ini.radioGroup);
  const [folderButtons, setFolderButtons] = useState(ini.folderButtons);

  useEffect(() => {
    if (action.type === 'folder') {
      setAction((a) => ({ ...a, folderButtons }));
    }
  }, [folderButtons, action.type]);

  const pickFile = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile'] });
    if (path) setAction((a) => ({ ...a, appPath: path }));
  };

  const pickShortcut = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile', 'openDirectory'] });
    if (path) setAction((a) => ({ ...a, shortcutPath: path }));
  };

  return {
    action,
    setAction,
    extraActions,
    setExtraActions,
    showExtraPicker,
    setShowExtraPicker,
    isToggle,
    setIsToggle,
    actionToggleOff,
    setActionToggleOff,
    longPressAction,
    setLongPressAction,
    radioGroup,
    setRadioGroup,
    folderButtons,
    setFolderButtons,
    pickFile,
    pickShortcut,
  };
}