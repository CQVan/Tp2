"use client";

import { useState, useEffect, useRef } from "react";

interface SidebarProps {
  children: React.ReactNode;
  minHeight?: number;
  maxHeight?: number;
  height?: number;
  onResize?: (height: number) => void;
}

export default function VerticalSidebarBottom({
  children,
  minHeight = 200,
  maxHeight = 600,
  height,
  onResize,
}: SidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const initialHeight = height
    ? Math.max(minHeight, Math.min(height, maxHeight))
    : minHeight;

  const [currentHeight, setCurrentHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Height relative to bottom of parent
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, containerRect.bottom - e.clientY)
        );
        setCurrentHeight(newHeight);
        if (onResize) onResize(newHeight);
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
  }, [isResizing, minHeight, maxHeight, onResize]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Sidebar anchored to bottom */}
      <div
        className="absolute bottom-0 left-0 w-full bg-gray-800 text-white flex flex-col"
        style={{ height: `${currentHeight}px` }}
      >
        {children}

        {/* Resizer at top */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="absolute top-0 left-0 w-full h-2 cursor-row-resize bg-gray-600"
        />
      </div>
    </div>
  );
}
