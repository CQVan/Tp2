"use client";

import { useState, useEffect } from "react";

interface SidebarProps {
  children: React.ReactNode;
  minWidth?: number;        // minimum width in px
  maxWidth?: number;        // maximum width in px
  width?: number;           // initial width in px
  onResize?: (width: number) => void; // optional callback for width changes
}

export default function Sidebar({
  children,
  minWidth = 200,
  maxWidth = 400,
  width,
  onResize,
}: SidebarProps) {
  // Determine initial width based on width prop, constrained by min/max
  const initialWidth = width
    ? Math.max(minWidth, Math.min(width, maxWidth))
    : minWidth;

  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(minWidth, Math.min(e.clientX, maxWidth));
        setCurrentWidth(newWidth);
        if (onResize) onResize(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  return (
    <div
      className="relative bg-gray-800 text-white flex flex-col"
      style={{ width: `${currentWidth}px` }}
    >
      {children}

      {/* Resizer */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent"
      />
    </div>
  );
}
