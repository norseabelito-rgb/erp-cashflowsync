import { LucideIcon, Package, FileText, ShoppingCart, Search, CheckCircle, AlertTriangle, Warehouse, BarChart3, ClipboardList } from "lucide-react";

export interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: string; // Name of callback to use, e.g., "clearFilters"
  };
}

export type EmptyStateType = "first_time" | "filtered" | "success" | "error";

/**
 * Empty state configurations by module and type
 */
export const EMPTY_STATES: Record<string, Record<EmptyStateType, EmptyStateConfig>> = {
  orders: {
    first_time: {
      icon: ShoppingCart,
      title: "Nicio comanda inca",
      description: "Comenzile vor aparea aici dupa ce magazinul va primi prima comanda din platforma.",
      action: {
        label: "Configureaza magazin",
        href: "/stores"
      }
    },
    filtered: {
      icon: Search,
      title: "Niciun rezultat gasit",
      description: "Nu am gasit comenzi care sa corespunda criteriilor de cautare.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Toate comenzile procesate",
      description: "Nu ai comenzi in asteptare. Buna treaba!"
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcarea comenzilor",
      description: "Nu am putut incarca lista de comenzi. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  },

  invoices: {
    first_time: {
      icon: FileText,
      title: "Nicio factura inca",
      description: "Facturile vor aparea aici dupa ce vei genera prima factura dintr-o comanda.",
      action: {
        label: "Vezi comenzi",
        href: "/orders"
      }
    },
    filtered: {
      icon: Search,
      title: "Niciun rezultat gasit",
      description: "Nu am gasit facturi care sa corespunda criteriilor de cautare.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Totul este la zi",
      description: "Nu ai facturi in asteptare sau cu probleme."
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcarea facturilor",
      description: "Nu am putut incarca lista de facturi. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  },

  products: {
    first_time: {
      icon: Package,
      title: "Niciun produs inca",
      description: "Produsele vor aparea aici dupa sincronizarea cu magazinul Shopify.",
      action: {
        label: "Sincronizeaza produse",
        onClick: "syncProducts"
      }
    },
    filtered: {
      icon: Search,
      title: "Niciun produs gasit",
      description: "Nu am gasit produse care sa corespunda cautarii tale.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Toate produsele sunt configurate",
      description: "Nu ai produse care necesita atentie."
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcarea produselor",
      description: "Nu am putut incarca lista de produse. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  },

  inventory: {
    first_time: {
      icon: Warehouse,
      title: "Niciun articol in inventar",
      description: "Adauga primul articol pentru a incepe gestionarea stocurilor.",
      action: {
        label: "Adauga articol",
        href: "/inventory/new"
      }
    },
    filtered: {
      icon: Search,
      title: "Niciun rezultat gasit",
      description: "Nu am gasit articole care sa corespunda cautarii tale.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Inventar complet",
      description: "Toate articolele au stoc suficient."
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcarea inventarului",
      description: "Nu am putut incarca inventarul. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  },

  failed_invoices: {
    first_time: {
      icon: CheckCircle,
      title: "Nicio factura esuata",
      description: "Toate facturile au fost generate cu succes. Buna treaba!"
    },
    filtered: {
      icon: Search,
      title: "Niciun rezultat gasit",
      description: "Nu am gasit facturi esuate care sa corespunda cautarii.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Totul este rezolvat",
      description: "Nu ai facturi esuate de remediat. Excelent!"
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcare",
      description: "Nu am putut incarca lista. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  },

  tasks: {
    first_time: {
      icon: ClipboardList,
      title: "Niciun task inca",
      description: "Creeaza primul task pentru a incepe gestionarea activitatilor.",
      action: {
        label: "Creeaza task",
        onClick: "createTask"
      }
    },
    filtered: {
      icon: Search,
      title: "Niciun rezultat gasit",
      description: "Nu am gasit task-uri care sa corespunda criteriilor de cautare.",
      action: {
        label: "Reseteaza filtrele",
        onClick: "clearFilters"
      }
    },
    success: {
      icon: CheckCircle,
      title: "Toate task-urile finalizate",
      description: "Nu ai task-uri active. Buna treaba!"
    },
    error: {
      icon: AlertTriangle,
      title: "Eroare la incarcarea task-urilor",
      description: "Nu am putut incarca lista de task-uri. Incearca din nou.",
      action: {
        label: "Reincarca",
        onClick: "refresh"
      }
    }
  }
};

/**
 * Get empty state config for a module and type
 */
export function getEmptyState(
  module: keyof typeof EMPTY_STATES,
  type: EmptyStateType = "first_time"
): EmptyStateConfig {
  return EMPTY_STATES[module]?.[type] || EMPTY_STATES[module]?.first_time || {
    icon: Package,
    title: "Nu sunt date",
    description: "Nu exista date de afisat."
  };
}

/**
 * Determine empty state type based on context
 */
export function determineEmptyStateType(
  hasFilters: boolean,
  hasError: boolean,
  isSuccessContext: boolean = false
): EmptyStateType {
  if (hasError) return "error";
  if (hasFilters) return "filtered";
  if (isSuccessContext) return "success";
  return "first_time";
}
