"use client";

import { cn } from "@/lib/utils";

interface FlowStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface FlowConnection {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  connections?: FlowConnection[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

export function FlowDiagram({ steps, direction = "horizontal", className }: FlowDiagramProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-4 overflow-x-auto",
      direction === "vertical" ? "flex-col" : "flex-row flex-wrap justify-center",
      className
    )}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div 
            className={cn(
              "flex flex-col items-center justify-center min-w-[120px] p-3 rounded-lg border-2 text-center transition-all hover:shadow-md",
              step.color || "bg-white border-gray-200"
            )}
            style={{ backgroundColor: step.color?.includes('bg-') ? undefined : 'white' }}
          >
            {step.icon && <div className="mb-1">{step.icon}</div>}
            <span className="font-medium text-sm" style={{ color: '#1e293b' }}>{step.label}</span>
            {step.description && (
              <span className="text-xs mt-1" style={{ color: '#475569' }}>{step.description}</span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "flex items-center justify-center",
              direction === "vertical" ? "rotate-90" : ""
            )}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#9ca3af' }}>
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface BoxDiagramProps {
  title: string;
  items: { label: string; description?: string; color?: string }[];
  className?: string;
}

export function BoxDiagram({ title, items, className }: BoxDiagramProps) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)} style={{ backgroundColor: 'white' }}>
      <div className="px-4 py-2 font-medium border-b" style={{ backgroundColor: '#f1f5f9', color: '#0f172a', borderColor: '#e2e8f0' }}>
        {title}
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3" style={{ backgroundColor: 'white' }}>
        {items.map((item, index) => (
          <div
            key={index}
            className={cn("p-3 rounded-lg text-center border", item.color || "bg-blue-50 border-blue-200")}
          >
            <p className="font-medium text-sm" style={{ color: '#0f172a' }}>{item.label}</p>
            {item.description && (
              <p className="text-xs mt-1" style={{ color: '#475569' }}>{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ArchitectureLayerProps {
  layers: {
    name: string;
    color: string;
    items: string[];
  }[];
  className?: string;
}

export function ArchitectureDiagram({ layers, className }: ArchitectureLayerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {layers.map((layer, index) => (
        <div key={index} className={cn("rounded-lg p-3 border-2", layer.color)}>
          <p className="font-semibold text-sm mb-2" style={{ color: '#0f172a' }}>{layer.name}</p>
          <div className="flex flex-wrap gap-2">
            {layer.items.map((item, i) => (
              <span 
                key={i} 
                className="px-2 py-1 rounded text-xs font-medium border"
                style={{ backgroundColor: 'white', color: '#1e293b', borderColor: '#cbd5e1' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatusBadgeProps {
  status: "active" | "planned" | "deprecated" | "beta";
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = {
    active: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    planned: { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
    deprecated: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    beta: { bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
  };
  
  const s = styles[status];

  return (
    <span 
      className="px-2 py-0.5 text-xs font-medium rounded border"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {children}
    </span>
  );
}

interface EntityRelationProps {
  entities: {
    name: string;
    fields: string[];
    color?: string;
  }[];
  relations?: {
    from: string;
    to: string;
    type: "1:1" | "1:N" | "N:N";
  }[];
  className?: string;
}

export function EntityDiagram({ entities, className }: EntityRelationProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {entities.map((entity, index) => (
        <div
          key={index}
          className={cn("border-2 rounded-lg overflow-hidden", entity.color || "border-gray-300")}
          style={{ backgroundColor: 'white' }}
        >
          <div 
            className="px-3 py-2 font-semibold text-sm"
            style={{ 
              backgroundColor: '#f1f5f9', 
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            {entity.name}
          </div>
          <div className="p-2 space-y-1" style={{ backgroundColor: 'white' }}>
            {entity.fields.map((field, i) => (
              <p key={i} className="text-xs font-mono" style={{ color: '#334155' }}>{field}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TimelineProps {
  events: {
    date: string;
    title: string;
    description?: string;
    status?: "completed" | "current" | "upcoming";
  }[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ backgroundColor: '#cbd5e1' }} />
      <div className="space-y-6">
        {events.map((event, index) => {
          const dotStyles = {
            completed: { border: '#22c55e', bg: '#22c55e' },
            current: { border: '#3b82f6', bg: '#3b82f6' },
            upcoming: { border: '#9ca3af', bg: 'white' },
          };
          const dot = dotStyles[event.status || 'upcoming'];
          
          return (
            <div key={index} className="relative pl-10">
              <div 
                className="absolute left-2.5 w-3 h-3 rounded-full border-2"
                style={{ borderColor: dot.border, backgroundColor: dot.bg }}
              />
              <div>
                <p className="text-xs font-medium" style={{ color: '#64748b' }}>{event.date}</p>
                <p className="font-semibold" style={{ color: '#0f172a' }}>{event.title}</p>
                {event.description && (
                  <p className="text-sm" style={{ color: '#475569' }}>{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, language = "typescript", title, className }: CodeBlockProps) {
  return (
    <div className={cn("rounded-lg border overflow-hidden", className)} style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
      {title && (
        <div className="px-4 py-2 text-xs border-b" style={{ backgroundColor: '#334155', color: '#cbd5e1', borderColor: '#475569' }}>
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono" style={{ color: '#e2e8f0' }}>{code}</code>
      </pre>
    </div>
  );
}

// InfoBox pentru descrieri în documentație
interface InfoBoxProps {
  children: React.ReactNode;
  variant?: "default" | "warning" | "info";
  className?: string;
}

export function InfoBox({ children, variant = "default", className }: InfoBoxProps) {
  const styles = {
    default: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' },
    warning: { bg: '#fefce8', border: '#fde047', text: '#713f12' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  };
  
  const s = styles[variant];
  
  return (
    <div 
      className={cn("p-4 rounded-lg border", className)}
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {children}
    </div>
  );
}
