"use client";

import { useState, useEffect } from "react";
import {
  Book,
  ShoppingCart,
  Truck,
  FileText,
  Package,
  Megaphone,
  Settings,
  Shield,
  Database,
  Zap,
  GitBranch,
  Clock,
  Server,
  Users,
  Bell,
  BarChart3,
  Layers,
  Code,
  ChevronRight,
  Search,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Warehouse,
  Receipt,
  Boxes,
  Network,
  Workflow,
  FolderTree,
  Table2,
  Link2,
  Globe,
  Key,
  Activity,
  TrendingUp,
  DollarSign,
  Target,
  Eye,
  Pencil,
    Minus,
  Trash2,
  Plus,
  Download,
  Upload,
  Printer,
  QrCode,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Filter,
  SortAsc,
  MoreHorizontal,
  Info,
  HelpCircle,
  BookOpen,
  FileCode,
  Cpu,
  HardDrive,
  Cloud,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Building2,
  Store,
  CreditCard,
  Banknote,
  PieChart,
  LineChart,
  BarChart,
  Gauge,
  Timer,
  Repeat,
  Split,
  Merge,
  GitMerge,
  GitPullRequest,
  Terminal,
  Braces,
  FileJson,
  ScrollText,
  ClipboardList,
  ClipboardCheck,
  PackageCheck,
  PackageX,
  PackageSearch,
  ScanLine,
  Scan,
  Hand,
  HandMetal,
  Send,
  Inbox,
  Archive,
  FolderOpen,
  FileUp,
  FileDown,
  Image,
  ImagePlus,
  Tags,
  Tag,
  Hash,
  AtSign,
  Percent,
  Calculator,
  Scale,
  Ruler,
  Weight,
  Box,
  Layers3,
  Component,
  Puzzle,
  Cog,
  Wrench,
  Settings2,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Power,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Heart,
  Flag,
  Bookmark,
  Pin,
  Crosshair,
  Navigation,
  Compass,
  Map,
  Route,
  Milestone,
  Signpost,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpDown,
  Minimize2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  Grab,
  MousePointer,
  Pointer,
  Hand as HandIcon,
  Fingerprint,
  ScanFace,
  BadgeCheck,
  Award,
  Medal,
  Trophy,
  Crown,
  Gem,
  Sparkles,
  Wand2,
  Lightbulb,
  BrainCircuit,
  Bot,
  Rocket,
  Flame,
  Zap as ZapIcon,
  Bolt,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  MessagesSquare,
  Megaphone as MegaphoneIcon,
  Volume2,
  VolumeX,
  BellRing,
  BellOff,
  AlarmClock,
  Hourglass,
  History,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Save,
  SaveAll,
  FolderPlus,
  FolderMinus,
  FilePlus,
  FileMinus,
  FileEdit,
  FileCog,
  FileCheck,
  FileX,
  FileWarning,
  FileQuestion,
  FileSearch,
  Files,
  Folder,
  FolderClosed,
  Home,
  Building,
  Factory,
  Landmark,
  Hotel,
  School,
  Hospital,
  Plane,
  Car,
  Bus,
  Train,
  Ship,
  Bike,
  Footprints,
  PersonStanding,
  Users2,
  UserPlus,
  UserMinus,
  UserCog,
  Contact,
  ContactRound,
  IdCard,
  Fingerprint as FingerprintIcon,
  KeyRound,
  KeySquare,
  LockKeyhole,
  UnlockKeyhole,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ShieldX,
  ShieldOff,
  Siren,
  CircleAlert,
  OctagonAlert,
  TriangleAlert,
  Ban,
  CircleSlash,
  XCircle,
  XOctagon,
  AlertCircle,
  CircleHelp,
  BadgeInfo,
  BadgeAlert,
  BadgeX,
  CircleCheck,
  CircleDot,
  CircleDashed,
  Loader,
  Loader2,
  RefreshCcw,
  RefreshCcwDot,
  Replace,
  ReplaceAll,
  Shuffle,
  ListOrdered,
  List,
  ListChecks,
  ListTodo,
  ListTree,
  ListFilter,
  ListPlus,
  ListMinus,
  ListX,
  ListCollapse,
  ListEnd,
  ListStart,
  ListRestart,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  WrapText,
  Pilcrow,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Quote,
  Code2,
  CodeSquare,
  Brackets,
  Parentheses,
  Regex,
  Binary,
  Hexagon,
  Octagon,
  Pentagon,
  SquareStack,
  Cylinder,
  Cone,
  Cuboid,
  Orbit,
  Atom,
  Dna,
  Microscope,
  FlaskConical,
  TestTube,
  TestTubes,
  Pipette,
  Pill,
  Syringe,
  Stethoscope,
  HeartPulse,
  Activity as ActivityIcon,
  Thermometer,
  Droplet,
  Droplets,
  Wind,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Rainbow,
  Umbrella,
  Snowflake,
  Flame as FlameIcon,
  Waves,
  Mountain,
  MountainSnow,
  TreePine,
  TreeDeciduous,
  Flower,
  Flower2,
  Leaf,
  Sprout,
  Wheat,
  Apple,
  Banana,
  Cherry,
  Citrus,
  Grape,
  Nut,
  Carrot,
  Salad,
  Sandwich,
  Pizza,
  Popcorn,
  IceCream,
  IceCreamCone,
  Cake,
  CakeSlice,
  Cookie,
  Croissant,
  Egg,
  EggFried,
  Ham,
  Drumstick,
  Fish,
  Beef,
  Bean,
  Soup,
  UtensilsCrossed,
  ChefHat,
  CookingPot,
  Microwave,
  Refrigerator,
  Coffee,
  CupSoda,
  GlassWater,
  Wine,
  Beer,
  Martini,
  Milk,
  Candy,
  Lollipop,
  Baby,
  Bone,
  Footprints as FootprintsIcon,
  PawPrint,
  Bird,
  Bug,
  Rat,
  Cat,
  Dog,
  Rabbit,
  Turtle,
  Snail,
  Squirrel,
  Fish as FishIcon,
  Shell,
  Feather,
  Egg as EggIcon,
  Antenna,
  BugOff,
  BugPlay,
  Guitar,
  Piano,
  Drum,
  Music,
  Music2,
  Music3,
  Music4,
  Mic,
  Mic2,
  MicOff,
  Headphones,
  Speaker,
  Radio,
  Podcast,
  Disc,
  Disc2,
  Disc3,
  DiscAlbum,
  ListMusic,
  PlayCircle,
  PauseCircle,
  StopCircle,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Repeat as RepeatIcon,
  Repeat1,
  Repeat2,
  ShuffleIcon,
  Volume,
  Volume1,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Airplay,
  Cast,
  Tv,
  Tv2,
  Monitor,
  MonitorOff,
  MonitorSmartphone,
  Laptop,
  Laptop2,
  Tablet,
  TabletSmartphone,
  Smartphone,
  Watch,
  Gamepad,
  Gamepad2,
  Joystick,
  Dices,
  Puzzle as PuzzleIcon,
  ToyBrick,
  Blocks,
  Shapes,
  SquareAsterisk,
  SquareDot,
  SquareEqual,
  SquareSlash,
  SquareMinus,
  SquarePlus,
  SquareX,
  SquareCheck,
  SquareCode,
  SquareActivity,
  SquareArrowDown,
  SquareArrowLeft,
  SquareArrowRight,
  SquareArrowUp,
  SquareArrowDownLeft,
  SquareArrowDownRight,
  SquareArrowUpLeft,
  SquareArrowUpRight,
  SquareArrowOutDownLeft,
  SquareArrowOutDownRight,
  SquareArrowOutUpLeft,
  SquareArrowOutUpRight,
  SquareBottomDashedScissors,
  SquareChartGantt,
  SquareChevronDown,
  SquareChevronLeft,
  SquareChevronRight,
  SquareChevronUp,
  SquareDashedBottom,
  SquareDashedBottomCode,
  SquareDashedKanban,
  SquareDashedMousePointer,
  SquareFunction,
  SquareGanttChart,
  SquareKanban,
  SquareLibrary,
  SquareM,
  SquareMenu,
  SquareMousePointer,
  SquareParking,
  SquareParkingOff,
  SquarePen,
  SquarePercent,
  SquarePi,
  SquarePlay,
  SquarePower,
  SquareRadical,
  SquareScissors,
  SquareSigma,
  SquareSplitHorizontal,
  SquareSplitVertical,
  SquareTerminal,
  SquareUser,
  SquareUserRound,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Versiune documentație
const DOC_VERSION = "3.0.0";
const LAST_UPDATED = "2026-01-13";

// ==================== MERMAID DIAGRAM COMPONENT ====================
function MermaidDiagram({ chart, title }: { chart: string; title?: string }) {
  const [rendered, setRendered] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Încărcăm mermaid dinamic
    import("mermaid").then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#3b82f6",
          primaryTextColor: "#1e293b",
          primaryBorderColor: "#60a5fa",
          lineColor: "#64748b",
          secondaryColor: "#f1f5f9",
          tertiaryColor: "#e2e8f0",
          background: "#ffffff",
          mainBkg: "#ffffff",
          nodeBorder: "#94a3b8",
          clusterBkg: "#f8fafc",
          clusterBorder: "#cbd5e1",
          titleColor: "#0f172a",
          edgeLabelBackground: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        flowchart: {
          htmlLabels: true,
          curve: "basis",
          padding: 15,
        },
        er: {
          layoutDirection: "TB",
          minEntityWidth: 100,
          minEntityHeight: 75,
          entityPadding: 15,
        },
        sequence: {
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35,
        },
      });

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.default
        .render(id, chart)
        .then((result) => {
          setRendered(result.svg);
        })
        .catch((err) => {
          setError(err.message);
        });
    });
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Eroare la generarea diagramei: {error}
      </div>
    );
  }

  return (
    <div className="my-6">
      {title && (
        <h4 className="text-sm font-semibold mb-3 text-slate-700">{title}</h4>
      )}
      <div
        className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto shadow-sm"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
}

// ==================== FLOW DIAGRAM COMPONENT ====================
interface FlowStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
  status?: "active" | "pending" | "completed" | "error";
}

