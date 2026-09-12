import React from 'react';

interface Dot480TileProps {
  index: string;
  title: string;
  statusDot?: boolean;
  statusDotColor?: string;
  sideRailIcons?: string[];
  activeSideIndex?: number;
  onSideRailClick?: (idx: number) => void;
  children: React.ReactNode;
  surface?: string;
  border?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Dot480Tile({
  index,
  title,
  statusDot = false,
  statusDotColor = '#ff3b30',
  sideRailIcons,
  activeSideIndex = 0,
  onSideRailClick,
  children,
  surface = '#111315',
  border = '#1f2229',
  onClick,
  style,
}: Dot480TileProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxSizing: 'border-box',
        minHeight: 140,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          color: '#8e929b',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        <span>
          <strong style={{ color: '#d2d5dc', marginRight: 4 }}>{index}</strong>
          {title}
        </span>
        {statusDot && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: statusDotColor,
              boxShadow: `0 0 6px ${statusDotColor}`,
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {children}
        </div>

        {sideRailIcons && sideRailIcons.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingLeft: 10,
              marginLeft: 8,
              borderLeft: `1px solid ${border}`,
              alignItems: 'center',
            }}
          >
            {sideRailIcons.map((icon, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSideRailClick?.(idx);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSideIndex === idx ? statusDotColor : '#6c7280',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 2,
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
