import { ReactNode } from 'react';

interface GridProps {
  children: ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function Grid({ children, cols = { default: 1 }, gap = 6, className = '' }: GridProps) {
  const colClasses = [];
  
  if (cols.default) colClasses.push(`grid-cols-${cols.default}`);
  if (cols.sm) colClasses.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`);
  
  return (
    <div className={`grid ${colClasses.join(' ')} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}
