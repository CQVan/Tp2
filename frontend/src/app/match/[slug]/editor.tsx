"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Editor, { OnMount } from "@monaco-editor/react";
import VerticalSidebar from "@/components/vertical_sidebar";

export default function MatchPage() {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState<string>("");
  const [terminal, setTerminal] = useState<string>("");
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

    function onRun(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        throw new Error("Function not implemented.");
    }

    function onSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        throw new Error("Function not implemented.");
    }

    return (
        <div>
            <div className="flex justify-center gap-4">
                <button onClick={onRun}>Run</button>
                <button onClick={onSubmit}>Submit</button>
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
                    <select onChange={(e) => setLanguage(e.target.value)}>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                    </select>
                </div>

                    <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    onMount={handleEditorMount}
                    />
            </div>
        </div>
        </div>
    );
}