function FlowDiagram({
  steps,
  direction = "horizontal",
  className,
  showArrows = true,
}: {
  steps: FlowStep[];
  direction?: "horizontal" | "vertical";
  className?: string;
  showArrows?: boolean;
}) {
  const statusColors = {
    active: "bg-blue-100 border-blue-400 ring-2 ring-blue-200",
    pending: "bg-slate-50 border-slate-300",
    completed: "bg-green-100 border-green-400",
    error: "bg-red-100 border-red-400",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 overflow-x-auto",
        direction === "vertical"
          ? "flex-col"
          : "flex-row flex-wrap justify-center",
        className
      )}
    >
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          <div
            className={cn(
              "flex flex-col items-center justify-center min-w-[130px] p-4 rounded-xl border-2 text-center transition-all hover:shadow-lg cursor-default",
              step.status ? statusColors[step.status] : step.color || "bg-white border-slate-200"
            )}
          >
            {step.icon && (
              <div className="mb-2 text-slate-600">{step.icon}</div>
            )}
            <span className="font-semibold text-sm text-slate-800">
              {step.label}
            </span>
            {step.description && (
              <span className="text-xs mt-1 text-slate-500">
                {step.description}
              </span>
            )}
          </div>
          {showArrows && index < steps.length - 1 && (
            <div
              className={cn(
                "flex items-center justify-center text-slate-400",
                direction === "vertical" ? "rotate-90" : ""
              )}
            >
              <ArrowRight className="h-5 w-5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== BOX DIAGRAM COMPONENT ====================
function BoxDiagram({
  title,
  items,
  columns = 3,
  className,
}: {
  title: string;
  items: { label: string; description?: string; color?: string; icon?: React.ReactNode }[];
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm",
        className
      )}
    >
      <div className="px-4 py-3 font-semibold border-b border-slate-200 bg-slate-50 text-slate-800">
        {title}
      </div>
      <div
        className={cn(
          "p-4 grid gap-3",
          columns === 2
            ? "grid-cols-2"
            : columns === 4
            ? "grid-cols-2 md:grid-cols-4"
            : "grid-cols-2 md:grid-cols-3"
        )}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "p-4 rounded-lg text-center border transition-all hover:shadow-md",
              item.color || "bg-blue-50 border-blue-200"
            )}
          >
            {item.icon && (
              <div className="flex justify-center mb-2 text-slate-600">
                {item.icon}
              </div>
            )}
            <p className="font-semibold text-sm text-slate-800">{item.label}</p>
            {item.description && (
              <p className="text-xs mt-1 text-slate-500">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ARCHITECTURE DIAGRAM ====================
function ArchitectureDiagram({
  layers,
  className,
}: {
  layers: { name: string; color: string; items: string[]; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {layers.map((layer, index) => (
        <div
          key={index}
          className={cn("rounded-xl p-4 border-2 transition-all hover:shadow-md", layer.color)}
        >
          <div className="flex items-center gap-2 mb-3">
            {layer.icon}
            <p className="font-bold text-sm text-slate-800">{layer.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {layer.items.map((item, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-sm"
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

// ==================== ENTITY DIAGRAM ====================
function EntityDiagram({
  entities,
  className,
}: {
  entities: { name: string; fields: string[]; color?: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
        className
      )}
    >
      {entities.map((entity, index) => (
        <div
          key={index}
          className={cn(
            "border-2 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all",
            entity.color || "border-slate-300"
          )}
        >
          <div className="px-3 py-2.5 font-bold text-sm bg-slate-100 text-slate-800 border-b border-slate-200 flex items-center gap-2">
            {entity.icon}
            {entity.name}
          </div>
          <div className="p-3 space-y-1.5 bg-white">
            {entity.fields.map((field, i) => (
              <p key={i} className="text-xs font-mono text-slate-600">
                {field}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== TIMELINE ====================
function Timeline({
  events,
  className,
}: {
  events: {
    date: string;
    title: string;
    description?: string;
    status?: "completed" | "current" | "upcoming";
  }[];
  className?: string;
}) {
  const statusStyles = {
    completed: { border: "#22c55e", bg: "#22c55e" },
    current: { border: "#3b82f6", bg: "#3b82f6" },
    upcoming: { border: "#94a3b8", bg: "#ffffff" },
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-300" />
      <div className="space-y-6">
        {events.map((event, index) => {
          const dot = statusStyles[event.status || "upcoming"];
          return (
            <div key={index} className="relative pl-10">
              <div
                className="absolute left-2.5 w-3 h-3 rounded-full border-2"
                style={{ borderColor: dot.border, backgroundColor: dot.bg }}
              />
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  {event.date}
                </p>
                <p className="font-bold text-slate-800">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-slate-600">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== STATUS BADGE ====================
function StatusBadge({
  status,
  children,
}: {
  status: "active" | "planned" | "deprecated" | "beta" | "new";
  children: React.ReactNode;
}) {
  const styles = {
    active: "bg-green-100 border-green-300 text-green-800",
    planned: "bg-yellow-100 border-yellow-300 text-yellow-800",
    deprecated: "bg-red-100 border-red-300 text-red-800",
    beta: "bg-purple-100 border-purple-300 text-purple-800",
    new: "bg-blue-100 border-blue-300 text-blue-800",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 text-xs font-semibold rounded-full border",
        styles[status]
      )}
    >
      {children}
    </span>
  );
}

// ==================== CODE BLOCK ====================
function CodeBlock({
  code,
  language = "typescript",
  title,
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {title && (
        <div className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-t-lg border-b border-slate-700">
          {title}
        </div>
      )}
      <pre
        className={cn(
          "bg-slate-900 text-slate-100 p-4 overflow-x-auto text-sm font-mono",
          title ? "rounded-b-lg" : "rounded-lg"
        )}
      >
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ==================== INFO BOX ====================
function InfoBox({
  children,
  variant = "info",
  title,
}: {
  children: React.ReactNode;
  variant?: "info" | "warning" | "success" | "error" | "tip";
  title?: string;
}) {
  const styles = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Info className="h-5 w-5 text-blue-600" />,
      title: "text-blue-800",
      text: "text-blue-700",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: "text-amber-800",
      text: "text-amber-700",
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      title: "text-green-800",
      text: "text-green-700",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: "text-red-800",
      text: "text-red-700",
    },
    tip: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: <Lightbulb className="h-5 w-5 text-purple-600" />,
      title: "text-purple-800",
      text: "text-purple-700",
    },
  };

  const s = styles[variant];

  return (
    <div className={cn("p-4 rounded-xl border-2 my-4", s.bg, s.border)}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
        <div className="flex-1">
          {title && (
            <p className={cn("font-bold mb-1", s.title)}>{title}</p>
          )}
          <div className={cn("text-sm", s.text)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ==================== SECTION COMPONENTS ====================
function SectionTitle({
  children,
  id,
  icon,
}: {
  children: React.ReactNode;
  id?: string;
  icon?: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold mt-10 mb-6 flex items-center gap-3 text-slate-800 scroll-mt-20 border-b border-slate-200 pb-3"
    >
      {icon && <span className="text-blue-600">{icon}</span>}
      {children}
    </h2>
  );
}

function SubSection({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ==================== PROCESS CARD ====================
function ProcessCard({
  number,
  title,
  description,
  details,
  color = "blue",
}: {
  number: number;
  title: string;
  description: string;
  details?: string[];
  color?: "blue" | "green" | "orange" | "purple" | "red";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 border-blue-300",
    green: "bg-green-100 text-green-700 border-green-300",
    orange: "bg-orange-100 text-orange-700 border-orange-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    red: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 flex-shrink-0",
              colors[color]
            )}
          >
            {number}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
            <p className="text-sm text-slate-600 mb-2">{description}</p>
            {details && details.length > 0 && (
              <ul className="text-xs text-slate-500 space-y-1">
                {details.map((detail, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== FEATURE CARD ====================
function FeatureCard({
  icon,
  title,
  description,
  badges,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badges?: string[];
}) {
  return (
    <Card className="hover:shadow-lg transition-all h-full">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
            {icon}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
            <p className="text-sm text-slate-600">{description}</p>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {badges.map((badge, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs bg-slate-100"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== STAT CARD ====================
function StatCard({
  label,
  value,
  description,
  trend,
  icon,
}: {
  label: string;
  value: string;
  description?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {description && (
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
// ==================== MODULE DEFINITIONS ====================
const modules = [
  { id: "overview", name: "Prezentare Generală", icon: Book, color: "text-blue-600" },
  { id: "architecture", name: "Arhitectură Sistem", icon: Layers, color: "text-purple-600" },
  { id: "orders", name: "Comenzi & Procesare", icon: ShoppingCart, color: "text-green-600" },
  { id: "products", name: "Produse & Inventar", icon: Package, color: "text-orange-600" },
  { id: "invoices", name: "Facturare SmartBill", icon: FileText, color: "text-indigo-600" },
  { id: "shipping", name: "Livrare & AWB", icon: Truck, color: "text-amber-600" },
  { id: "picking", name: "Picking & Predare", icon: ClipboardCheck, color: "text-teal-600" },
  { id: "advertising", name: "Advertising", icon: Megaphone, color: "text-pink-600" },
  { id: "rbac", name: "Permisiuni & Roluri", icon: Shield, color: "text-red-600" },
  { id: "database", name: "Baza de Date", icon: Database, color: "text-cyan-600" },
  { id: "integrations", name: "Integrări Externe", icon: GitBranch, color: "text-violet-600" },
  { id: "api", name: "API Reference", icon: Code, color: "text-slate-600" },
  { id: "changelog", name: "Istoric Versiuni", icon: History, color: "text-gray-600" },
];

// ==================== 1. OVERVIEW CONTENT ====================
function OverviewContent() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-3">ERP CashFlowSync</h1>
        <p className="text-blue-100 text-lg mb-6">
          Platformă completă pentru gestionarea unui business e-commerce multi-canal,
          integrând comenzi, livrare, facturare, inventar și advertising într-un singur sistem.
        </p>
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-white/20 text-white border-white/30">Next.js 14</Badge>
          <Badge className="bg-white/20 text-white border-white/30">TypeScript</Badge>
          <Badge className="bg-white/20 text-white border-white/30">PostgreSQL</Badge>
          <Badge className="bg-white/20 text-white border-white/30">Prisma ORM</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Module" value="12+" description="Complet integrate" icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Integrări" value="8" description="Servicii externe" icon={<GitBranch className="h-5 w-5" />} />
        <StatCard label="Tabele DB" value="80+" description="Schema complexă" icon={<Database className="h-5 w-5" />} />
        <StatCard label="API Routes" value="50+" description="Endpoints REST" icon={<Code className="h-5 w-5" />} />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Capabilități Principale</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Multi-Channel Orders"
          description="Import comenzi din Shopify, Trendyol și alte marketplace-uri într-un flux unificat."
          badges={["Shopify", "Trendyol", "Webhook", "CRON"]}
        />
        <FeatureCard
          icon={<FileText className="h-5 w-5" />}
          title="Facturare Automată"
          description="Emitere automată facturi prin SmartBill cu serii multiple și descărcare PDF."
          badges={["SmartBill", "PDF", "Serii", "TVA"]}
        />
        <FeatureCard
          icon={<Truck className="h-5 w-5" />}
          title="Livrare & Tracking"
          description="Generare AWB-uri FanCourier, tracking în timp real și predare curier."
          badges={["FanCourier", "AWB", "Tracking", "Ramburs"]}
        />
        <FeatureCard
          icon={<Package className="h-5 w-5" />}
          title="Inventar Inteligent"
          description="Sistem dual de stoc cu suport pentru produse compuse și rețete."
          badges={["Stoc", "Rețete", "Alertări", "Multi-depozit"]}
        />
        <FeatureCard
          icon={<Megaphone className="h-5 w-5" />}
          title="Advertising Management"
          description="Gestionare campanii Meta Ads și TikTok Ads cu alerte automate."
          badges={["Meta", "TikTok", "ROAS", "Alerte"]}
        />
        <FeatureCard
          icon={<Shield className="h-5 w-5" />}
          title="Control Acces RBAC"
          description="Sistem granular de permisiuni cu roluri, grupuri și restricții per magazin."
          badges={["Roluri", "Permisiuni", "Grupuri", "Audit"]}
        />
      </div>

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Fluxul Principal al unei Comenzi</SectionTitle>

      <InfoBox variant="info" title="De la comandă la livrare">
        Fiecare comandă parcurge un flux automatizat care include validare, facturare,
        generare AWB și tracking până la livrarea finală.
      </InfoBox>

      <MermaidDiagram
        title="Lifecycle-ul unei Comenzi"
        chart={`
flowchart LR
    subgraph SURSE["Surse Comenzi"]
        S1[Shopify]
        S2[Trendyol]
    end

    subgraph ERP["Procesare ERP"]
        P1[Validare]
        P2[Picking List]
        P3[Facturare]
        P4[AWB]
    end

    subgraph EXTERNE["Servicii Externe"]
        E1[SmartBill]
        E2[FanCourier]
    end

    subgraph FINAL["✅ Finalizare"]
        F1[Expediere]
        F2[Tracking]
        F3[Livrare]
    end

    S1 --> P1
    S2 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> E1
    E1 --> P4
    P4 --> E2
    E2 --> F1
    F1 --> F2
    F2 --> F3
        `}
      />

      <SectionTitle icon={<Server className="h-6 w-6" />}>Stack Tehnologic</SectionTitle>

      <ArchitectureDiagram
        layers={[
          {
            name: "Frontend",
            color: "bg-blue-50 border-blue-300",
            icon: <Monitor className="h-5 w-5 text-blue-600" />,
            items: ["Next.js 14", "React 18", "TailwindCSS", "shadcn/ui", "TanStack Query", "Lucide Icons"],
          },
          {
            name: "Backend",
            color: "bg-green-50 border-green-300",
            icon: <Server className="h-5 w-5 text-green-600" />,
            items: ["Next.js API Routes", "Prisma ORM", "NextAuth.js", "Node.js 20", "TypeScript"],
          },
          {
            name: "Bază de Date",
            color: "bg-purple-50 border-purple-300",
            icon: <Database className="h-5 w-5 text-purple-600" />,
            items: ["PostgreSQL", "Prisma Migrations", "JSON Fields", "Full-Text Search"],
          },
          {
            name: "Integrări Externe",
            color: "bg-orange-50 border-orange-300",
            icon: <Globe className="h-5 w-5 text-orange-600" />,
            items: ["Shopify API", "Trendyol API", "SmartBill API", "FanCourier API", "Meta Ads API", "TikTok Ads API", "Google Drive API"],
          },
          {
            name: "Infrastructură",
            color: "bg-slate-50 border-slate-300",
            icon: <Cloud className="h-5 w-5 text-slate-600" />,
            items: ["Railway (Hosting)", "CRON Jobs", "Webhook Handlers", "PDF Generation"],
          },
        ]}
      />

      <SectionTitle icon={<Network className="h-6 w-6" />}>Cum Comunică Modulele</SectionTitle>

      <MermaidDiagram
        title="Arhitectura Modulelor"
        chart={`
flowchart TB
    subgraph UI["🖥️ Interfața Utilizator"]
        D[Dashboard]
        O[Comenzi]
        P[Produse]
        I[Facturi]
        A[AWB]
    end

    subgraph API["⚡ API Layer"]
        AR[API Routes]
        MW[Middleware]
        AUTH[NextAuth]
    end

    subgraph SERVICES["🔧 Servicii"]
        SS[Sync Service]
        SH[Shopify Client]
        SM[SmartBill Client]
        FC[FanCourier Client]
    end

    subgraph DB["💾 Baza de Date"]
        PR[(Prisma)]
        PG[(PostgreSQL)]
    end

    D --> AR
    O --> AR
    P --> AR
    I --> AR
    A --> AR

    AR --> MW
    MW --> AUTH
    AR --> SS
    SS --> SH
    SS --> SM
    SS --> FC

    AR --> PR
    PR --> PG
        `}
      />
    </div>
  );
}

// ==================== 2. ARCHITECTURE CONTENT ====================
function ArchitectureContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Arhitectura ERP CashFlowSync este construită pe principii moderne de dezvoltare,
          cu separare clară între UI, business logic și persistență.
        </p>
      </div>

      <SectionTitle icon={<FolderTree className="h-6 w-6" />}>Structura Proiectului</SectionTitle>

      <MermaidDiagram
        title="Organizarea Fișierelor"
        chart={`
flowchart TB
    subgraph ROOT["erp-cashflowsync/"]
        subgraph SRC["src/"]
            subgraph APP["app/"]
                DASH["(dashboard)/"]
                API["api/"]
                AUTH["login/, signup/"]
            end
            subgraph COMP["components/"]
                UI["ui/"]
                DOCS["docs/"]
            end
            subgraph LIB["lib/"]
                SHOP["shopify.ts"]
                SMRT["smartbill.ts"]
                FAN["fancourier.ts"]
                SYNC["sync-service.ts"]
            end
            HOOKS["hooks/"]
            TYPES["types/"]
        end
        PRISMA["prisma/schema.prisma"]
    end
        `}
      />

      <CodeBlock
        title="Structura Detaliată"
        code={`erp-cashflowsync/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Pagini protejate (grupate)
│   │   │   ├── dashboard/            # Pagina principală
│   │   │   ├── orders/               # Modul comenzi
│   │   │   ├── products/             # Modul produse
│   │   │   ├── inventory/            # Modul inventar
│   │   │   ├── invoices/             # Modul facturi
│   │   │   ├── picking/              # Modul picking
│   │   │   ├── handover/             # Modul predare curier
│   │   │   ├── ads/                  # Modul advertising
│   │   │   ├── tracking/             # Urmărire comenzi
│   │   │   ├── settings/             # Configurări
│   │   │   ├── docs/                 # Documentație (această pagină)
│   │   │   └── ...
│   │   ├── api/                      # API Routes (50+)
│   │   │   ├── orders/               # CRUD comenzi
│   │   │   ├── invoices/             # Facturare
│   │   │   ├── awb/                  # AWB-uri
│   │   │   ├── products/             # Produse
│   │   │   ├── inventory-items/      # Inventar
│   │   │   ├── ads/                  # Advertising
│   │   │   ├── cron/                 # Jobs programate
│   │   │   ├── auth/                 # NextAuth handlers
│   │   │   └── ...
│   │   ├── login/                    # Pagina login
│   │   └── signup/                   # Pagina înregistrare
│   │
│   ├── components/                   # Componente React
│   │   ├── ui/                       # shadcn/ui (30+ componente)
│   │   ├── docs/                     # Componente documentație
│   │   └── [feature-specific]/       # Per modul
│   │
│   ├── lib/                          # Business Logic & Servicii
│   │   ├── auth.ts                   # Configurare NextAuth
│   │   ├── db.ts                     # Prisma Client
│   │   ├── permissions.ts            # Sistem RBAC
│   │   ├── shopify.ts                # Shopify API Client
│   │   ├── smartbill.ts              # SmartBill API Client
│   │   ├── fancourier.ts             # FanCourier API Client
│   │   ├── meta-ads.ts               # Meta Ads API Client
│   │   ├── tiktok-ads.ts             # TikTok Ads API Client
│   │   ├── sync-service.ts           # Serviciu sincronizare
│   │   ├── inventory-stock.ts        # Logică stoc inventar
│   │   ├── stock.ts                  # Logică stoc produse
│   │   └── ...
│   │
│   ├── hooks/                        # React Hooks Custom
│   │   ├── use-permissions.tsx       # Hook verificare permisiuni
│   │   ├── use-auto-sync.ts          # Hook sincronizare automată
│   │   └── use-toast.ts              # Hook notificări
│   │
│   └── types/                        # TypeScript Definitions
│       ├── next-auth.d.ts            # Extindere tipuri NextAuth
│       └── prisma-enums.ts           # Enum-uri din Prisma
│
├── prisma/
│   └── schema.prisma                 # Schema bază de date (80+ modele)
│
├── public/                           # Fișiere statice
└── package.json                      # Dependențe`}
      />

      <SectionTitle icon={<Puzzle className="h-6 w-6" />}>Pattern-uri de Design</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Database className="h-5 w-5" />
              Repository Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p className="mb-3">
              Prisma ORM oferă un layer de abstracție pentru toate operațiile cu baza de date.
              Query-urile complexe sunt encapsulate în funcții din <code className="bg-slate-100 px-1 rounded">/lib</code>.
            </p>
            <CodeBlock
              code={`// Exemplu din lib/db.ts
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    lineItems: true,
    invoice: true,
    awb: true,
    store: true,
  },
});`}
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Cog className="h-5 w-5" />
              Service Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p className="mb-3">
              Fiecare integrare externă are un serviciu dedicat cu funcții pure.
              Acestea gestionează autentificare, retry logic și maparea datelor.
            </p>
            <CodeBlock
              code={`// Exemplu din lib/shopify.ts
export async function syncSingleOrder(
  shopifyOrder: ShopifyOrder,
  storeId: string
): Promise<Order> {
  // Validare, transformare, persistență
}`}
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Code className="h-5 w-5" />
              API Routes (RESTful)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p className="mb-3">
              Toate endpoint-urile urmează convenții REST cu validare input,
              autorizare și error handling standardizat.
            </p>
            <CodeBlock
              code={`// Exemplu structură API route
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  const hasAccess = await hasPermission(
    session.user.id,
    "orders.view"
  );
  if (!hasAccess) return forbidden();

  // ... logică business
}`}
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Timer className="h-5 w-5" />
              CRON Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            <p className="mb-3">
              Task-uri programate pentru sincronizare automată, verificare alerte
              și cleanup. Protejate cu <code className="bg-slate-100 px-1 rounded">CRON_SECRET</code>.
            </p>
            <CodeBlock
              code={`// Exemplu CRON job
// /api/cron/sync-awb/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = "Bearer " + process.env.CRON_SECRET;
  if (authHeader !== expectedToken) {
    return unauthorized();
  }

  await updateAllAWBStatuses();
  return NextResponse.json({ success: true });
}`}
            />
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Network className="h-6 w-6" />}>Fluxul Datelor în Sistem</SectionTitle>

      <MermaidDiagram
        title="Data Flow Principal"
        chart={`
sequenceDiagram
    participant U as Utilizator
    participant UI as Frontend
    participant API as API Route
    participant MW as Middleware
    participant SVC as Service
    participant DB as Prisma/DB
    participant EXT as Serviciu Extern

    U->>UI: Acțiune (click, submit)
    UI->>API: HTTP Request
    API->>MW: Verificare sesiune
    MW->>MW: Verificare permisiuni
    MW-->>API: OK / Forbidden

    alt Operație externă
        API->>SVC: Apel serviciu
        SVC->>EXT: API Call (Shopify, SmartBill, etc.)
        EXT-->>SVC: Response
        SVC->>DB: Salvare/Update
        DB-->>SVC: Confirmare
        SVC-->>API: Rezultat
    else Operație locală
        API->>DB: Query/Mutation
        DB-->>API: Date
    end

    API-->>UI: JSON Response
    UI-->>U: Update UI
        `}
      />
    </div>
  );
}

// ==================== 3. ORDERS CONTENT ====================
function OrdersContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Modulul de comenzi este inima sistemului ERP. Gestionează importul comenzilor
          din multiple surse, validarea, procesarea și urmărirea lor până la livrare.
        </p>
      </div>

      <SectionTitle icon={<GitMerge className="h-6 w-6" />}>Surse de Comenzi</SectionTitle>

      <BoxDiagram
        title="Canale de Vânzare Integrate"
        items={[
          {
            label: "Shopify",
            description: "Webhook + API sync",
            color: "bg-green-50 border-green-300",
            icon: <Store className="h-5 w-5 text-green-600" />
          },
          {
            label: "Trendyol",
            description: "CRON sync periodic",
            color: "bg-orange-50 border-orange-300",
            icon: <Globe className="h-5 w-5 text-orange-600" />
          },
          {
            label: "Manual",
            description: "Creare din ERP",
            color: "bg-slate-50 border-slate-300",
            icon: <Plus className="h-5 w-5 text-slate-600" />
          },
        ]}
        columns={3}
      />

      <SectionTitle icon={<Workflow className="h-6 w-6" />}>Ciclul de Viață al unei Comenzi</SectionTitle>

      <MermaidDiagram
        title="Statusuri și Tranziții"
        chart={`
stateDiagram-v2
    [*] --> PENDING: Comandă nouă

    PENDING --> VALIDATED: Validare OK
    PENDING --> VALIDATION_FAILED: Date invalide

    VALIDATION_FAILED --> VALIDATED: Corectare date

    VALIDATED --> INVOICE_PENDING: Procesare
    INVOICE_PENDING --> INVOICE_ERROR: Eroare SmartBill
    INVOICE_PENDING --> INVOICED: Factură emisă

    INVOICE_ERROR --> INVOICE_PENDING: Retry

    INVOICED --> AWB_PENDING: Generare AWB
    AWB_PENDING --> AWB_ERROR: Eroare FanCourier
    AWB_PENDING --> PICKING: AWB generat

    AWB_ERROR --> AWB_PENDING: Retry

    PICKING --> PACKED: Coletare completă
    PACKED --> SHIPPED: Predat curier

    SHIPPED --> DELIVERED: Livrat client
    SHIPPED --> RETURNED: Refuzat/Retur

    VALIDATED --> CANCELLED: Anulare
    INVOICED --> CANCELLED: Anulare + Storno

    DELIVERED --> [*]
    RETURNED --> [*]
    CANCELLED --> [*]
        `}
      />

      <SubSection title="Toate Statusurile Disponibile" icon={<Tags className="h-5 w-5" />}>
        <div className="flex flex-wrap gap-2">
          {[
            { status: "PENDING", color: "bg-slate-100 border-slate-300", desc: "Comandă nouă, nevalidată" },
            { status: "VALIDATED", color: "bg-blue-100 border-blue-300", desc: "Date validate, pregătită pentru procesare" },
            { status: "VALIDATION_FAILED", color: "bg-red-100 border-red-300", desc: "Date invalide (telefon, adresă)" },
            { status: "INVOICE_PENDING", color: "bg-yellow-100 border-yellow-300", desc: "În curs de facturare" },
            { status: "INVOICE_ERROR", color: "bg-red-100 border-red-300", desc: "Eroare la emitere factură" },
            { status: "INVOICED", color: "bg-purple-100 border-purple-300", desc: "Factură emisă cu succes" },
            { status: "AWB_PENDING", color: "bg-yellow-100 border-yellow-300", desc: "În curs de generare AWB" },
            { status: "AWB_ERROR", color: "bg-red-100 border-red-300", desc: "Eroare la generare AWB" },
            { status: "PICKING", color: "bg-cyan-100 border-cyan-300", desc: "În picking, pregătire colet" },
            { status: "PACKED", color: "bg-teal-100 border-teal-300", desc: "Colet pregătit, nescanat" },
            { status: "SHIPPED", color: "bg-orange-100 border-orange-300", desc: "Predat curier, în tranzit" },
            { status: "DELIVERED", color: "bg-green-100 border-green-300", desc: "Livrat cu succes" },
            { status: "RETURNED", color: "bg-pink-100 border-pink-300", desc: "Returnat sau refuzat" },
            { status: "CANCELLED", color: "bg-gray-100 border-gray-300", desc: "Comandă anulată" },
          ].map((s, i) => (
            <div key={i} className="group relative">
              <Badge className={cn("cursor-help", s.color)}>{s.status}</Badge>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      <SectionTitle icon={<RefreshCw className="h-6 w-6" />}>Procesare Automată</SectionTitle>

      <InfoBox variant="info" title="Ce se întâmplă când apeși 'Procesează'">
        Procesarea unei comenzi declanșează o serie de acțiuni automate care
        transformă comanda din VALIDATED în SHIPPED.
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProcessCard
          number={1}
          title="Verificare Stoc"
          description="Se verifică dacă toate produsele din comandă sunt în stoc."
          details={[
            "Verificare stoc pentru produse simple",
            "Verificare componente pentru produse compuse (rețete)",
            "Alertare dacă stoc insuficient",
          ]}
          color="blue"
        />
        <ProcessCard
          number={2}
          title="Emitere Factură"
          description="Se emite factura în SmartBill cu datele clientului."
          details={[
            "Determinare serie facturare (per magazin/canal)",
            "Trimitere către SmartBill API",
            "Descărcare și salvare PDF",
            "Actualizare tag în Shopify",
          ]}
          color="purple"
        />
        <ProcessCard
          number={3}
          title="Decrementare Stoc"
          description="Se scade stocul pentru toate produsele comandate."
          details={[
            "Creare StockMovement pentru audit",
            "Decrementare stoc simple products",
            "Decrementare componente pentru rețete",
          ]}
          color="green"
        />
        <ProcessCard
          number={4}
          title="Generare AWB"
          description="Se generează AWB în FanCourier cu datele de livrare."
          details={[
            "Validare finală adresă și telefon",
            "Determinare serviciu (Standard / Cont Colector)",
            "Trimitere către FanCourier API",
            "Creare job printare automată (dacă e configurat)",
          ]}
          color="orange"
        />
      </div>

      <SectionTitle icon={<Zap className="h-6 w-6" />}>Validarea Comenzilor</SectionTitle>

      <MermaidDiagram
        title="Procesul de Validare"
        chart={`
flowchart TB
    START([Comandă Nouă]) --> V1{Telefon valid?}

    V1 -->|Da| V2{Adresă completă?}
    V1 -->|Nu| FAIL1[VALIDATION_FAILED]

    V2 -->|Da| V3{Județ valid?}
    V2 -->|Nu| FAIL2[VALIDATION_FAILED]

    V3 -->|Da| V4{Localitate validă?}
    V3 -->|Nu| FAIL3[VALIDATION_FAILED]

    V4 -->|Da| SUCCESS([VALIDATED])
    V4 -->|Nu| FAIL4[VALIDATION_FAILED]

    FAIL1 --> NOTIFY[Notificare operator]
    FAIL2 --> NOTIFY
    FAIL3 --> NOTIFY
    FAIL4 --> NOTIFY

    NOTIFY --> MANUAL[Corectare manuală]
    MANUAL --> START
        `}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Validări Aplicate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-500" />
                <span><strong>Telefon:</strong> Format 07XXXXXXXX (10 cifre)</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span><strong>Adresă:</strong> Minimum strada și numărul</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span><strong>Județ:</strong> Nomenclator FanCourier valid</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-slate-500" />
                <span><strong>Localitate:</strong> Nomenclator FanCourier valid</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Erori Frecvente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span><strong>Telefon lipsă:</strong> Clientul nu a completat telefonul</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span><strong>Format telefon:</strong> +40 sau 0040 în loc de 07</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span><strong>Județ invalid:</strong> "Bucuresti" în loc de "București"</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span><strong>Adresă incompletă:</strong> Lipsește strada sau numărul</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Link2 className="h-6 w-6" />}>Relația cu Alte Module</SectionTitle>

      <MermaidDiagram
        title="Dependențe între Module"
        chart={`
flowchart LR
    subgraph ORDER["Comandă"]
        O[Order]
        LI[LineItems]
    end

    subgraph PRODUCTS["Produse"]
        MP[MasterProduct]
        INV[InventoryItem]
    end

    subgraph FINANCE["Financiar"]
        INV2[Invoice]
        IS[InvoiceSeries]
    end

    subgraph SHIPPING["Livrare"]
        AWB[AWB]
        HS[HandoverSession]
    end

    subgraph PICKING["Picking"]
        PL[PickingList]
        PLI[PickingListItem]
    end

    O --> LI
    LI --> MP
    MP --> INV

    O --> INV2
    INV2 --> IS

    O --> AWB
    AWB --> HS

    O --> PL
    PL --> PLI
    PLI --> MP
        `}
      />
    </div>
  );
}
// ==================== 4. PRODUCTS & INVENTORY CONTENT ====================
function ProductsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Sistemul de produse și inventar gestionează catalogul complet de articole,
          stocul multi-locație și produsele compuse (rețete).
        </p>
      </div>

      <SectionTitle icon={<Layers3 className="h-6 w-6" />}>Structura Produselor</SectionTitle>

      <InfoBox variant="info" title="Sistem Dual de Stoc">
        ERP-ul folosește două sisteme de stoc paralele: <strong>Product</strong> (legacy, simplu)
        și <strong>InventoryItem</strong> (nou, cu suport pentru loturi și rețete).
        Ambele sunt sincronizate la vânzare.
      </InfoBox>

      <MermaidDiagram
        title="Ierarhia Produselor"
        chart={`
erDiagram
    MasterProduct ||--o{ MasterProductChannel : "publicat pe"
    MasterProduct ||--o{ ProductRecipe : "component în"
    MasterProduct ||--o| InventoryItem : "mapare stoc"
    MasterProduct ||--o{ LineItem : "în comenzi"
    MasterProduct }o--|| Category : "aparține"

    Channel ||--o{ MasterProductChannel : "conține"

    InventoryItem ||--o{ InventoryRecipeComponent : "în rețete"
    InventoryItem ||--o{ InventoryStockMovement : "mișcări"
    InventoryItem }o--o| Supplier : "furnizat de"

    MasterProduct {
        string id PK
        string sku UK
        string barcode
        string title
        decimal price
        int stockQuantity
        string location
        float weight
        boolean isActive
    }

    InventoryItem {
        string id PK
        string sku UK
        string name
        int currentStock
        int minStock
        decimal costPrice
        string unit
        boolean isComposite
        boolean isActive
    }

    Channel {
        string id PK
        string name
        enum type
        boolean isActive
    }
        `}
      />

      <SubSection title="Tipuri de Produse" icon={<Box className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                <Box className="h-5 w-5" />
                Produs Simplu
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p className="mb-2">Un singur articol cu SKU unic. Stocul se decrementează direct la vânzare.</p>
              <div className="bg-blue-50 p-2 rounded text-xs font-mono">
                SKU: PAT-DORMITOR-001<br/>
                Stoc: 15 buc
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-green-700">
                <Component className="h-5 w-5" />
                Produs Compus (Rețetă)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p className="mb-2">Format din mai multe componente. La vânzare se decrementează componentele.</p>
              <div className="bg-green-50 p-2 rounded text-xs font-mono">
                SKU: SET-DORMITOR<br/>
                = 1x PAT + 2x NOPTIERĂ + 1x DULAP
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                <Layers className="h-5 w-5" />
                Variantă
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p className="mb-2">Produs cu variante (culoare, mărime). Fiecare variantă are SKU propriu.</p>
              <div className="bg-purple-50 p-2 rounded text-xs font-mono">
                PAT-001-ALB (Alb)<br/>
                PAT-001-NEGRU (Negru)
              </div>
            </CardContent>
          </Card>
        </div>
      </SubSection

      <SectionTitle icon={<Boxes className="h-6 w-6" />}>Gestionarea Stocului</SectionTitle>

      <MermaidDiagram
        title="Fluxul Stocului"
        chart={`
flowchart TB
    subgraph INPUT["📥 Intrări Stoc"]
        R[Recepție Marfă]
        A[Ajustare +]
        T[Transfer intrare]
        RET[Retur client]
    end

    subgraph STOCK["Stoc Curent"]
        INV[InventoryItem.currentStock]
    end

    subgraph OUTPUT["📤 Ieșiri Stoc"]
        S[Vânzare]
        AM[Ajustare -]
        TO[Transfer ieșire]
    end

    R --> |+qty| INV
    A --> |+qty| INV
    T --> |+qty| INV
    RET --> |+qty| INV

    INV --> |-qty| S
    INV --> |-qty| AM
    INV --> |-qty| TO

    subgraph LOG["Audit"]
        SM[StockMovement]
        ISM[InventoryStockMovement]
    end

    INV --> |log| SM
    INV --> |log| ISM
        `}
      />

      <SubSection title="Tipuri de Mișcări Stoc" icon={<ArrowLeftRight className="h-5 w-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: "RECEIPT", label: "Recepție", desc: "NIR de la furnizor", color: "bg-green-100 border-green-300", icon: <ArrowDownRight className="h-4 w-4" /> },
            { type: "SALE", label: "Vânzare", desc: "Comandă procesată", color: "bg-blue-100 border-blue-300", icon: <ArrowUpRight className="h-4 w-4" /> },
            { type: "ADJUSTMENT_PLUS", label: "Ajustare +", desc: "Corecție inventar", color: "bg-teal-100 border-teal-300", icon: <Plus className="h-4 w-4" /> },
            { type: "ADJUSTMENT_MINUS", label: "Ajustare -", desc: "Corecție inventar", color: "bg-orange-100 border-orange-300", icon: <Minus className="h-4 w-4" /> },
            { type: "RECIPE_OUT", label: "Rețetă", desc: "Component în set", color: "bg-purple-100 border-purple-300", icon: <Component className="h-4 w-4" /> },
            { type: "RETURN", label: "Retur", desc: "Produs returnat", color: "bg-pink-100 border-pink-300", icon: <RotateCcw className="h-4 w-4" /> },
            { type: "TRANSFER", label: "Transfer", desc: "Între depozite", color: "bg-cyan-100 border-cyan-300", icon: <ArrowLeftRight className="h-4 w-4" /> },
          ].map((m, i) => (
            <div key={i} className={cn("p-3 rounded-lg border text-center", m.color)}>
              <div className="flex justify-center mb-2">{m.icon}</div>
              <p className="font-semibold text-sm">{m.label}</p>
              <p className="text-xs text-slate-600">{m.desc}</p>
              <Badge variant="outline" className="mt-2 text-xs">{m.type}</Badge>
            </div>
          ))}
        </div>
      </SubSection>

      <SectionTitle icon={<Component className="h-6 w-6" />}>Produse Compuse (Rețete)</SectionTitle>

      <InfoBox variant="tip" title="Cum funcționează rețetele">
        Când vinzi un produs compus (ex: SET-DORMITOR), sistemul decrementează automat
        stocul pentru TOATE componentele din rețetă, nu pentru produsul părinte.
      </InfoBox>

      <MermaidDiagram
        title="Exemplu Rețetă"
        chart={`
flowchart LR
    subgraph PARENT["🛏️ SET-DORMITOR"]
        P[Preț: 5000 RON]
    end

    subgraph COMPONENTS["Componente"]
        C1["PAT-001 x1"]
        C2["NOPTIERA-001 x2"]
        C3["DULAP-001 x1"]
    end

    subgraph STOCK["Impact Stoc"]
        S1["PAT: -1"]
        S2["NOPTIERĂ: -2"]
        S3["DULAP: -1"]
    end

    P --> C1
    P --> C2
    P --> C3

    C1 --> S1
    C2 --> S2
    C3 --> S3
        `}
      />

      <CodeBlock
        title="Structura unei Rețete în Baza de Date"
        code={`// InventoryItem (produs compus)
{
  "sku": "SET-DORMITOR",
  "name": "Set Mobilă Dormitor Complet",
  "isComposite": true,
  "currentStock": 0, // Nu contează, se calculează din componente

  // Componente (InventoryRecipeComponent)
  "recipeComponents": [
    { "componentSku": "PAT-001", "quantity": 1 },
    { "componentSku": "NOPTIERA-001", "quantity": 2 },
    { "componentSku": "DULAP-001", "quantity": 1 }
  ]
}

// La vânzare, funcția deductInventoryStock():
// 1. Detectează că este produs compus
// 2. Iterează prin recipeComponents
// 3. Pentru fiecare: decrementează stocul componentului
// 4. Creează InventoryStockMovement pentru audit`}
      />

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Alerte Stoc Scăzut</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              Cum Funcționează
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p className="mb-3">
              Fiecare articol din inventar are un <code className="bg-slate-100 px-1 rounded">minStock</code> configurat.
              Când <code className="bg-slate-100 px-1 rounded">currentStock ≤ minStock</code>, se generează alertă.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                <span>PAT-001</span>
                <span className="font-mono">Stoc: 3 / Min: 5</span>
                <Badge className="bg-amber-100 text-amber-800">-2 lipsă</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <span>DULAP-002</span>
                <span className="font-mono">Stoc: 0 / Min: 3</span>
                <Badge className="bg-red-100 text-red-800">-3 lipsă</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Acțiuni Automate
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Notificare în dashboard cu lista articolelor</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Badge pe sidebar pentru numărul de alerte</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Email zilnic cu rezumatul (configurabil)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Blocare procesare comandă dacă stoc 0</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Sincronizare Multi-Canal</SectionTitle>

      <MermaidDiagram
        title="Sincronizare Produse cu Canale"
        chart={`
flowchart TB
    subgraph MASTER["MasterProduct"]
        MP[SKU: PAT-001<br/>Preț: 2500 RON<br/>Stoc: 15]
    end

    subgraph CHANNELS["📡 Canale"]
        CH1[Shopify Store 1]
        CH2[Shopify Store 2]
        CH3[Trendyol]
    end

    subgraph MAPPING["🔗 MasterProductChannel"]
        M1["isPublished: true<br/>externalId: 123456<br/>priceOverride: null"]
        M2["isPublished: true<br/>externalId: 789012<br/>priceOverride: 2400"]
        M3["isPublished: false<br/>externalId: null"]
    end

    MP --> M1 --> CH1
    MP --> M2 --> CH2
    MP --> M3 --> CH3

    style M3 fill:#fee2e2
        `}
      />
    </div>
  );
}

// ==================== 5. INVOICES CONTENT ====================
function InvoicesContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Modulul de facturare integrează SmartBill pentru emiterea automată a facturilor,
          gestionarea seriilor și urmărirea plăților.
        </p>
      </div>

      <SectionTitle icon={<FileText className="h-6 w-6" />}>Fluxul de Facturare</SectionTitle>

      <MermaidDiagram
        title="Procesul Complet de Facturare"
        chart={`
sequenceDiagram
    participant ERP as ERP CashFlowSync
    participant SB as SmartBill API
    participant DB as Baza de Date
    participant SH as Shopify

    ERP->>ERP: Selectare comandă VALIDATED
    ERP->>ERP: Determinare serie facturare
    ERP->>ERP: Construire payload factură

    ERP->>SB: POST /invoice
    SB->>SB: Validare date
    SB->>SB: Generare număr factură
    SB-->>ERP: { number, series, success }

    ERP->>SB: GET /invoice/pdf
    SB-->>ERP: PDF binary

    ERP->>DB: Salvare Invoice + PDF
    ERP->>DB: Actualizare Order.status = INVOICED
    ERP->>DB: Creare StockMovements

    ERP->>SH: Adăugare tag "Facturat: SERIE-NR"
    SH-->>ERP: OK
        `}
      />

      <SubSection title="Serii de Facturare" icon={<Hash className="h-5 w-5" />}>
        <InfoBox variant="info" title="Ce sunt seriile de facturare">
          Fiecare canal de vânzare poate avea o serie proprie de facturare.
          Seria determină prefixul și numerotarea facturilor.
        </InfoBox>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { prefix: "SHOP", name: "Shopify Principal", color: "bg-green-100 border-green-300" },
            { prefix: "TRND", name: "Trendyol", color: "bg-orange-100 border-orange-300" },
            { prefix: "ERP", name: "Manual/Intern", color: "bg-blue-100 border-blue-300" },
            { prefix: "B2B", name: "Business to Business", color: "bg-purple-100 border-purple-300" },
          ].map((s, i) => (
            <div key={i} className={cn("p-4 rounded-lg border text-center", s.color)}>
              <p className="font-mono font-bold text-xl">{s.prefix}</p>
              <p className="text-sm text-slate-600 mt-1">{s.name}</p>
              <p className="text-xs text-slate-500 mt-2">Ex: {s.prefix}-00001</p>
            </div>
          ))}
        </div>
      </SubSection>

      <MermaidDiagram
        title="Logica Determinării Seriei"
        chart={`
flowchart TB
    START([Comandă de facturat]) --> Q1{Este Trendyol?}

    Q1 -->|Da| TRND[Folosește Settings.trendyolInvoiceSeries]
    Q1 -->|Nu| Q2{Store are serie?}

    Q2 -->|Da| STORE[Folosește Store.invoiceSeries]
    Q2 -->|Nu| Q3{Există serie default?}

    Q3 -->|Da| DEFAULT[Folosește InvoiceSeries.isDefault = true]
    Q3 -->|Nu| FALLBACK[Folosește Settings.invoiceSeries]

    TRND --> EMIT([Emite factură cu seria aleasă])
    STORE --> EMIT
    DEFAULT --> EMIT
    FALLBACK --> EMIT
        `}
      />

      <SectionTitle icon={<CreditCard className="h-6 w-6" />}>Statusuri Plată</SectionTitle>

      <div className="flex flex-wrap gap-3">
        {[
          { status: "UNPAID", label: "Neplătită", color: "bg-slate-100 border-slate-300", desc: "Factură emisă, neplătită" },
          { status: "PAID", label: "Plătită", color: "bg-green-100 border-green-300", desc: "Plată confirmată" },
          { status: "PARTIAL", label: "Parțial", color: "bg-amber-100 border-amber-300", desc: "Plată parțială primită" },
          { status: "OVERDUE", label: "Scadentă", color: "bg-red-100 border-red-300", desc: "Termen depășit" },
          { status: "CANCELLED", label: "Anulată", color: "bg-gray-100 border-gray-300", desc: "Factură stornată" },
        ].map((s, i) => (
          <div key={i} className={cn("px-4 py-3 rounded-lg border", s.color)}>
            <p className="font-semibold">{s.label}</p>
            <p className="text-xs text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Erori Frecvente SmartBill</SectionTitle>

      <div className="space-y-3">
        {[
          {
            error: "Cota TVA invalidă",
            cause: "Produsul are un cod TVA inexistent în SmartBill",
            solution: "Verifică nomenclatorul TVA în SmartBill și actualizează produsul"
          },
          {
            error: "Serie inexistentă",
            cause: "Seria de facturare nu este configurată în SmartBill",
            solution: "Creează seria în SmartBill sau folosește o serie existentă"
          },
          {
            error: "Cod produs invalid",
            cause: "SKU-ul produsului conține caractere neacceptate",
            solution: "Simplifică SKU-ul sau mapează-l în SmartBill"
          },
          {
            error: "Client invalid",
            cause: "Date incomplete client (nume, adresă)",
            solution: "Completează datele clientului în comandă"
          },
        ].map((e, i) => (
          <Card key={i} className="border-l-4 border-l-red-400">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-700">{e.error}</p>
                  <p className="text-sm text-slate-600 mt-1"><strong>Cauză:</strong> {e.cause}</p>
                  <p className="text-sm text-green-700 mt-1"><strong>Soluție:</strong> {e.solution}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== 6. SHIPPING CONTENT ====================
function ShippingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Modulul de livrare gestionează generarea AWB-urilor prin FanCourier,
          tracking-ul în timp real și predarea coletelor.
        </p>
      </div>

      <SectionTitle icon={<Truck className="h-6 w-6" />}>Generare AWB</SectionTitle>

      <MermaidDiagram
        title="Procesul de Generare AWB"
        chart={`
sequenceDiagram
    participant ERP as ERP
    participant FC as FanCourier API
    participant DB as Database
    participant PR as Printer

    ERP->>ERP: Validare date livrare
    Note over ERP: Telefon, adresă, județ, localitate

    ERP->>FC: POST /intern-awb
    Note over FC: Creare AWB interior

    FC-->>ERP: { awbNumber, trackingUrl }

    ERP->>DB: Salvare AWB în baza de date
    ERP->>DB: Actualizare Order.status

    alt AutoPrint activat
        ERP->>FC: GET /awb/label (PDF/ZPL)
        FC-->>ERP: Label binary
        ERP->>PR: Creare PrintJob
        PR->>PR: Print label A6
    end
        `}
      />

      <SubSection title="Servicii FanCourier Disponibile" icon={<Settings className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Truck className="h-5 w-5" />
                Standard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>Livrare standard fără ramburs. Clientul a plătit online.</p>
              <ul className="mt-2 space-y-1">
                <li>• Plătitor expeditor</li>
                <li>• Fără colectare ramburs</li>
                <li>• Livrare 24-48h</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Banknote className="h-5 w-5" />
                Cont Colector
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>Livrare cu ramburs. Curierul colectează banii.</p>
              <ul className="mt-2 space-y-1">
                <li>• Plătitor destinatar (ramburs)</li>
                <li>• Colectare suma comandă</li>
                <li>• Transfer în cont după livrare</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SubSection>

      <SectionTitle icon={<Activity className="h-6 w-6" />}>Statusuri AWB</SectionTitle>

      <MermaidDiagram
        title="Ciclul de Viață AWB"
        chart={`
stateDiagram-v2
    [*] --> C0: AWB creat

    C0 --> C1: Ridicat de curier
    C1 --> H: În tranzit/depozit

    H --> S1: În livrare
    S1 --> S2: Livrat
    S1 --> S6: Refuzat
    S1 --> S3: Nu răspunde

    S3 --> S1: Reîncercare
    S6 --> RETUR: Retur în curs

    S2 --> [*]: Finalizat
    RETUR --> [*]: Returnat

    state H {
        H0: Sosit depozit
        H1: Plecat depozit
        H0 --> H1
    }
        `}
      />

      <SubSection title="Mapare Coduri FanCourier" icon={<Code className="h-5 w-5" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 text-left">Cod FC</th>
                <th className="p-3 text-left">Descriere</th>
                <th className="p-3 text-left">Status ERP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { code: "C0, C1", desc: "Ridicat de curier", status: "SHIPPED", color: "bg-orange-100" },
                { code: "H0-H17", desc: "În tranzit / depozit", status: "SHIPPED", color: "bg-orange-100" },
                { code: "S1", desc: "În livrare", status: "SHIPPED", color: "bg-orange-100" },
                { code: "S2", desc: "Livrat", status: "DELIVERED", color: "bg-green-100" },
                { code: "S6, S43, S50", desc: "Refuzat / Retur", status: "RETURNED", color: "bg-pink-100" },
                { code: "A0-A4", desc: "Anulat", status: "CANCELLED", color: "bg-gray-100" },
              ].map((r, i) => (
                <tr key={i}>
                  <td className="p-3 font-mono">{r.code}</td>
                  <td className="p-3">{r.desc}</td>
                  <td className="p-3"><Badge className={r.color}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubSection>

      <SectionTitle icon={<AlertTriangle className="h-6 w-6" />}>Erori Frecvente FanCourier</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { error: "Locality is invalid", solution: "Verifică nomenclatorul FanCourier pentru localitate" },
          { error: "County is invalid", solution: "Folosește numele oficial (București, nu Bucuresti)" },
          { error: "Phone is invalid", solution: "Format corect: 07XXXXXXXX (fără +40)" },
          { error: "Street is required", solution: "Completează câmpul adresă cu stradă și număr" },
        ].map((e, i) => (
          <Card key={i} className="border-l-4 border-l-amber-400">
            <CardContent className="p-4">
              <p className="font-mono text-red-600 text-sm">{e.error}</p>
              <p className="text-sm text-slate-600 mt-2">
                <strong>Soluție:</strong> {e.solution}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== 7. PICKING & HANDOVER CONTENT ====================
function PickingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Modulele de Picking și Handover gestionează pregătirea coletelor în depozit
          și predarea lor către curier.
        </p>
      </div>

      <SectionTitle icon={<ClipboardList className="h-6 w-6" />}>Sistemul de Picking</SectionTitle>

      <MermaidDiagram
        title="Fluxul de Picking"
        chart={`
flowchart TB
    subgraph INPUT["📥 Comenzi"]
        O1[Comandă 1]
        O2[Comandă 2]
        O3[Comandă 3]
    end

    subgraph PICKING["Picking List"]
        PL[Lista Picking<br/>Status: IN_PROGRESS]
        PLI1["PAT-001 x3<br/>(1+1+1)"]
        PLI2["SALTEA-002 x2<br/>(1+1)"]
        PLI3["PERNA-003 x5<br/>(2+2+1)"]
    end

    subgraph ACTIONS["✅ Acțiuni"]
        A1[Scanare produs]
        A2[Bifaj manual]
        A3[Ajustare cantitate]
    end

    subgraph OUTPUT["Rezultat"]
        R1[Colet 1 pregătit]
        R2[Colet 2 pregătit]
        R3[Colet 3 pregătit]
    end

    O1 --> PL
    O2 --> PL
    O3 --> PL

    PL --> PLI1
    PL --> PLI2
    PL --> PLI3

    PLI1 --> A1
    PLI2 --> A2
    PLI3 --> A3

    A1 --> R1
    A2 --> R2
    A3 --> R3
        `}
      />

      <SubSection title="Statusuri Picking" icon={<Tags className="h-5 w-5" />}>
        <div className="flex flex-wrap gap-3">
          {[
            { status: "PENDING", label: "În așteptare", color: "bg-slate-100", desc: "Listă creată, neprocesată" },
            { status: "IN_PROGRESS", label: "În lucru", color: "bg-blue-100", desc: "Operator lucrează la ea" },
            { status: "COMPLETED", label: "Finalizată", color: "bg-green-100", desc: "Toate produsele pregătite" },
            { status: "CANCELLED", label: "Anulată", color: "bg-red-100", desc: "Listă anulată" },
          ].map((s, i) => (
            <div key={i} className={cn("px-4 py-3 rounded-lg border border-slate-200", s.color)}>
              <Badge variant="outline">{s.status}</Badge>
              <p className="font-semibold mt-2">{s.label}</p>
              <p className="text-xs text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </SubSection>

      <SectionTitle icon={<Hand className="h-6 w-6" />}>Predare Curier (Handover)</SectionTitle>

      <MermaidDiagram
        title="Fluxul de Predare"
        chart={`
flowchart LR
    subgraph SESSION["Sesiune Predare"]
        S[HandoverSession<br/>Status: OPEN]
    end

    subgraph SCAN["📱 Scanare"]
        SC1[Scan AWB 1]
        SC2[Scan AWB 2]
        SC3[Scan AWB 3]
    end

    subgraph RESULT["✅ Rezultat"]
        R[Raport predare<br/>Total: 3 colete<br/>Ramburs: 1500 RON]
    end

    SC1 --> S
    SC2 --> S
    SC3 --> S

    S --> |Finalizare| R
        `}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-blue-600" />
              Cum se face predarea
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">1</span>
                <span>Deschide sesiune nouă de predare</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">2</span>
                <span>Scanează fiecare AWB cu scanner-ul</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">3</span>
                <span>Verifică lista de colete scanate</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">4</span>
                <span>Finalizează și generează raportul</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Raportul de Predare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Total colete predate
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Valoare ramburs de colectat
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Lista AWB-urilor cu detalii
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Timestamp-uri pentru audit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Export Excel disponibil
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <InfoBox variant="warning" title="Finalizare Automată la Miezul Nopții">
        La ora 00:00, toate sesiunile de handover deschise sunt finalizate automat.
        Coletele nescanate primesc statusul <Badge variant="outline">NEPREDAT</Badge> și
        apar în raportul de excepții.
      </InfoBox>
    </div>
  );
}
// ==================== 8. ADVERTISING CONTENT ====================
function AdvertisingContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Modulul de Advertising integrează Meta Ads și TikTok Ads pentru gestionarea
          campaniilor, tracking performance și alerte automate.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <StatusBadge status="active">Meta Ads</StatusBadge>
        <StatusBadge status="active">TikTok Ads</StatusBadge>
        <StatusBadge status="planned">Google Ads</StatusBadge>
      </div>

      <SectionTitle icon={<Layers className="h-6 w-6" />}>Arhitectura Modulului</SectionTitle>

      <MermaidDiagram
        title="Structura Entităților Advertising"
        chart={`
erDiagram
    AdsAccount ||--o{ AdsCampaign : "conține"
    AdsAccount ||--o{ AdsPixel : "are"
    AdsAccount }o--|| AdsApp : "conectat prin"

    AdsCampaign ||--o{ AdsAdSet : "conține"
    AdsCampaign ||--o{ AdsDailyStats : "statistici"
    AdsCampaign ||--o{ AdsCampaignProduct : "produse"
    AdsCampaign ||--o{ AdsAlert : "alerte"

    AdsAdSet ||--o{ AdsAd : "conține"

    AdsAlertRule ||--o{ AdsAlert : "generează"

    AdsAccount {
        string id PK
        enum platform
        string name
        string accessToken
        enum status
        datetime tokenExpiresAt
    }

    AdsCampaign {
        string id PK
        string externalId
        string name
        enum status
        decimal dailyBudget
        decimal spend
        decimal roas
    }

    AdsAlertRule {
        string id PK
        string name
        enum scope
        json conditions
        enum action
        boolean autoRollback
    }
        `}
      />

      <SectionTitle icon={<Key className="h-6 w-6" />}>Conectare OAuth</SectionTitle>

      <MermaidDiagram
        title="Fluxul OAuth pentru Meta/TikTok"
        chart={`
sequenceDiagram
    participant U as Utilizator
    participant ERP as ERP
    participant AUTH as OAuth Provider
    participant API as Meta/TikTok API

    U->>ERP: Click "Conectează Meta"
    ERP->>ERP: Generare state token
    ERP->>AUTH: Redirect cu App ID + scopes
    U->>AUTH: Login + Approve permissions
    AUTH->>ERP: Redirect cu authorization code
    ERP->>API: Exchange code for token
    API-->>ERP: Access Token + Refresh Token
    ERP->>ERP: Salvare în AdsAccount
    ERP-->>U: Cont conectat cu succes!
        `}
      />

      <SubSection title="Configurare Aplicații" icon={<Settings className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Globe className="h-5 w-5" />
                Meta Ads Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <ol className="space-y-2">
                <li>1. Creează App în Meta for Developers</li>
                <li>2. Configurează Facebook Login</li>
                <li>3. Adaugă permisiuni: ads_management, ads_read</li>
                <li>4. Setează Redirect URI în ERP</li>
                <li>5. Copiază App ID și Secret în Settings</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-pink-700">
                <Globe className="h-5 w-5" />
                TikTok Ads Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <ol className="space-y-2">
                <li>1. Creează App în TikTok for Business</li>
                <li>2. Solicită acces Marketing API</li>
                <li>3. Configurează OAuth credentials</li>
                <li>4. Setează Redirect URI în ERP</li>
                <li>5. Copiază App ID și Secret în Settings</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </SubSection>

      <SectionTitle icon={<Target className="h-6 w-6" />}>Convenție Denumire Campanii</SectionTitle>

      <InfoBox variant="tip" title="Auto-parsing SKU din nume campanie">
        Sistemul parsează automat SKU-urile din numele campaniilor pentru a aloca
        corect vânzările și a calcula ROAS per produs.
      </InfoBox>

      <div className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-center text-lg my-4">
        CONV_SKU_<span className="text-green-400">[PAT001]</span>_<span className="text-blue-400">[SALTEA002]</span>_BROAD_2026Q1
      </div>

      <div className="grid grid-cols-5 gap-3 text-center">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-bold">CONV</p>
          <p className="text-xs text-slate-600">Obiectiv</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="font-bold">SKU</p>
          <p className="text-xs text-slate-600">Tip campanie</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="font-bold">[COD]</p>
          <p className="text-xs text-slate-600">SKU produse</p>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <p className="font-bold">BROAD</p>
          <p className="text-xs text-slate-600">Targeting</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="font-bold">2026Q1</p>
          <p className="text-xs text-slate-600">Perioadă</p>
        </div>
      </div>

      <SectionTitle icon={<Bell className="h-6 w-6" />}>Sistemul de Alerte</SectionTitle>

      <MermaidDiagram
        title="Fluxul de Alertare"
        chart={`
flowchart TB
    subgraph CRON["⏰ CRON Job (15 min)"]
        C[Verificare Reguli]
    end

    subgraph RULES["Reguli Alerte"]
        R1["CPA > 50 RON"]
        R2["ROAS < 2.0"]
        R3["CTR < 0.5%"]
    end

    subgraph EVAL["🔍 Evaluare"]
        E[Comparare metrici<br/>cu praguri]
    end

    subgraph ACTIONS["⚡ Acțiuni"]
        A1[NOTIFY - Email/Notificare]
        A2[PAUSE - Pauză campanie]
        A3[REDUCE_BUDGET - Scade 20%]
    end

    subgraph ROLLBACK["↩️ Auto-Rollback"]
        RB[După X ore<br/>reactivare automată]
    end

    C --> R1
    C --> R2
    C --> R3

    R1 --> E
    R2 --> E
    R3 --> E

    E --> |Condiție îndeplinită| A1
    E --> |Condiție îndeplinită| A2
    E --> |Condiție îndeplinită| A3

    A2 --> RB
    A3 --> RB
        `}
      />

      <SubSection title="Metrici Monitorizate" icon={<BarChart className="h-5 w-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { metric: "spend", label: "Cheltuieli", desc: "Total cheltuit" },
            { metric: "cpa", label: "CPA", desc: "Cost per Achiziție" },
            { metric: "roas", label: "ROAS", desc: "Return on Ad Spend" },
            { metric: "ctr", label: "CTR", desc: "Click Through Rate" },
            { metric: "cpm", label: "CPM", desc: "Cost per Mille" },
            { metric: "cpc", label: "CPC", desc: "Cost per Click" },
            { metric: "frequency", label: "Frecvență", desc: "Afișări per user" },
            { metric: "conversions", label: "Conversii", desc: "Număr achiziții" },
          ].map((m, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg border">
              <Badge variant="outline" className="mb-2">{m.metric}</Badge>
              <p className="font-semibold">{m.label}</p>
              <p className="text-xs text-slate-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Acțiuni Disponibile" icon={<Zap className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-200">
            <CardContent className="p-4 text-center">
              <Bell className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="font-bold">NOTIFY</p>
              <p className="text-sm text-slate-600">Trimite notificare fără a modifica campania</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-200">
            <CardContent className="p-4 text-center">
              <Pause className="h-8 w-8 mx-auto text-amber-600 mb-2" />
              <p className="font-bold">PAUSE</p>
              <p className="text-sm text-slate-600">Pune campania pe pauză temporar</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200">
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <p className="font-bold">REDUCE_BUDGET</p>
              <p className="text-sm text-slate-600">Scade bugetul cu % configurat</p>
            </CardContent>
          </Card>
        </div>
      </SubSection>
    </div>
  );
}

// ==================== 9. RBAC CONTENT ====================
function RBACContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Sistemul RBAC (Role-Based Access Control) oferă control granular asupra
          acțiunilor pe care utilizatorii le pot efectua în sistem.
        </p>
      </div>

      <SectionTitle icon={<Shield className="h-6 w-6" />}>Arhitectura RBAC</SectionTitle>

      <MermaidDiagram
        title="Structura Permisiunilor"
        chart={`
erDiagram
    User ||--o{ UserRoleAssignment : "are"
    User ||--o{ UserGroupMembership : "membru în"
    User ||--o{ UserStoreAccess : "acces la"

    Role ||--o{ UserRoleAssignment : "asignat"
    Role ||--o{ RolePermission : "are"
    Role ||--o{ GroupRoleAssignment : "asignat grupului"

    Permission ||--o{ RolePermission : "în roluri"

    Group ||--o{ UserGroupMembership : "conține"
    Group ||--o{ GroupRoleAssignment : "are roluri"

    Store ||--o{ UserStoreAccess : "restricție"

    User {
        string id PK
        string email UK
        string name
        boolean isSuperAdmin
        boolean isActive
    }

    Role {
        string id PK
        string name UK
        string description
        boolean isSystem
    }

    Permission {
        string id PK
        string code UK
        string name
        string category
    }
        `}
      />

      <SubSection title="Cum se verifică permisiunile" icon={<CheckCircle2 className="h-5 w-5" />}>
        <MermaidDiagram
          chart={`
flowchart TB
    START([Utilizator face acțiune]) --> Q1{Este SuperAdmin?}

    Q1 -->|Da| ALLOW([✅ PERMITE])
    Q1 -->|Nu| Q2{Are permisiune directă?}

    Q2 -->|Da| ALLOW
    Q2 -->|Nu| Q3{Este în grup cu permisiune?}

    Q3 -->|Da| ALLOW
    Q3 -->|Nu| DENY([❌ REFUZĂ])
          `}
        />
      </SubSection>

      <SectionTitle icon={<Users className="h-6 w-6" />}>Roluri Predefinite</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: "Administrator",
            desc: "Acces complet la toate funcționalitățile",
            perms: ["Toate permisiunile", "Exclud: admin.*"],
            color: "border-red-300 bg-red-50"
          },
          {
            name: "Manager",
            desc: "Gestionare comenzi, produse, facturi, AWB",
            perms: ["orders.*", "products.*", "invoices.*", "awb.*"],
            color: "border-blue-300 bg-blue-50"
          },
          {
            name: "Operator Comenzi",
            desc: "Procesare comenzi și livrări",
            perms: ["orders.view", "orders.process", "awb.create", "invoices.view"],
            color: "border-green-300 bg-green-50"
          },
          {
            name: "Picker",
            desc: "Pregătire colete în depozit",
            perms: ["picking.*", "orders.view", "products.view"],
            color: "border-yellow-300 bg-yellow-50"
          },
          {
            name: "Operator Predare",
            desc: "Scanare și predare curier",
            perms: ["handover.*", "awb.view", "orders.view"],
            color: "border-orange-300 bg-orange-50"
          },
          {
            name: "Vizualizare",
            desc: "Doar citire, fără modificări",
            perms: ["*.view (toate modulele)"],
            color: "border-slate-300 bg-slate-50"
          },
        ].map((role, i) => (
          <Card key={i} className={cn("border-2", role.color)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{role.name}</CardTitle>
              <CardDescription>{role.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.perms.map((p, j) => (
                  <Badge key={j} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Lock className="h-6 w-6" />}>Categorii de Permisiuni</SectionTitle>

      <Accordion type="multiple" className="w-full">
        {[
          { category: "Orders", perms: ["orders.view", "orders.create", "orders.edit", "orders.delete", "orders.process", "orders.export", "orders.sync"] },
          { category: "Products", perms: ["products.view", "products.create", "products.edit", "products.delete", "products.sync", "products.stock", "products.prices"] },
          { category: "Invoices", perms: ["invoices.view", "invoices.create", "invoices.cancel", "invoices.download", "invoices.payment", "invoices.series"] },
          { category: "AWB", perms: ["awb.view", "awb.create", "awb.print", "awb.delete", "awb.track"] },
          { category: "Picking", perms: ["picking.view", "picking.create", "picking.process", "picking.complete", "picking.print", "picking.logs"] },
          { category: "Handover", perms: ["handover.view", "handover.scan", "handover.finalize", "handover.report"] },
          { category: "Inventory", perms: ["inventory.view", "inventory.adjust", "inventory.sync"] },
          { category: "Advertising", perms: ["ads.view", "ads.manage", "ads.create", "ads.alerts", "ads.accounts"] },
          { category: "Settings", perms: ["settings.view", "settings.edit", "settings.integrations", "settings.stores"] },
          { category: "Users", perms: ["users.view", "users.invite", "users.edit", "users.deactivate", "users.roles", "users.groups"] },
          { category: "Admin", perms: ["admin.roles", "admin.groups", "admin.permissions", "admin.audit"] },
        ].map((cat, i) => (
          <AccordionItem key={i} value={cat.category}>
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">{cat.category}</span>
              <Badge variant="secondary" className="ml-2">{cat.perms.length}</Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 pt-2">
                {cat.perms.map((p, j) => (
                  <code key={j} className="px-2 py-1 bg-slate-100 rounded text-sm">{p}</code>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <SectionTitle icon={<Store className="h-6 w-6" />}>Restricții per Magazin</SectionTitle>

      <InfoBox variant="info" title="Acces granular per Store">
        Utilizatorii pot fi restricționați să vadă doar comenzile și datele
        de la anumite magazine (Store). Un operator poate avea acces doar la Store-ul "Shopify RO"
        fără să vadă comenzile de pe "Shopify EU".
      </InfoBox>

      <CodeBlock
        title="Verificare acces în cod"
        code={`// API Route - verificare permisiuni + acces store
import { hasPermission, hasStoreAccess } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Verificare permisiune
  const canView = await hasPermission(session.user.id, "orders.view");
  if (!canView) return forbidden();

  // 2. Verificare acces la store-ul specific
  const storeId = request.nextUrl.searchParams.get("storeId");
  if (storeId) {
    const hasAccess = await hasStoreAccess(session.user.id, storeId);
    if (!hasAccess) return forbidden();
  }

  // ... continuă cu logica
}`}
      />
    </div>
  );
}

// ==================== 10. DATABASE CONTENT ====================
function DatabaseContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Baza de date PostgreSQL conține peste 80 de tabele organizate în module logice,
          cu relații complexe și indecși optimizați pentru performanță.
        </p>
      </div>

      <SectionTitle icon={<Database className="h-6 w-6" />}>Schema Generală</SectionTitle>

      <MermaidDiagram
        title="Entități Principale și Relații"
        chart={`
erDiagram
    User ||--o{ Order : "procesează"
    Store ||--o{ Order : "primește"
    Order ||--o{ LineItem : "conține"
    Order ||--o| Invoice : "are"
    Order ||--o| AWB : "are"

    MasterProduct ||--o{ LineItem : "în comenzi"
    MasterProduct ||--o| InventoryItem : "mapare"
    Category ||--o{ MasterProduct : "conține"

    Invoice }o--|| InvoiceSeries : "serie"
    AWB ||--o{ AWBStatusHistory : "istoricul"
    AWB }o--o| HandoverSession : "predat în"

    AdsAccount ||--o{ AdsCampaign : "conține"
    AdsCampaign ||--o{ AdsAdSet : "are"
    AdsAdSet ||--o{ AdsAd : "conține"

    User ||--o{ UserRoleAssignment : "are roluri"
    Role ||--o{ RolePermission : "are permisiuni"
        `}
      />

      <SectionTitle icon={<Table2 className="h-6 w-6" />}>Categorii de Tabele</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: "Autentificare",
            tables: ["User", "Account", "Session", "VerificationToken"],
            color: "border-blue-300",
            count: 4
          },
          {
            name: "Control Acces",
            tables: ["Permission", "Role", "RolePermission", "UserRoleAssignment", "Group", "UserGroupMembership", "UserStoreAccess"],
            color: "border-red-300",
            count: 7
          },
          {
            name: "Comenzi",
            tables: ["Order", "LineItem", "ProcessingError"],
            color: "border-green-300",
            count: 3
          },
          {
            name: "Produse",
            tables: ["MasterProduct", "ProductRecipe", "MasterProductChannel", "MasterProductImage", "Category", "Channel"],
            color: "border-orange-300",
            count: 6
          },
          {
            name: "Inventar",
            tables: ["InventoryItem", "InventoryRecipeComponent", "InventoryStockMovement", "GoodsReceipt", "GoodsReceiptItem", "Supplier"],
            color: "border-purple-300",
            count: 6
          },
          {
            name: "Facturare",
            tables: ["Invoice", "InvoiceSeries"],
            color: "border-indigo-300",
            count: 2
          },
          {
            name: "Livrare",
            tables: ["AWB", "AWBStatusHistory", "HandoverSession"],
            color: "border-amber-300",
            count: 3
          },
          {
            name: "Picking",
            tables: ["PickingList", "PickingListItem", "PickingListAWB", "PickingLog"],
            color: "border-teal-300",
            count: 4
          },
          {
            name: "Advertising",
            tables: ["AdsApp", "AdsAccount", "AdsCampaign", "AdsAdSet", "AdsAd", "AdsDailyStats", "AdsAlertRule", "AdsAlert", "AdsPixel", "AdsCampaignProduct"],
            color: "border-pink-300",
            count: 10
          },
          {
            name: "Trendyol",
            tables: ["TrendyolOrder", "TrendyolOrderItem", "TrendyolProduct", "TrendyolProductMapping", "TrendyolCampaign"],
            color: "border-cyan-300",
            count: 5
          },
          {
            name: "Audit & Logs",
            tables: ["AuditLog", "ActivityLog", "SyncLog", "SyncLogEntry", "Notification"],
            color: "border-slate-300",
            count: 5
          },
          {
            name: "Configurări",
            tables: ["Settings", "Store", "Printer", "PrintJob"],
            color: "border-gray-300",
            count: 4
          },
        ].map((cat, i) => (
          <Card key={i} className={cn("border-2", cat.color)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {cat.name}
                <Badge variant="secondary">{cat.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {cat.tables.map((t, j) => (
                  <code key={j} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{t}</code>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Link2 className="h-6 w-6" />}>Relații Cheie</SectionTitle>

      <InfoBox variant="info" title="Cascade Delete">
        Majoritatea relațiilor folosesc <code>onDelete: Cascade</code> pentru a menține
        integritatea datelor. Ștergerea unui Store va șterge automat toate comenzile,
        facturile și AWB-urile asociate.
      </InfoBox>

      <SubSection title="Relația Order → Invoice → AWB" icon={<GitMerge className="h-5 w-5" />}>
        <MermaidDiagram
          chart={`
flowchart LR
    subgraph ORDER["Order"]
        O[id<br/>shopifyOrderId<br/>status<br/>totalPrice]
    end

    subgraph INVOICE["Invoice"]
        I[id<br/>smartBillNumber<br/>series<br/>pdfData]
    end

    subgraph AWB["AWB"]
        A[id<br/>awbNumber<br/>status<br/>trackingUrl]
    end

    O -->|1:1| I
    O -->|1:1| A
    I -->|orderId| O
    A -->|orderId| O
          `}
        />
      </SubSection>

      <SubSection title="Relația MasterProduct → InventoryItem" icon={<Component className="h-5 w-5" />}>
        <MermaidDiagram
          chart={`
flowchart TB
    subgraph MASTER["MasterProduct (PIM)"]
        MP[SKU: PAT-001<br/>Preț vânzare: 2500<br/>Pentru canale externe]
    end

    subgraph INVENTORY["InventoryItem (Stoc)"]
        INV[SKU: PAT-001<br/>Stoc curent: 15<br/>Cost: 1200<br/>Pentru gestiune internă]
    end

    subgraph RECIPE["InventoryRecipeComponent"]
        R[Componente pentru<br/>produse compuse]
    end

    MP -->|inventoryItemId| INV
    INV -->|recipeComponents| R
          `}
        />
      </SubSection>
    </div>
  );
}

// ==================== 11. INTEGRATIONS CONTENT ====================
function IntegrationsContent() {
  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          ERP CashFlowSync se integrează cu multiple servicii externe pentru
          e-commerce, facturare, livrare și advertising.
        </p>
      </div>

      <SectionTitle icon={<Globe className="h-6 w-6" />}>Integrări Active</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            name: "Shopify",
            status: "active",
            type: "E-commerce",
            desc: "Sincronizare comenzi, produse și inventar",
            features: ["Webhook pentru comenzi noi", "API pentru produse", "Inventory sync", "Fulfillment API"],
            auth: "Access Token",
            docs: "https://shopify.dev/docs/api"
          },
          {
            name: "SmartBill",
            status: "active",
            type: "Facturare",
            desc: "Emitere facturi și gestiune contabilă",
            features: ["Emitere facturi", "Descărcare PDF", "Verificare stoc", "Serii multiple"],
            auth: "API Token + CIF",
            docs: "https://api.smartbill.ro"
          },
          {
            name: "FanCourier",
            status: "active",
            type: "Curierat",
            desc: "Generare AWB și tracking livrări",
            features: ["Creare AWB", "Tracking status", "Print etichete", "Nomenclator localități"],
            auth: "OAuth Token",
            docs: "https://api.fancourier.ro"
          },
          {
            name: "Meta Ads",
            status: "active",
            type: "Advertising",
            desc: "Gestionare campanii Facebook și Instagram",
            features: ["OAuth connect", "Sync campanii", "Daily stats", "Pixel tracking"],
            auth: "OAuth 2.0",
            docs: "https://developers.facebook.com"
          },
          {
            name: "TikTok Ads",
            status: "active",
            type: "Advertising",
            desc: "Gestionare campanii TikTok",
            features: ["OAuth connect", "Sync campanii", "Daily stats", "Pixel tracking"],
            auth: "OAuth 2.0",
            docs: "https://business.tiktok.com"
          },
          {
            name: "Trendyol",
            status: "active",
            type: "Marketplace",
            desc: "Sincronizare comenzi și produse Trendyol",
            features: ["Sync comenzi", "Product listing", "Stock sync", "Price update"],
            auth: "API Key + Secret",
            docs: "https://developers.trendyol.com"
          },
          {
            name: "Google Drive",
            status: "active",
            type: "Storage",
            desc: "Stocare imagini produse și backup",
            features: ["Upload imagini", "Sync PIM", "Backup automat"],
            auth: "Service Account",
            docs: "https://developers.google.com/drive"
          },
          {
            name: "Google Ads",
            status: "planned",
            type: "Advertising",
            desc: "Gestionare campanii Google (în dezvoltare)",
            features: ["OAuth connect", "Sync campanii"],
            auth: "OAuth 2.0",
            docs: "https://developers.google.com/google-ads"
          },
        ].map((int, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{int.name}</CardTitle>
                <StatusBadge status={int.status as any}>
                  {int.status === "active" ? "Activ" : "Planificat"}
                </StatusBadge>
              </div>
              <CardDescription>{int.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tip</p>
                  <Badge variant="outline">{int.type}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Funcționalități</p>
                  <div className="flex flex-wrap gap-1">
                    {int.features.map((f, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Autentificare</p>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{int.auth}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionTitle icon={<Key className="h-6 w-6" />}>Configurare Variabile de Mediu</SectionTitle>

      <CodeBlock
        title=".env (exemplu)"
        code={`# ============ DATABASE ============
DATABASE_URL="postgresql://user:pass@host:5432/db"

# ============ AUTH ============
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://erp.example.com"

# ============ SHOPIFY ============
SHOPIFY_STORE_DOMAIN="store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_xxxxx"
SHOPIFY_WEBHOOK_SECRET="whsec_xxxxx"

# ============ SMARTBILL ============
SMARTBILL_API_TOKEN="xxxxx"
SMARTBILL_COMPANY_CIF="RO12345678"
SMARTBILL_WAREHOUSE="Depozit Principal"

# ============ FANCOURIER ============
FANCOURIER_CLIENT_ID="xxxxx"
FANCOURIER_USERNAME="user"
FANCOURIER_PASSWORD="pass"

# ============ TRENDYOL ============
TRENDYOL_SELLER_ID="xxxxx"
TRENDYOL_API_KEY="xxxxx"
TRENDYOL_API_SECRET="xxxxx"

# ============ META ADS ============
META_APP_ID="xxxxx"
META_APP_SECRET="xxxxx"

# ============ TIKTOK ADS ============
TIKTOK_APP_ID="xxxxx"
TIKTOK_APP_SECRET="xxxxx"

# ============ GOOGLE DRIVE ============
GOOGLE_DRIVE_FOLDER_ID="xxxxx"
GOOGLE_SERVICE_ACCOUNT_KEY="base64-encoded-json"

# ============ CRON ============
CRON_SECRET="xxxxx"`}
      />
    </div>
  );
}
// ==================== 12. API REFERENCE CONTENT ====================
function APIReferenceContent() {
  const apiGroups = [
    {
      name: "Orders",
      description: "Gestionare comenzi",
      endpoints: [
        { method: "GET", path: "/api/orders", desc: "Lista comenzi cu filtre și paginare", params: "status, storeId, search, page, limit" },
        { method: "GET", path: "/api/orders/[id]", desc: "Detalii comandă cu relații", params: "id" },
        { method: "POST", path: "/api/orders/process", desc: "Procesare comandă (factură + AWB)", params: "orderId" },
        { method: "POST", path: "/api/orders/process-all", desc: "Procesare bulk comenzi", params: "orderIds[]" },
        { method: "PUT", path: "/api/orders/[id]", desc: "Actualizare comandă", params: "id, data" },
        { method: "DELETE", path: "/api/orders/[id]", desc: "Ștergere comandă", params: "id" },
      ]
    },
    {
      name: "Products",
      description: "Gestionare produse și catalog",
      endpoints: [
        { method: "GET", path: "/api/products", desc: "Lista produse", params: "search, categoryId, isActive" },
        { method: "GET", path: "/api/products/[id]", desc: "Detalii produs", params: "id" },
        { method: "POST", path: "/api/products", desc: "Creare produs nou", params: "sku, title, price, ..." },
        { method: "PUT", path: "/api/products/[id]", desc: "Actualizare produs", params: "id, data" },
        { method: "DELETE", path: "/api/products/[id]", desc: "Ștergere produs", params: "id" },
        { method: "POST", path: "/api/products/sync", desc: "Sincronizare cu canale", params: "channelId" },
      ]
    },
    {
      name: "Inventory",
      description: "Gestionare inventar și stoc",
      endpoints: [
        { method: "GET", path: "/api/inventory-items", desc: "Lista articole inventar", params: "search, isComposite, lowStock" },
        { method: "POST", path: "/api/inventory-items", desc: "Creare articol inventar", params: "sku, name, currentStock, ..." },
        { method: "PUT", path: "/api/inventory-items/[id]", desc: "Actualizare articol", params: "id, data" },
        { method: "POST", path: "/api/inventory-items/[id]/adjust", desc: "Ajustare stoc", params: "id, quantity, reason" },
        { method: "GET", path: "/api/goods-receipts", desc: "Lista recepții (NIR)", params: "status, supplierId" },
        { method: "POST", path: "/api/goods-receipts", desc: "Creare recepție", params: "supplierId, items[]" },
      ]
    },
    {
      name: "Invoices",
      description: "Facturare și SmartBill",
      endpoints: [
        { method: "GET", path: "/api/invoices", desc: "Lista facturi", params: "status, paymentStatus, search" },
        { method: "POST", path: "/api/invoices/issue", desc: "Emitere factură pentru comandă", params: "orderId" },
        { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Descărcare PDF factură", params: "id" },
        { method: "POST", path: "/api/invoices/[id]/cancel", desc: "Anulare factură (storno)", params: "id" },
        { method: "GET", path: "/api/invoice-series", desc: "Lista serii facturare", params: "-" },
        { method: "POST", path: "/api/invoice-series", desc: "Creare serie nouă", params: "prefix, name" },
      ]
    },
    {
      name: "AWB & Shipping",
      description: "Livrare și FanCourier",
      endpoints: [
        { method: "GET", path: "/api/awb", desc: "Lista AWB-uri", params: "status, orderId" },
        { method: "POST", path: "/api/awb/create", desc: "Generare AWB pentru comandă", params: "orderId, options" },
        { method: "GET", path: "/api/awb/[id]/label", desc: "Descărcare etichetă (PDF/ZPL)", params: "id, format" },
        { method: "DELETE", path: "/api/awb/[id]", desc: "Ștergere AWB", params: "id" },
        { method: "GET", path: "/api/tracking", desc: "Tracking AWB", params: "awbNumber" },
        { method: "POST", path: "/api/handover/scan", desc: "Scanare AWB în sesiune predare", params: "awbNumber, sessionId" },
      ]
    },
    {
      name: "Advertising",
      description: "Meta & TikTok Ads",
      endpoints: [
        { method: "GET", path: "/api/ads/accounts", desc: "Lista conturi conectate", params: "platform" },
        { method: "POST", path: "/api/ads/accounts/connect", desc: "Inițiere OAuth pentru cont", params: "platform, appId" },
        { method: "GET", path: "/api/ads/campaigns", desc: "Lista campanii", params: "accountId, status" },
        { method: "GET", path: "/api/ads/stats", desc: "Statistici campanii", params: "campaignId, dateRange" },
        { method: "GET", path: "/api/ads/alerts", desc: "Lista alerte active", params: "status" },
        { method: "POST", path: "/api/ads/alerts/rules", desc: "Creare regulă alertă", params: "name, conditions, action" },
      ]
    },
    {
      name: "Activity & Sync",
      description: "Loguri și sincronizare",
      endpoints: [
        { method: "GET", path: "/api/activity", desc: "Jurnal activitate", params: "entityType, action, dateRange" },
        { method: "GET", path: "/api/sync-history", desc: "Istoric sincronizări", params: "type, status" },
        { method: "POST", path: "/api/sync-service/run", desc: "Rulare sincronizare manuală", params: "type" },
      ]
    },
    {
      name: "Settings",
      description: "Configurări sistem",
      endpoints: [
        { method: "GET", path: "/api/settings", desc: "Obținere setări curente", params: "-" },
        { method: "PUT", path: "/api/settings", desc: "Actualizare setări", params: "key, value" },
        { method: "GET", path: "/api/stores", desc: "Lista magazine Shopify", params: "-" },
        { method: "GET", path: "/api/channels", desc: "Lista canale de vânzare", params: "-" },
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Referință completă pentru toate endpoint-urile API disponibile în ERP CashFlowSync.
          Toate endpoint-urile sunt protejate cu autentificare NextAuth.
        </p>
      </div>

      <SectionTitle icon={<Lock className="h-6 w-6" />}>Autentificare</SectionTitle>

      <InfoBox variant="info" title="Sesiune Required">
        Toate endpoint-urile verifică sesiunea utilizatorului server-side folosind
        <code className="ml-1 bg-blue-100 px-1 rounded">getServerSession()</code>.
        Requesturile fără sesiune validă primesc <Badge variant="destructive">401</Badge>.
      </InfoBox>

      <CodeBlock
        title="Exemplu verificare autentificare"
        code={`// În fiecare API route
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  // 1. Verificare sesiune
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Neautorizat" },
      { status: 401 }
    );
  }

  // 2. Verificare permisiune
  const canAccess = await hasPermission(
    session.user.id,
    "orders.view"
  );
  if (!canAccess) {
    return NextResponse.json(
      { error: "Nu ai permisiunea necesară" },
      { status: 403 }
    );
  }

  // 3. Logică business...
}`}
      />

      <SectionTitle icon={<Code className="h-6 w-6" />}>Endpoints</SectionTitle>

      {apiGroups.map((group, i) => (
        <div key={i} className="mb-8">
          <SubSection title={group.name} icon={<FolderOpen className="h-5 w-5" />}>
            <p className="text-sm text-slate-600 mb-4">{group.description}</p>
            <div className="space-y-2">
              {group.endpoints.map((ep, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                >
                  <Badge
                    className={cn(
                      "w-16 justify-center",
                      ep.method === "GET" && "bg-blue-100 text-blue-700 border-blue-300",
                      ep.method === "POST" && "bg-green-100 text-green-700 border-green-300",
                      ep.method === "PUT" && "bg-amber-100 text-amber-700 border-amber-300",
                      ep.method === "DELETE" && "bg-red-100 text-red-700 border-red-300"
                    )}
                  >
                    {ep.method}
                  </Badge>
                  <code className="font-mono text-sm flex-1 text-slate-700">{ep.path}</code>
                  <span className="text-sm text-slate-500 hidden md:block">{ep.desc}</span>
                </div>
              ))}
            </div>
          </SubSection>
        </div>
      ))}

      <SectionTitle icon={<FileJson className="h-6 w-6" />}>Format Răspunsuri</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Succes (200/201)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`{
  "success": true,
  "data": {
    // Datele returnate
  },
  "message": "Operație reușită" // opțional
}

// Pentru liste cu paginare
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}`}
            />
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Eroare (4xx/5xx)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`// 401 - Neautorizat
{
  "error": "Neautorizat"
}

// 403 - Forbidden
{
  "error": "Nu ai permisiunea necesară"
}

// 400 - Bad Request
{
  "error": "Descriere eroare",
  "code": "VALIDATION_ERROR",
  "details": { ... } // opțional
}

// 500 - Server Error
{
  "error": "Eroare internă server"
}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== 13. CHANGELOG CONTENT ====================
function ChangelogContent() {
  const releases = [
    {
      version: "3.0.0",
      date: "2026-01-13",
      title: "Documentație Completă Refactorizată",
      status: "current" as const,
      changes: [
        "Documentație completă rescrisă cu Mermaid diagrams",
        "Diagrame interactive pentru toate fluxurile",
        "Schema bazei de date vizualizată",
        "API Reference complet",
      ]
    },
    {
      version: "2.1.0",
      date: "2026-01-06",
      title: "Modul Advertising Complet",
      status: "completed" as const,
      changes: [
        "Integrare Meta Ads cu OAuth",
        "Integrare TikTok Ads cu OAuth",
        "Sistem de alerte automate",
        "Auto-rollback pentru campanii",
        "Daily stats sync via CRON",
      ]
    },
    {
      version: "2.0.0",
      date: "2026-01-05",
      title: "Predare Curier (Handover)",
      status: "completed" as const,
      changes: [
        "Sistem complet de scanare AWB",
        "Sesiuni de predare cu raport",
        "Finalizare automată la miezul nopții",
        "Export Excel rapoarte",
      ]
    },
    {
      version: "1.9.0",
      date: "2026-01-04",
      title: "FanCourier AWB Fix",
      status: "completed" as const,
      changes: [
        "Rezolvare printing A6",
        "Fix parametri API FanCourier",
        "Îmbunătățiri tracking status",
      ]
    },
    {
      version: "1.8.0",
      date: "2026-01-03",
      title: "RBAC System",
      status: "completed" as const,
      changes: [
        "Sistem complet de permisiuni",
        "Roluri predefinite",
        "Grupuri de utilizatori",
        "Restricții per Store",
        "Audit logging",
      ]
    },
    {
      version: "2.2.0",
      date: "TBD",
      title: "Google Ads Integration",
      status: "upcoming" as const,
      changes: [
        "OAuth pentru Google Ads",
        "Sincronizare campanii",
        "Statistici unificate",
      ]
    },
    {
      version: "2.3.0",
      date: "TBD",
      title: "Reports Dashboard",
      status: "upcoming" as const,
      changes: [
        "Dashboard avansat cu grafice",
        "Rapoarte personalizabile",
        "Export PDF rapoarte",
      ]
    },
  ];

  return (
    <div className="space-y-8">
      <div className="prose max-w-none">
        <p className="text-lg text-slate-600">
          Istoric al versiunilor și modificărilor majore din ERP CashFlowSync.
        </p>
      </div>

      <SectionTitle icon={<History className="h-6 w-6" />}>Versiuni</SectionTitle>

      <Timeline
        events={releases.map((r) => ({
          date: r.date,
          title: `v${r.version} - ${r.title}`,
          description: r.changes.join(" • "),
          status: r.status,
        }))}
      />

      <SectionTitle icon={<ScrollText className="h-6 w-6" />}>Detalii Versiuni</SectionTitle>

      <div className="space-y-6">
        {releases.map((release, i) => (
          <Card
            key={i}
            className={cn(
              "border-l-4",
              release.status === "current" && "border-l-blue-500",
              release.status === "completed" && "border-l-green-500",
              release.status === "upcoming" && "border-l-amber-500"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <span className="font-mono">v{release.version}</span>
                  <span className="text-slate-600 font-normal">{release.title}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{release.date}</Badge>
                  <StatusBadge
                    status={
                      release.status === "current"
                        ? "new"
                        : release.status === "completed"
                        ? "active"
                        : "planned"
                    }
                  >
                    {release.status === "current"
                      ? "Curent"
                      : release.status === "completed"
                      ? "Lansat"
                      : "Planificat"}
                  </StatusBadge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {release.changes.map((change, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT COMPONENT ====================
export default function DocumentationPage() {
  const [activeModule, setActiveModule] = useState("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    switch (activeModule) {
      case "overview":
        return <OverviewContent />;
      case "architecture":
        return <ArchitectureContent />;
      case "orders":
        return <OrdersContent />;
      case "products":
        return <ProductsContent />;
      case "invoices":
        return <InvoicesContent />;
      case "shipping":
        return <ShippingContent />;
      case "picking":
        return <PickingContent />;
      case "advertising":
        return <AdvertisingContent />;
      case "rbac":
        return <RBACContent />;
      case "database":
        return <DatabaseContent />;
      case "integrations":
        return <IntegrationsContent />;
      case "api":
        return <APIReferenceContent />;
      case "changelog":
        return <ChangelogContent />;
      default:
        return <OverviewContent />;
    }
  };

  const currentModule = modules.find((m) => m.id === activeModule);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={cn(
          "border-r bg-slate-50/50 flex flex-col transition-all duration-300",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Book className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-800">Documentație</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge variant="outline" className="font-mono">v{DOC_VERSION}</Badge>
            <span>•</span>
            <span>{LAST_UPDATED}</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Caută..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredModules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "hover:bg-slate-100 text-slate-700"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : module.color)} />
                  <span className="font-medium">{module.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border rounded-r-lg p-1.5 shadow-sm hover:bg-slate-50 transition-all"
        style={{ left: sidebarOpen ? "286px" : "0" }}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-slate-600 transition-transform",
            sidebarOpen && "rotate-180"
          )}
        />
      </button>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white">
        {/* Content Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-8 py-4">
          <div className="flex items-center gap-3">
            {currentModule && (
              <>
                <currentModule.icon className={cn("h-6 w-6", currentModule.color)} />
                <h2 className="text-xl font-bold text-slate-800">{currentModule.name}</h2>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="max-w-5xl mx-auto px-8 py-8">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-8 py-6 mt-12">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-slate-500">
            <p>
              ERP CashFlowSync • Documentație v{DOC_VERSION}
            </p>
            <p>
              Ultima actualizare: {LAST_UPDATED}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
