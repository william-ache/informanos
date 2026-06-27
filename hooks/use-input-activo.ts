"use client";

import { useEffect, useState } from "react";

function esCampoEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled;
  }
  return el.isContentEditable;
}

export function useInputActivo(): boolean {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (esCampoEditable(event.target)) setActivo(true);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!esCampoEditable(document.activeElement)) setActivo(false);
      }, 0);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return activo;
}
