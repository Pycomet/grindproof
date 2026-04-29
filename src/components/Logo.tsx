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
    xl: 'text-4xl sm:text-5xl',
  };

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8 sm:h-9 sm:w-9',
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon/Symbol - Shield with upward arrow representing proof and progress */}
      <div className="relative">
        <svg
          className={`${iconSizeClasses[size]} text-zinc-900 dark:text-zinc-50`}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield outline */}
          <path
            d="M16 3L6 7V14C6 20.5 10 25.5 16 29C22 25.5 26 20.5 26 14V7L16 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Upward arrow/trend inside shield */}
          <path
            d="M11 19L14 16L17 18L21 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow point */}
          <path
            d="M18 13H21V16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text */}
      <span className={`${sizeClasses[size]} font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none`}>
        Grindproof
      </span>
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

