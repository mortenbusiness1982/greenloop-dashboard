interface LogoProps {
  text: string;
  initials: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ text, initials, color = '#2d6a4f', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-base', title: 'text-lg' },
    md: { container: 'w-10 h-10', text: 'text-lg', title: 'text-2xl' },
    lg: { container: 'w-12 h-12', text: 'text-xl', title: 'text-3xl' },
  };
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${sizes[size].container} rounded-xl flex items-center justify-center`}
        style={{ backgroundColor: color }}
      >
        <span className={`text-white font-semibold ${sizes[size].text}`}>{initials}</span>
      </div>
      <h1 className={`${sizes[size].title} font-semibold text-gray-900`}>{text}</h1>
    </div>
  );
}
