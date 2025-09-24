import React, { forwardRef } from "react";

/** Simple glassy card surface for modals (with ref support) */
const ModalSurface = forwardRef(function ModalSurface(
  { className = "", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-xl ${className}`}
      {...props}
    />
  );
});

export default ModalSurface;
