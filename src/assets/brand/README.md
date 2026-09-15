# Brand Assets & Creative Cloud Guidelines

This directory holds the brand identity assets, logotypes, icons, and visual tokens used across the **Invoice Verification & Vendor Payment Platform**.

---

## 1. Built-in Logo Component

The platform ships with a high-fidelity vector component:
- **File**: `Logo.tsx`
- **Format**: Scalable React SVG component
- **Props**:
  - `size?: number` (default: `32`): Sets height and width in pixels.
  - `showText?: boolean` (default: `false`): Displays the platform brand title ("PayVerify") alongside the icon.
  - `className?: string`: Appends custom CSS classes.

---

## 2. Dropping In Custom Adobe Creative Cloud Assets

To replace or enhance the default branding with custom assets exported from **Adobe Illustrator**, **Adobe Express**, or the **Adobe Creative Cloud Libraries**:

### Steps:
1. **Export from Creative Cloud / Illustrator**:
   - Save vector assets as optimized `.svg` files (minify SVGs, remove editor metadata, inline clipPaths if needed).
   - Ensure color fills leverage CSS variables or can inherit currentColor/Spectrum tokens (`var(--spectrum-global-color-blue-600)`, etc.).
2. **Place Assets**:
   - Place raw SVG or raster assets (`.svg`, `.png`, `.webp`) in this directory:
     ```
     src/assets/brand/
       ├── logo-mark.svg
       ├── logo-full.svg
       ├── favicon.svg
       ├── Logo.tsx
       └── README.md
     ```
3. **Update `Logo.tsx`**:
   - Import the SVG directly or replace the SVG paths inside `Logo.tsx`.
   - Maintain the `role="img"` and `aria-label` attributes to adhere to WCAG 2.1 AA accessibility guidelines.
4. **Design Token Alignment**:
   - Align all brand colors with Adobe Spectrum CSS custom properties:
     - Primary Accent: `--spectrum-global-color-blue-600`
     - Success / Verification: `--spectrum-global-color-green-500`
     - Neutral Text: `--spectrum-global-color-gray-900`
