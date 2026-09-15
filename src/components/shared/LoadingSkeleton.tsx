import React from 'react';
import './LoadingSkeleton.css';

export interface LoadingSkeletonProps {
  lines?: number;
  height?: string | number;
  width?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  ariaLabel?: string;
  className?: string;
}

/**
 * Accessible progressive loading skeleton placeholder.
 * Styled with --spectrum-alias-background-color-secondary and --spectrum-alias-background-color-tertiary.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  height,
  width,
  variant = 'text',
  ariaLabel = 'Loading content...',
  className,
}) => {
  const lineCount = Math.max(1, lines);

  const getLineWidth = (index: number) => {
    if (width) return typeof width === 'number' ? `${width}px` : width;
    if (variant === 'circle') return height ? (typeof height === 'number' ? `${height}px` : height) : '40px';
    if (lineCount === 1) return '100%';
    // Progressive staggered widths for realistic text placeholder appearance
    const widths = ['100%', '92%', '84%', '68%', '95%'];
    return widths[index % widths.length];
  };

  const getLineHeight = () => {
    if (height) return typeof height === 'number' ? `${height}px` : height;
    if (variant === 'circle') return '40px';
    if (variant === 'rect') return '120px';
    return '16px';
  };

  const getBorderRadius = () => {
    if (variant === 'circle') return '50%';
    return 'var(--spectrum-alias-border-radius-regular, 4px)';
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`spectrum-skeleton-container ${className || ''}`.trim()}
    >
      <span className="visually-hidden">{ariaLabel}</span>
      {Array.from({ length: lineCount }).map((_, index) => (
        <span
          key={index}
          className="skeleton-line"
          style={{
            height: getLineHeight(),
            width: getLineWidth(index),
            borderRadius: getBorderRadius(),
          }}
        />
      ))}
    </div>
  );
};
