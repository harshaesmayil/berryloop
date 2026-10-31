// Berryloop mascot logo. The image lives in frontend/public/berryloop-mascot.png.
// size: "small" for the top bar, "large" for the login and register pages.
export default function Logo({ size = "small" }) {
  return (
    <img
      src="/berryloop-mascot.png"
      alt="Berryloop logo"
      className={`brand-logo brand-logo-${size}`}
      width={size === "large" ? 120 : 44}
      height={size === "large" ? 120 : 44}
    />
  );
}
