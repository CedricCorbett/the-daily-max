export default function HazardStripe({ gold = false, height = 14, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`${gold ? 'hazard-stripe-gold' : 'hazard-stripe'} w-full ${className}`}
      style={{ height }}
    />
  );
}
