// src/pages/InvoiceDetail/DocumentViewerStub.tsx
import React, { useEffect, useState } from 'react';
import { Invoice } from '../../types';
import { downloadInvoiceAttachment } from '../../services/api/invoices';

export interface DocumentViewerStubProps {
  invoice: Invoice;
  onNotice?: (message: string) => void;
  className?: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; url: string; type: string; size: number };

export const DocumentViewerStub: React.FC<DocumentViewerStubProps> = ({
  invoice,
  onNotice,
  className,
}) => {
  const documentName = invoice.attachedDocumentName;
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!documentName) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    setState({ status: 'loading' });

    downloadInvoiceAttachment(invoice.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', url: objectUrl, type: blob.type, size: blob.size });
      })
      .catch((err: any) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message:
            err?.status === 404
              ? 'The document file is not available on the server.'
              : 'Could not load the document.',
        });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice.id, documentName]);

  const handleDownload = () => {
    if (state.status !== 'ready' || !documentName) return;
    const link = document.createElement('a');
    link.href = state.url;
    link.download = documentName;
    link.click();
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
            <span data-testid="document-filename">{documentName || 'No document attached'}</span>
            {state.status === 'ready' && (
              <>
                <span>•</span>
                <span data-testid="document-size">
                  {(state.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </>
            )}
          </div>
        </div>
        {documentName && (
          <button
            type="button"
            className="document-viewer-btn"
            onClick={handleDownload}
            disabled={state.status !== 'ready'}
            data-testid="download-document-btn"
            aria-label={`Download ${documentName}`}
          >
            Download
          </button>
        )}
      </div>

      <div className="document-viewer-preview" data-testid="document-preview-container">
        {!documentName ? (
          <p data-testid="document-empty">No supporting document was uploaded for this invoice.</p>
        ) : state.status === 'loading' ? (
          <p role="status" data-testid="document-loading">Loading document…</p>
        ) : state.status === 'error' ? (
          <p role="alert" data-testid="document-error">{state.message}</p>
        ) : state.type === 'application/pdf' ? (
          <iframe
            src={state.url}
            title={documentName}
            data-testid="document-pdf-preview"
            style={{ width: '100%', height: '600px', border: 'none' }}
          />
        ) : (
          <img
            src={state.url}
            alt={`Attached document ${documentName}`}
            data-testid="document-image-preview"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>
    </section>
  );
};
