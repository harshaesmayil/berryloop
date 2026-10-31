// Berryloop logo images live in frontend/public/.
//   "small": mascot only, for the top bar
//   "large": mascot only, for the sign-in and sign-up pages (legacy size)
//   "full":  full logo with "Software Solutions" and the Berryloop wordmark,
//            for the sign-in and sign-up pages
export default function Logo({ size = "small" }) {
  if (size === "full") {
    return (
      <img
        src="/berryloop-full-logo.png"
        alt="Berryloop Software Solutions logo"
        className="brand-logo brand-logo-full"
        width={1362}
        height={1028}
      />
    );
  }

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
