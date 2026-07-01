export default function Prudence({ size = 54, style = {}, animate = true }) {
  return (
    <img
      src="/prudence.svg"
      width={size}
      height={size}
      alt="Prudence"
      draggable={false}
      style={{
        flexShrink: 0,
        display: 'block',
        animation: animate ? 'prudencefloat 4.5s ease-in-out infinite' : 'none',
        filter: 'drop-shadow(0 6px 14px rgba(200,94,26,.28))',
        ...style,
      }}
    />
  );
}
