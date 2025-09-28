"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Editor, { OnMount } from "@monaco-editor/react";

export default function MatchPage() {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Whenever sidebar width changes, trigger editor layout
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [sidebarWidth]);

  return (
    <div>
        <div className="flex justify-center gap-4">
            <button>Run</button>
            <button>Submit</button>
        </div>
        <div className="flex h-screen">
        {/* Sidebar with dynamic width */}
        <Sidebar
            minWidth={150}
            maxWidth={500}
            width={400}
            // Sidebar exposes a callback for width changes
            onResize={(w) => setSidebarWidth(w)}
        >
            <h1 className="text-white text-lg font-bold m-4">Title</h1>
            <p className="text-gray-300 m-4">Prompt goes here</p>
        </Sidebar>

        {/* Editor fills remaining space */}
        <div
            className="flex-1"
            style={{ width: `calc(100% - ${sidebarWidth}px)` }}
        >
            <div>
                
            </div>
            <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// Your code here"
            onMount={handleEditorMount}
            />
        </div>
        </div>
    </div>
  );
}
