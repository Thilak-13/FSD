import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from '../src/assets/brand/Logo';

describe('Project Scaffolding', () => {
  it('should have standard environment defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should render brand logo with accessibility attributes and text', () => {
    const { container } = render(React.createElement(Logo, { size: 32, showText: true }));
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('PayVerify Platform Logo');
    expect(screen.getByText('PayVerify')).toBeDefined();
  });
});
