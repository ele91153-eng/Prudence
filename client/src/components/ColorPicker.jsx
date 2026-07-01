export const GOAL_COLORS = [
  { hex: '#EC8B43', label: 'Coral' },
  { hex: '#C4614A', label: 'Terracotta' },
  { hex: '#D4748A', label: 'Rose' },
  { hex: '#9B8AC4', label: 'Lavender' },
  { hex: '#7CA98A', label: 'Sage' },
  { hex: '#5A9E9E', label: 'Teal' },
  { hex: '#6B8CAE', label: 'Dusty Blue' },
  { hex: '#E6B23E', label: 'Gold' },
  { hex: '#8B9B4A', label: 'Olive' },
  { hex: '#8B4A7A', label: 'Plum' },
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div>
      <label className="label">Goal color</label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        {GOAL_COLORS.map(c => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            onClick={() => onChange(c.hex)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: c.hex, cursor: 'pointer', border: 'none',
              outline: value === c.hex ? `3px solid ${c.hex}` : '2px solid transparent',
              outlineOffset: 3,
              boxShadow: value === c.hex ? `0 0 0 1px white, 0 4px 10px ${c.hex}80` : '0 2px 6px rgba(0,0,0,.15)',
              transform: value === c.hex ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
