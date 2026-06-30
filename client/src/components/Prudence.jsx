export default function Prudence({ size = 54, style = {} }) {
  return (
    <div
      className="prudence"
      style={{ width: size, height: size, ...style }}
    >
      <div className="prudence-face" />
      <div className="prudence-eye-l" />
      <div className="prudence-eye-r" />
      <div className="prudence-cheek-l" />
      <div className="prudence-cheek-r" />
      <div className="prudence-smile" />
    </div>
  );
}
