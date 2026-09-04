"use client";

import { ReactNode, createContext, useRef } from "react";

export const DialogContext = createContext<{ close: () => void } | null>(null);

export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <span onClick={() => ref.current?.showModal()} className="inline-flex">
        {trigger}
      </span>
      <dialog
        ref={ref}
        className="w-[92vw] max-w-md rounded-card border border-ink-900/10 bg-paper-50 p-0 shadow-card backdrop:bg-brandDark/50 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        <div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
          <button onClick={close} aria-label="Close" className="rounded-full p-1 text-ink-600 hover:bg-ink-900/5">
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto scrollbar-thin p-5">
          <div onClick={(e) => e.stopPropagation()}>
            <DialogContext.Provider value={{ close }}>{children}</DialogContext.Provider>
          </div>
        </div>
      </dialog>
    </>
  );
}
