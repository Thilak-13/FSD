import React from 'react';
import { createComponent } from '@lit/react';
import { FieldLabel as SpFieldLabel } from '@spectrum-web-components/field-label';
import '@spectrum-web-components/field-label/sp-field-label.js';

export const SpFieldLabelComponent = createComponent({
  displayName: 'SpFieldLabel',
  elementClass: SpFieldLabel,
  react: React,
  tagName: 'sp-field-label',
});

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible FormField wrapping inputs with <sp-field-label> and validation alerts.
 * Implements WCAG 2.1 AA requirements:
 * - Proper label-to-control binding via htmlFor
 * - role="alert" + aria-live="polite" region for error states
 * - Spectrum Design Tokens for spacing, typography, and colors
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  helperText,
  required = false,
  disabled = false,
  children,
  className,
}) => {
  const displayHint = hint || helperText;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const labelRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (labelRef.current && typeof labelRef.current.setAttribute === 'function') {
      if (required) {
        labelRef.current.setAttribute('required', '');
      } else {
        labelRef.current.removeAttribute('required');
      }
    }
  }, [required]);

  return (
    <div
      className={`spectrum-form-field ${className || ''}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 'var(--spectrum-global-dimension-size-200, 16px)',
        width: '100%',
      }}
    >
      <SpFieldLabelComponent
        ref={labelRef}
        for={htmlFor}
        required={required}
        disabled={disabled}
        style={{
          marginBottom: 'var(--spectrum-global-dimension-size-50, 4px)',
          fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
          fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
          color: disabled
            ? 'var(--spectrum-global-color-gray-500, #b3b3b3)'
            : 'var(--spectrum-global-color-gray-800, #4b4b4b)',
          fontWeight: 500,
        }}
      >
        {label}
      </SpFieldLabelComponent>

      <div style={{ position: 'relative', width: '100%' }}>
        {children}
      </div>

      {error ? (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="spectrum-field-error"
          style={{
            marginTop: 'var(--spectrum-global-dimension-size-50, 4px)',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-global-dimension-size-150, 12px)',
            color: 'var(--spectrum-global-color-red-600, #d7373f)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spectrum-global-dimension-size-50, 4px)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      ) : displayHint ? (
        <div
          id={hintId}
          className="spectrum-field-hint"
          style={{
            marginTop: 'var(--spectrum-global-dimension-size-50, 4px)',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-global-dimension-size-150, 12px)',
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            lineHeight: 1.4,
          }}
        >
          {displayHint}
        </div>
      ) : null}
    </div>
  );
};
