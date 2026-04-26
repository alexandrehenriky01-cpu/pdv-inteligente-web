export function AuryaBranding({ variant = 'default' }: { variant?: 'default' | 'tv' }) {
  return (
    <div className={`aurya-brand ${variant === 'tv' ? 'aurya-brand-tv' : ''}`}>
      <span className="aurya-text">Aurya</span>
      <span className="aurya-sub"> Soluções</span>
    </div>
  );
}