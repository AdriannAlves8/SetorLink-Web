import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export const HELPDESK_URL = "https://suporte.gsapori.com.br/novo_chamado.php";

export default function HelpdeskPasswordDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="helpdesk-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="helpdesk-dialog-title"
      onClick={onClose}
    >
      <div
        className="helpdesk-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="helpdesk-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <header className="helpdesk-modal__header">
          <div className="helpdesk-modal__icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 id="helpdesk-dialog-title" className="helpdesk-modal__title">
            Recuperação de senha
          </h2>
          <p className="helpdesk-modal__subtitle">
            A redefinição é feita manualmente pelo suporte. Siga os passos abaixo:
          </p>
        </header>

        <div className="helpdesk-modal__body">
          <ol className="helpdesk-modal__steps">
            <li>Acesse o Helpdesk GS pelo botão abaixo</li>
            <li>Abra um chamado informando seu <strong>e-mail</strong> e <strong>setor</strong></li>
            <li>Aguarde o retorno da equipe com a nova senha</li>
          </ol>
        </div>

        <footer className="helpdesk-modal__footer">
          <button type="button" className="btn" onClick={onClose}>
            Voltar ao login
          </button>
          <a
            href={HELPDESK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary helpdesk-modal__cta"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Abrir Helpdesk GS
          </a>
        </footer>
      </div>
    </div>,
    document.body
  );
}
