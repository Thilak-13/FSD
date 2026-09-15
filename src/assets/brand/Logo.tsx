import React from 'react';

export interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 32,
  className = '',
  showText = false,
}) => {
  return (
    <div
      className={`brand-logo ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spectrum-global-dimension-size-100, 8px)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="PayVerify Platform Logo"
        role="img"
      >
        {/* Background rounded badge */}
        <rect
          width="32"
          height="32"
          rx="6"
          fill="var(--spectrum-global-color-blue-600, #0d66d0)"
        />
        {/* Invoice document outline */}
        <path
          d="M8.5 7.5C8.5 6.94772 8.94772 6.5 9.5 6.5H19L23.5 11V24.5C23.5 25.0523 23.0523 25.5 22.5 25.5H9.5C8.94772 25.5 8.5 25.0523 8.5 24.5V7.5Z"
          fill="white"
          fillOpacity="0.15"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Document fold corner */}
        <path
          d="M18.5 6.5V11.5H23.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Invoice text lines */}
        <line
          x1="11.5"
          y1="14"
          x2="17.5"
          y2="14"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="11.5"
          y1="17.5"
          x2="15.5"
          y2="17.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Verification checkmark badge */}
        <circle
          cx="20.5"
          cy="20.5"
          r="4.5"
          fill="var(--spectrum-global-color-green-500, #268e6c)"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M18.5 20.5L20 22L22.5 19.5"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontWeight: 700,
            fontSize: `${Math.max(14, size * 0.5)}px`,
            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
            letterSpacing: '-0.01em',
          }}
        >
          PayVerify
        </span>
      )}
    </div>
  );
};

export default Logo;
