/** Helper para renderizar un glifo 5×7 inline (usado por ButtonCell y preview). */
export function Glyph57View({
  rows,
  dotSize = 4,
  gap = 1,
  color,
}: {
  rows: number[];
  dotSize?: number;
  gap?: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(5, ${dotSize}px)`,
        gridTemplateRows: `repeat(7, ${dotSize}px)`,
        gap,
      }}
    >
      {rows.flatMap((row, r) =>
        [4, 3, 2, 1, 0].map((col) => {
          const on = ((row >> col) & 1) === 1;
          return (
            <div
              key={`${r}-${col}`}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: on ? color : 'rgba(255, 255, 255, 0.06)',
              }}
            />
          );
        })
      )}
    </div>
  );
}
