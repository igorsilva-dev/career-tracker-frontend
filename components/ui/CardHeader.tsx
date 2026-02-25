interface CardHeaderProps {
  title: string;
  subtitle?: string;
}

export function CardHeader({ title, subtitle }: CardHeaderProps) {
  return (
    <header className="card-header">
      <h3 className="card-title">{title}</h3>
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
    </header>
  );
}
