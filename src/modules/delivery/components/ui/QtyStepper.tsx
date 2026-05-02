interface Props {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

export function QtyStepper({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max = 99,
  ariaLabel = '',
}: Props) {
  return (
    <div className="inline-flex items-center gap-1 bg-bg-raised rounded-pill p-1">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= min}
        className="w-8 h-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-border transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Diminuir ${ariaLabel}`.trim()}
      >
        −
      </button>
      <span className="w-8 text-center font-semibold text-text-primary tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={value >= max}
        className="w-8 h-8 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-border transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Aumentar ${ariaLabel}`.trim()}
      >
        +
      </button>
    </div>
  );
}
