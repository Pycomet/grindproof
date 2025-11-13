import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  className?: string;
}

export function Logo({ size = 'md', href = '/', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl sm:text-7xl',
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon/Symbol */}
      <div className="relative">
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute h-8 w-8 rounded-full border-2 border-zinc-900 dark:border-zinc-50 opacity-20"></div>
          {/* Inner symbol - represents "grinding" gears */}
          <svg
            className="h-6 w-6 text-zinc-900 dark:text-zinc-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Gear/cog shape */}
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M1 12h6m6 0h6" />
            <path d="m4.93 4.93 4.24 4.24m5.66 0 4.24-4.24m0 14.14-4.24-4.24m-5.66 0-4.24 4.24" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span
          className={`${sizeClasses[size]} font-black tracking-tighter leading-none font-[family-name:var(--font-space-grotesk)]`}
          style={{
            background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent dark:from-zinc-50 dark:to-zinc-400">
            Grindproof
          </span>
        </span>
        {size === 'xl' && (
          <span className="mt-1 text-xs font-bold tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            STOP LYING TO YOURSELF
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}

