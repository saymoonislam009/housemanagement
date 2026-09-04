"use client";

import { useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { DialogContext } from "./Modal";

export function CloseOnSuccess({ skip = false }: { skip?: boolean }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const dialog = useContext(DialogContext);

  useEffect(() => {
    if (wasPending.current && !pending && !skip) {
      dialog?.close();
    }
    wasPending.current = pending;
  }, [pending, skip, dialog]);

  return null;
}
