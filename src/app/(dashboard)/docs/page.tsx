"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Book, Search, Download, FileDown, ChevronRight, ChevronDown, FileText,
  FolderOpen, Folder, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DocFile {
  name: string;
  path: string;
}

interface DocSection {
  dir: string;
  title: string;
  files: DocFile[];
}

export default function DocsPage() {
  const [sections, setSections] = useState<DocSection[]>([]);
  const [activeFile, setActiveFile] = useState<string>("README.md");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load section list
  useEffect(() => {
    fetch("/api/docs/content")
      .then((res) => res.json())
      .then((data) => {
        if (data.sections) {
          setSections(data.sections);
          // Expand all sections by default
          setExpandedSections(new Set(data.sections.map((s: DocSection) => s.dir)));
        }
      })
      .catch(console.error);
  }, []);

  // Load file content
  const loadFile = useCallback(
    async (filePath: string) => {
      setContentLoading(true);
      setActiveFile(filePath);
      try {
        const res = await fetch(`/api/docs/content?file=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        if (data.content) {
          setContent(data.content);
        } else {
          setContent(`> Eroare: ${data.error || "Nu s-a putut incarca fisierul"}`);
        }
      } catch {
        setContent("> Eroare la incarcarea fisierului");
      } finally {
        setContentLoading(false);
        setLoading(false);
      }
    },
    []
  );

  // Load README on mount
  useEffect(() => {
    loadFile("README.md");
  }, [loadFile]);

  const toggleSection = (dir: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };

  const handleDownloadPDF = () => {
    window.open("/api/docs/download?format=pdf", "_blank");
  };

  const handleDownloadMD = () => {
    window.open("/api/docs/download?format=md", "_blank");
  };

  // Filter sections based on search
  const filteredSections = sections
    .map((section) => ({
      ...section,
      files: section.files.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.path.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((section) => section.files.length > 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Book className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Documentatie</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cauta fisier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* File tree */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* README */}
            <button
              onClick={() => loadFile("README.md")}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left hover:bg-accent transition-colors",
                activeFile === "README.md" && "bg-accent font-medium"
              )}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">README</span>
            </button>

            {/* Sections */}
            {filteredSections.map((section) => (
              <div key={section.dir} className="mt-1">
                <button
                  onClick={() => toggleSection(section.dir)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm font-medium text-left hover:bg-accent transition-colors"
                >
                  {expandedSections.has(section.dir) ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                  <span className="truncate">{section.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {section.files.length}
                  </span>
                </button>

                {expandedSections.has(section.dir) && (
                  <div className="ml-3 border-l pl-2">
                    {section.files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => loadFile(file.path)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm text-left hover:bg-accent transition-colors",
                          activeFile === file.path && "bg-accent font-medium"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Download buttons */}
        <div className="p-3 border-t space-y-2">
          <Button onClick={handleDownloadPDF} className="w-full" variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handleDownloadMD} className="w-full" variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Download MD
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading || contentLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-8">
            <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-table:text-sm prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
