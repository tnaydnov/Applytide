import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * StatusDropdown
 * Accessible dropdown to change a document's status.
 *
 * Props:
 * - value: string (current status value)
 * - options: Array<{ value: string, label: string, color?: string }>
 * - onChange: (newValue: string) => void
 * - align: "right" | "left" (default "right")
 * - buttonClassName: string (optional)
 * - menuClassName: string (optional)
 */
export default function StatusDropdown({
  value,
  options = [],
  onChange,
  align = "right",
  buttonClassName = "",
  menuClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const items = useMemo(
    () => (Array.isArray(options) ? options.filter(Boolean) : []),
    [options]
  );

  const current = useMemo(
    () => items.find((o) => o.value === value) || items[0] || { label: "Status" },
    [items, value]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    const onResize = () => setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Basic keyboard navigation
  const openMenu = () => {
    setOpen(true);
    // focus first selected or first item
    const idx = Math.max(
      0,
      items.findIndex((o) => o.value === value)
    );
    setActiveIndex(idx);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      btnRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const choice = items[activeIndex];
      if (choice) {
        onChange?.(choice.value);
        setOpen(false);
        setActiveIndex(-1);
        btnRef.current?.focus();
      }
    }
  };

  const colorRing =
    current.color === "green"
      ? "ring-emerald-500/40"
      : current.color === "yellow"
      ? "ring-amber-500/40"
      : current.color === "blue"
      ? "ring-sky-500/40"
      : "ring-slate-500/40";

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        className={
          buttonClassName ||
          `px-2 py-1 rounded-full text-xs bg-slate-700/60 border border-slate-600/50 
           text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 ${colorRing}`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        {current.label} ▾
      </button>

      {open && (
        <div
          ref={menuRef}
          className={
            menuClassName ||
            `absolute ${align === "right" ? "right-0" : "left-0"} mt-1 z-20 
             bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 min-w-[140px]`
          }
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {items.map((opt, idx) => {
            const isActive = idx === activeIndex;
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`w-full text-left px-3 py-1.5 text-sm transition
                  ${isSelected ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700"}
                  ${isActive ? "outline-none ring-2 ring-indigo-500/40" : ""}
                `}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                  setActiveIndex(-1);
                  btnRef.current?.focus();
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
