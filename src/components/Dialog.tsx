import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}

/** Modal on the native <dialog>: focus trap, Esc and inert background come from the browser. */
export function Dialog({ open, onClose, title, wide, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`ds-dialog${wide ? ' wide' : ''}`}
      onClose={onClose}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <button
            type="button"
            className="ds-btn ghost sm icon ds-dialog-close"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
          <div className="ds-dialog-body">
            <h2 className="ds-dialog-title">{title}</h2>
            {children}
          </div>
        </>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="ds-dialog-text">{text}</p>
      <div className="ds-dialog-actions">
        <button type="button" className="ds-btn" onClick={onClose}>
          Abbrechen
        </button>
        <button
          type="button"
          className="ds-btn danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
