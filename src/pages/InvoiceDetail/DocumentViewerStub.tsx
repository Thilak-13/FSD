// src/pages/InvoiceDetail/DocumentViewerStub.tsx
import React, { useState } from 'react';
import { Invoice } from '../../types';

export interface DocumentViewerStubProps {
  invoice: Invoice;
  onNotice?: (message: string) => void;
  className?: string;
}

export const DocumentViewerStub: React.FC<DocumentViewerStubProps> = ({
  invoice,
  onNotice,
  className,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const documentName = invoice.attachedDocumentName || `${invoice.invoiceNumber || 'INV'}_Document.pdf`;
  const simulatedSize = '1.4 MB';

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoomLevel + 25, 200);
    setZoomLevel(nextZoom);
    console.log(`Document zoom increased to ${nextZoom}%`);
    onNotice?.(`Document zoom set to ${nextZoom}%`);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoomLevel - 25, 50);
    setZoomLevel(nextZoom);
    console.log(`Document zoom decreased to ${nextZoom}%`);
    onNotice?.(`Document zoom set to ${nextZoom}%`);
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    console.log('Document zoom reset to 100%');
    onNotice?.('Document zoom reset to 100%');
  };

  const handleDownload = () => {
    console.log(`Downloading attached document: ${documentName}`);
    onNotice?.(`Downloading ${documentName}...`);
  };

  return (
    <section
      className={`document-viewer-card ${className || ''}`.trim()}
      aria-label="Attached Document Viewer"
      data-testid="document-viewer-stub"
    >
      <div className="document-viewer-header">
        <div>
          <h2 className="document-viewer-title">Attached Document</h2>
          <div className="document-viewer-meta">
            <span data-testid="document-filename">{documentName}</span>
            <span>•</span>
            <span data-testid="document-size">{simulatedSize}</span>
            <span>•</span>
            <span>PDF</span>
          </div>
        </div>
        <button
          type="button"
          className="document-viewer-btn"
          onClick={handleDownload}
          data-testid="download-document-btn"
          aria-label={`Download ${documentName}`}
        >
          Download PDF
        </button>
      </div>

      <div className="document-viewer-preview" data-testid="document-preview-container">
        <div
          className="document-viewer-mock-sheet"
          data-testid="document-mock-sheet"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <div className="document-mock-header">
            <span>INVOICE #{invoice.invoiceNumber}</span>
            <span>DATE: {invoice.submittedDate}</span>
          </div>

          <div style={{ margin: '8px 0', fontSize: '12px', color: 'var(--spectrum-global-color-gray-700, #6e6e6e)' }}>
            <strong>Vendor ID:</strong> {invoice.vendorId}
            <br />
            <strong>Total Due:</strong> ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div className="document-mock-line" style={{ width: '100%' }} />
          <div className="document-mock-line" style={{ width: '85%' }} />
          <div className="document-mock-line" style={{ width: '92%' }} />
          <div className="document-mock-line" style={{ width: '60%' }} />

          <div style={{ marginTop: '16px', fontSize: '10px', textAlign: 'center', color: 'var(--spectrum-global-color-gray-600, #8e8e8e)' }}>
            Page 1 of 1 • Attached original vendor statement
          </div>
        </div>
      </div>

      <div className="document-viewer-controls">
        <div className="document-viewer-zoom-controls">
          <button
            type="button"
            className="document-viewer-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            data-testid="zoom-out-btn"
            aria-label="Zoom Out"
          >
            -
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '45px', textAlign: 'center' }} data-testid="zoom-display">
            {zoomLevel}%
          </span>
          <button
            type="button"
            className="document-viewer-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            data-testid="zoom-in-btn"
            aria-label="Zoom In"
          >
            +
          </button>
          {zoomLevel !== 100 && (
            <button
              type="button"
              className="document-viewer-btn"
              onClick={handleResetZoom}
              data-testid="zoom-reset-btn"
            >
              Reset
            </button>
          )}
        </div>

        <span style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600, #8e8e8e)' }}>
          Simulated PDF Viewer
        </span>
      </div>
    </section>
  );
};
