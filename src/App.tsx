import React, { useEffect, useState } from 'react';
import { MainB } from './screens/MainB';
import { FullscreenB } from './screens/FullscreenB';
import { EditorB } from './screens/EditorB';
import { WallpaperB } from './screens/WallpaperB';
import { MonitorB } from './screens/MonitorB';

type View = 'main' | 'fullscreen' | 'wallpaper';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [editingButton, setEditingButton] = useState<number | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [accent, setAccent] = useState('#a855f7');

  useEffect(() => {
    document.documentElement.style.setProperty('--vd-accent', accent);
  }, [accent]);

  // ESC closes editor or exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingButton !== null) {
          setEditingButton(null);
        } else if (view === 'fullscreen') {
          setView('main');
        } else if (view === 'wallpaper') {
          setView('main');
        } else if (showMonitor) {
          setShowMonitor(false);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingButton, view, showMonitor]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Main view */}
      {view === 'main' && (
        <MainB
          onFullscreen={() => setView('fullscreen')}
          onEditButton={(i) => setEditingButton(i)}
          onWallpaper={() => setView('wallpaper')}
          onToggleMonitor={() => setShowMonitor((m) => !m)}
          accent={accent}
        />
      )}

      {/* Fullscreen / kiosk view */}
      {view === 'fullscreen' && (
        <FullscreenB
          onExit={() => setView('main')}
          accent={accent}
        />
      )}

      {/* Wallpaper settings */}
      {view === 'wallpaper' && (
        <WallpaperB
          onBack={() => setView('main')}
          accent={accent}
        />
      )}

      {/* Button editor — overlay */}
      {editingButton !== null && (
        <EditorB
          buttonIndex={editingButton}
          onClose={() => setEditingButton(null)}
          accent={accent}
        />
      )}

      {/* System monitor — slide-up drawer */}
      {showMonitor && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
          }}
        >
          <MonitorB onClose={() => setShowMonitor(false)} />
        </div>
      )}
    </div>
  );
}
