"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface SyncLogEntry {
  id: string;
  level: string;
  action: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  awbNumber?: string;
  invoiceNumber?: string;
  details?: any;
  timestamp: string;
}

interface SyncLog {
  id: string;
  type: string;
  status: string;
  ordersProcessed: number;
  awbsUpdated: number;
  invoicesChecked: number;
  errorsCount: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  summary?: string;
  entries?: SyncLogEntry[];
  _count?: { entries: number };
}

export default function SyncHistoryPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/sync/full?limit=50");
      const data = await response.json();
      setSyncLogs(data.history || []);
    } catch (error) {
      console.error("Eroare la încărcarea istoricului:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogDetails = async (logId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/sync/full?id=${logId}`);
      const data = await response.json();
      setSelectedLog(data);
    } catch (error) {
      console.error("Eroare la încărcarea detaliilor:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RUNNING: "bg-blue-100 text-blue-800 animate-pulse",
      COMPLETED: "bg-green-100 text-green-800",
      COMPLETED_WITH_ERRORS: "bg-yellow-100 text-yellow-800",
      FAILED: "bg-red-100 text-red-800",
    };
    
    const labels: Record<string, string> = {
      RUNNING: "În curs",
      COMPLETED: "Finalizat",
      COMPLETED_WITH_ERRORS: "Cu erori",
      FAILED: "Eșuat",
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || "bg-gray-100"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      MANUAL: "bg-purple-100 text-purple-800",
      AUTOMATIC: "bg-blue-100 text-blue-800",
      SINGLE_ORDER: "bg-indigo-100 text-indigo-800",
    };
    
    const labels: Record<string, string> = {
      MANUAL: "Manual",
      AUTOMATIC: "Automat",
      SINGLE_ORDER: "Comandă",
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type] || "bg-gray-100"}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "SUCCESS": return "✅";
      case "ERROR": return "❌";
      case "WARNING": return "⚠️";
      case "INFO": return "ℹ️";
      case "DEBUG": return "🔧";
      default: return "📝";
    }
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case "SUCCESS": return "border-l-4 border-green-500 bg-green-50";
      case "ERROR": return "border-l-4 border-red-500 bg-red-50";
      case "WARNING": return "border-l-4 border-yellow-500 bg-yellow-50";
      case "INFO": return "border-l-4 border-blue-500 bg-blue-50";
      case "DEBUG": return "border-l-4 border-gray-400 bg-gray-50";
      default: return "border-l-4 border-gray-300 bg-white";
    }
  };

  const getLevelTextColor = (level: string) => {
    switch (level) {
      case "SUCCESS": return "text-green-800";
      case "ERROR": return "text-red-800";
      case "WARNING": return "text-yellow-800";
      case "INFO": return "text-blue-800";
      case "DEBUG": return "text-gray-700";
      default: return "text-gray-700";
    }
  };

  const filteredEntries = selectedLog?.entries?.filter(entry => {
    if (filterLevel === "ALL") return true;
    return entry.level === filterLevel;
  }) || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📜 Istoric Sincronizări</h1>
          <p className="text-gray-600 mt-1">
            Vizualizează toate sesiunile de sincronizare și log-urile detaliate
          </p>
        </div>
        <p className="text-sm text-gray-500">
          💡 Folosește butonul <strong>Sincronizare</strong> din sidebar pentru a porni o sincronizare nouă
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista sesiunilor */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Sesiuni de sincronizare</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                <p>Se încarcă...</p>
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>Nu există sesiuni de sincronizare</p>
                <p className="text-sm mt-1">Apasă butonul de sincronizare pentru a începe</p>
              </div>
            ) : (
              <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                {syncLogs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => fetchLogDetails(log.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedLog?.id === log.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getTypeBadge(log.type)}
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(new Date(log.startedAt), "d MMM yyyy, HH:mm:ss", { locale: ro })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span title="Comenzi">📦 {log.ordersProcessed}</span>
                      <span title="AWB-uri">🚚 {log.awbsUpdated}</span>
                      <span title="Facturi">📄 {log.invoicesChecked}</span>
                      {log.errorsCount > 0 && (
                        <span className="text-red-600" title="Erori">❌ {log.errorsCount}</span>
                      )}
                    </div>
                    {log.durationMs && (
                      <div className="text-xs text-gray-400 mt-1">
                        ⏱️ {(log.durationMs / 1000).toFixed(2)}s
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalii sesiune */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            {loadingDetails ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                <p>Se încarcă detaliile...</p>
              </div>
            ) : !selectedLog ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">👈</p>
                <p>Selectează o sesiune pentru a vedea log-urile</p>
              </div>
            ) : (
              <>
                {/* Header sesiune */}
                <div className="px-4 py-3 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-gray-800">Log-uri detaliate</h2>
                      {getStatusBadge(selectedLog.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Filtrează:</label>
                      <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="ALL">Toate</option>
                        <option value="ERROR">❌ Erori</option>
                        <option value="WARNING">⚠️ Avertismente</option>
                        <option value="SUCCESS">✅ Succes</option>
                        <option value="INFO">ℹ️ Info</option>
                        <option value="DEBUG">🔧 Debug</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Statistici */}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">📦 {selectedLog.ordersProcessed} comenzi</span>
                    <span className="text-gray-600">🚚 {selectedLog.awbsUpdated} AWB-uri actualizate</span>
                    <span className="text-gray-600">📄 {selectedLog.invoicesChecked} facturi</span>
                    {selectedLog.errorsCount > 0 && (
                      <span className="text-red-600">❌ {selectedLog.errorsCount} erori</span>
                    )}
                    {selectedLog.durationMs && (
                      <span className="text-gray-500">⏱️ {(selectedLog.durationMs / 1000).toFixed(2)}s</span>
                    )}
                  </div>
                </div>

                {/* Lista log-uri */}
                <div className="divide-y max-h-[calc(100vh-350px)] overflow-y-auto">
                  {filteredEntries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>Nu există log-uri pentru filtrul selectat</p>
                    </div>
                  ) : (
                    filteredEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 ${getLevelStyle(entry.level)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{getLevelIcon(entry.level)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded">
                                {entry.action}
                              </span>
                              {entry.orderNumber && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  #{entry.orderNumber}
                                </span>
                              )}
                              {entry.awbNumber && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                                  AWB: {entry.awbNumber}
                                </span>
                              )}
                              {entry.invoiceNumber && (
                                <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                  Factură: {entry.invoiceNumber}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 ml-auto">
                                {format(new Date(entry.timestamp), "HH:mm:ss.SSS")}
                              </span>
                            </div>
                            <pre className={`mt-1 text-sm whitespace-pre-wrap font-sans ${getLevelTextColor(entry.level)}`}>
                              {entry.message}
                            </pre>
                            {entry.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900 font-medium">
                                  📋 Vezi detalii JSON
                                </summary>
                                <pre className="mt-1 text-xs bg-white border border-gray-200 text-gray-800 p-2 rounded overflow-x-auto max-h-40">
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
