import React, { useState, useEffect, useMemo } from 'react';
import { debugSystem, DebugEntry, DebugConfig } from '../utils/debugSystem';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<DebugEntry[]>([]);
  const [filter, setFilter] = useState({
    level: '',
    component: '',
    search: ''
  });
  const [config, setConfig] = useState<DebugConfig>({
    enabled: true,
    level: 'debug',
    persistLogs: true,
    maxLogEntries: 1000,
    showStackTrace: true,
    enablePerformanceMonitoring: true
  });
  const [activeTab, setActiveTab] = useState<'logs' | 'stats' | 'config'>('logs');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Aggiorna i log periodicamente
  useEffect(() => {
    const updateLogs = () => {
      const filteredLogs = debugSystem.getLogs({
        level: filter.level || undefined,
        component: filter.component || undefined
      });
      
      const searchFiltered = filter.search
        ? filteredLogs.filter(log => 
            log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
            (log.component && log.component.toLowerCase().includes(filter.search.toLowerCase()))
          )
        : filteredLogs;
      
      setLogs(searchFiltered.slice(-100)); // Mostra solo gli ultimi 100 log
    };

    updateLogs();
    
    if (autoRefresh) {
      const interval = setInterval(updateLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh]);

  // Statistiche dei log
  const stats = useMemo(() => debugSystem.getLogStats(), []);

  // Componenti unici per il filtro
  const uniqueComponents = useMemo(() => {
    const components = new Set(logs.map(log => log.component).filter(Boolean));
    return Array.from(components).sort();
  }, [logs]);

  const handleConfigChange = (newConfig: Partial<DebugConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    debugSystem.configure(updatedConfig);
  };

  const exportLogs = (format: 'json' | 'csv') => {
    const data = debugSystem.exportLogs(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    debugSystem.clearLogs();
    setLogs([]);
  };

  const getLevelColor = (level: string) => {
    const colors = {
      error: 'text-red-600 bg-red-50',
      warn: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50',
      debug: 'text-gray-600 bg-gray-50',
      trace: 'text-gray-400 bg-gray-25'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const formatData = (data: unknown) => {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Sistema di Debug Avanzato</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'logs', label: 'Log', count: logs.length },
            { id: 'stats', label: 'Statistiche', count: stats.total },
            { id: 'config', label: 'Configurazione' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'logs' | 'stats' | 'config')}
              className={`px-4 py-2 font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col">
              {/* Filtri e controlli */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Livello:</label>
                    <select
                      value={filter.level}
                      onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value }))}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="">Tutti</option>
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                      <option value="trace">Trace</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Componente:</label>
                    <select
                      value={filter.component}
                      onChange={(e) => setFilter(prev => ({ ...prev, component: e.target.value }))}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="">Tutti</option>
                      {uniqueComponents.map(component => (
                        <option key={component} value={component}>{component}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Cerca:</label>
                    <input
                      type="text"
                      value={filter.search}
                      onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="Cerca nei messaggi..."
                      className="px-3 py-1 border rounded text-sm w-48"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                      />
                      Auto-refresh
                    </label>
                  </div>

                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => exportLogs('json')}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Esporta JSON
                    </button>
                    <button
                      onClick={() => exportLogs('csv')}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Esporta CSV
                    </button>
                    <button
                      onClick={clearLogs}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Pulisci Log
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista log */}
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className={`p-3 rounded border-l-4 ${
                        log.level === 'error' ? 'border-red-500 bg-red-50' :
                        log.level === 'warn' ? 'border-yellow-500 bg-yellow-50' :
                        log.level === 'info' ? 'border-blue-500 bg-blue-50' :
                        'border-gray-500 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            {log.component && (
                              <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                                {log.component}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            {log.message}
                          </div>
                          {typeof log.data !== 'undefined' && log.data !== null && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                Mostra dati
                              </summary>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                                {String(formatData(log.data))}
                              </pre>
                            </details>
                          )}
                          {log.stackTrace && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                Mostra stack trace
                              </summary>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                                {log.stackTrace}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Nessun log trovato con i filtri attuali
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Statistiche generali */}
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">Statistiche Generali</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Totale log:</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasso di errore:</span>
                      <span className={`font-medium ${
                        stats.errorRate > 10 ? 'text-red-600' :
                        stats.errorRate > 5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {stats.errorRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statistiche per livello */}
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">Per Livello</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byLevel).map(([level, count]) => (
                      <div key={level} className="flex justify-between">
                        <span className={`capitalize ${getLevelColor(level).split(' ')[0]}`}>
                          {level}:
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistiche per componente */}
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-3">Per Componente</h3>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {Object.entries(stats.byComponent)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([component, count]) => (
                        <div key={component} className="flex justify-between">
                          <span className="truncate">{component}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="p-6">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold mb-4">Configurazione Debug</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Debug abilitato:</label>
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Livello di log:</label>
                    <select
                      value={config.level}
                      onChange={(e) => handleConfigChange({ level: e.target.value as DebugConfig['level'] })}
                      className="px-3 py-1 border rounded"
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                      <option value="trace">Trace</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Persistenza log:</label>
                    <input
                      type="checkbox"
                      checked={config.persistLogs}
                      onChange={(e) => handleConfigChange({ persistLogs: e.target.checked })}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Max log entries:</label>
                    <input
                      type="number"
                      value={config.maxLogEntries}
                      onChange={(e) => handleConfigChange({ maxLogEntries: parseInt(e.target.value) })}
                      className="px-3 py-1 border rounded w-24"
                      min="100"
                      max="10000"
                      step="100"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Mostra stack trace:</label>
                    <input
                      type="checkbox"
                      checked={config.showStackTrace}
                      onChange={(e) => handleConfigChange({ showStackTrace: e.target.checked })}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Monitoraggio performance:</label>
                    <input
                      type="checkbox"
                      checked={config.enablePerformanceMonitoring}
                      onChange={(e) => handleConfigChange({ enablePerformanceMonitoring: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;