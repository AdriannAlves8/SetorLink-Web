import React from "react";

/** Container padrão: largura máxima centralizada em todas as telas */
export function PageShell({ children, className = "" }) {
  return <div className={`page-shell ${className}`.trim()}>{children}</div>;
}

/** Barra de título + ações (substitui dashboard-hero em telas internas) */
export function PageToolbar({ title, subtitle, children }) {
  return (
    <div className="page-toolbar card">
      <div className="page-toolbar__main">
        {title ? <h2 className="page-toolbar__title">{title}</h2> : null}
        {subtitle ? <p className="page-toolbar__subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="page-toolbar__actions">{children}</div> : null}
    </div>
  );
}

/** Bloco introdutório com ícone (admin e telas informativas) */
export function PageIntro({ icon, title, children, actions }) {
  return (
    <section className="page-intro card">
      {icon ? <div className="page-intro__icon">{icon}</div> : null}
      <div className="page-intro__text">
        {title ? <h2 className="page-intro__title">{title}</h2> : null}
        {children}
      </div>
      {actions || null}
    </section>
  );
}

/** Faixa de botões alinhada à direita acima de tabelas */
export function PageActionsBar({ children, className = "" }) {
  return (
    <div className={`page-actions-bar ${className}`.trim()}>
      {children}
    </div>
  );
}
