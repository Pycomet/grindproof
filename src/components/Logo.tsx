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
      {/* Icon/Symbol - Shield with upward arrow representing proof and progress */}
      <div className="relative">
        <svg
          className="h-8 w-8 text-zinc-900 dark:text-zinc-50"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield outline */}
          <path
            d="M16 3L6 7V14C6 20.5 10 25.5 16 29C22 25.5 26 20.5 26 14V7L16 3Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Upward arrow/trend inside shield */}
          <path
            d="M11 19L14 16L17 18L21 13"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow point */}
          <path
            d="M18 13H21V16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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

