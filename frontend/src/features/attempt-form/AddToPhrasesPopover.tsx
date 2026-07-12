import { useEffect, useRef, useState, type ReactNode } from "react";

type Popup = { text: string; top: number; left: number };

type Props = {
  onAdd: (text: string) => void;
  children: ReactNode;
  className?: string;
};

const POPUP_WIDTH_ESTIMATE = 160;
const VIEWPORT_MARGIN = 8;

/**
 * Wraps UMPIRE explanation content: selecting text inside shows an "Add to phrases" popup
 * (5.5). The popup is dismissed when the selection is cleared, extends outside this container
 * (drag started inside but released outside, or vice versa), or the user clicks/taps outside.
 */
export function AddToPhrasesPopover({ onAdd, children, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    function updateFromSelection() {
      const selection = window.getSelection();
      const container = containerRef.current;
      if (!selection || selection.isCollapsed || !container) {
        setPopup(null);
        return;
      }
      const text = selection.toString().trim();
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      // Reject selections that start or end outside this panel (e.g. a drag that started
      // inside the explanation but was released elsewhere on the page).
      if (!text || !anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) {
        setPopup(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = typeof range.getBoundingClientRect === "function" ? range.getBoundingClientRect() : { top: 0, left: 0 };
      const maxLeft = Math.max(window.innerWidth - POPUP_WIDTH_ESTIMATE - VIEWPORT_MARGIN, VIEWPORT_MARGIN);
      const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), maxLeft);
      setPopup({ text, top: rect.top, left });
    }

    function handleOutsidePointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setPopup(null);
    }

    document.addEventListener("selectionchange", updateFromSelection);
    document.addEventListener("mousedown", handleOutsidePointerDown);
    document.addEventListener("keyup", updateFromSelection);
    return () => {
      document.removeEventListener("selectionchange", updateFromSelection);
      document.removeEventListener("mousedown", handleOutsidePointerDown);
      document.removeEventListener("keyup", updateFromSelection);
    };
  }, []);

  function handleAdd() {
    if (!popup) return;
    onAdd(popup.text);
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
      {popup && (
        <button
          type="button"
          // Prevent the button's own mousedown from collapsing the text selection before
          // the click handler (handleAdd) gets to read it.
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAdd}
          style={{ position: "fixed", top: Math.max(popup.top - 36, VIEWPORT_MARGIN), left: popup.left }}
          className="z-20 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-slate-800"
        >
          Add to phrases
        </button>
      )}
    </div>
  );
}
