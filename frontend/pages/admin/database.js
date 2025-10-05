// frontend/pages/admin/database.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import AdminGuard from '../../components/guards/AdminGuard';
import AppLayout from '../../components/layout/AppLayout';
import toast from '../../lib/toast';
import { 
  executeDatabaseQuery, 
  listDatabaseTables, 
  getTableSchema 
} from '../../services/admin';

export default function DatabaseQueryInterface() {
  const router = useRouter();
  const { user } = useAuth();

  // Query state
  const [query, setQuery] = useState('');
  const [justification, setJustification] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [executing, setExecuting] = useState(false);

  // Table browser state
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [loadingTables, setLoadingTables] = useState(true);

  // Query history (stored in localStorage)
  const [queryHistory, setQueryHistory] = useState([]);
  
  // Password modal for step-up auth
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingQuery, setPendingQuery] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('query'); // 'query' | 'tables'

  useEffect(() => {
    loadTables();
    loadQueryHistory();
  }, []);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const data = await listDatabaseTables();
      setTables(data);
    } catch (err) {
      toast.error(`Failed to load tables: ${err.message}`);
    } finally {
      setLoadingTables(false);
    }
  };

  const loadQueryHistory = () => {
    try {
      const history = localStorage.getItem('admin_query_history');
      if (history) {
        setQueryHistory(JSON.parse(history));
      }
    } catch (err) {
      console.error('Failed to load query history:', err);
    }
  };

  const saveQueryToHistory = (q, result) => {
    const historyItem = {
      query: q,
      timestamp: new Date().toISOString(),
      rowCount: result.row_count,
      executionTime: result.execution_time_ms
    };
    
    const newHistory = [historyItem, ...queryHistory].slice(0, 50); // Keep last 50
    setQueryHistory(newHistory);
    localStorage.setItem('admin_query_history', JSON.stringify(newHistory));
  };

  const handleExecuteQuery = () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }
    if (!justification.trim() || justification.length < 10) {
      toast.error('Please provide a justification (min 10 characters)');
      return;
    }

    // Show password modal for step-up auth
    setPendingQuery({ query, justification });
    setShowPasswordModal(true);
  };

  const confirmExecuteQuery = async () => {
    if (!password) {
      toast.error('Password is required');
      return;
    }

    try {
      setExecuting(true);
      setShowPasswordModal(false);
      
      const result = await executeDatabaseQuery({
        query: pendingQuery.query,
        justification: pendingQuery.justification,
        password
      });

      setQueryResult(result);
      saveQueryToHistory(pendingQuery.query, result);
      
      toast.success(`Query executed successfully (${result.row_count} rows in ${result.execution_time_ms.toFixed(2)}ms)`);
    } catch (err) {
      toast.error(`Query failed: ${err.message}`);
    } finally {
      setExecuting(false);
      setPassword('');
      setPendingQuery(null);
    }
  };

  const loadTableSchema = async (tableName) => {
    try {
      const schema = await getTableSchema(tableName);
      setTableSchema(schema);
      setSelectedTable(tableName);
    } catch (err) {
      toast.error(`Failed to load schema: ${err.message}`);
    }
  };

  const insertTableIntoQuery = (tableName) => {
    const sampleQuery = `SELECT * FROM ${tableName} LIMIT 100;`;
    setQuery(sampleQuery);
    setActiveTab('query');
    toast.success(`Inserted sample query for ${tableName}`);
  };

  const loadHistoryQuery = (historyQuery) => {
    setQuery(historyQuery);
    toast.success('Query loaded from history');
  };

  const exportResultsToCSV = () => {
    if (!queryResult || queryResult.rows.length === 0) {
      toast.error('No results to export');
      return;
    }

    const csv = [
      queryResult.columns.join(','),
      ...queryResult.rows.map(row => 
        queryResult.columns.map(col => {
          const val = row[col];
          if (val === null) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results exported to CSV');
  };

  return (
    <AdminGuard>
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🗄️ Database Query Interface
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Execute read-only SQL queries for debugging and analysis
                </p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                ← Back to Admin
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="glass-card p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('query')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'query'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                📝 Query Editor
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'tables'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                📊 Table Browser
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'history'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                🕒 History ({queryHistory.length})
              </button>
            </div>
          </div>

          {/* Query Editor Tab */}
          {activeTab === 'query' && (
            <div className="space-y-4">
              {/* SQL Editor */}
              <div className="glass-card p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SQL Query (SELECT only)
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days' LIMIT 100;"
                  className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  style={{ fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}
                />
                
                {/* Query Templates */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setQuery('SELECT * FROM users ORDER BY created_at DESC LIMIT 100;')}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Recent Users
                  </button>
                  <button
                    onClick={() => setQuery('SELECT * FROM jobs WHERE created_at > NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC;')}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Recent Jobs
                  </button>
                  <button
                    onClick={() => setQuery('SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC;')}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Application Stats
                  </button>
                  <button
                    onClick={() => setQuery('')}
                    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Justification */}
              <div className="glass-card p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Justification (required)
                </label>
                <input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why are you running this query? (e.g., Investigating user signup issue)"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Execute Button */}
              <div className="glass-card p-6">
                <button
                  onClick={handleExecuteQuery}
                  disabled={executing}
                  className={`w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium transition ${
                    executing 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-blue-600'
                  }`}
                >
                  {executing ? '⏳ Executing Query...' : '▶️ Execute Query'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Requires password confirmation. All queries are audit logged.
                </p>
              </div>

              {/* Query Results */}
              {queryResult && (
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Query Results
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {queryResult.row_count} rows in {queryResult.execution_time_ms.toFixed(2)}ms
                      </span>
                      <button
                        onClick={exportResultsToCSV}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                      >
                        📥 Export CSV
                      </button>
                    </div>
                  </div>

                  {queryResult.rows.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No rows returned
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {queryResult.columns.map((col, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {queryResult.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {queryResult.columns.map((col, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300 font-mono"
                                >
                                  {row[col] === null ? (
                                    <span className="text-gray-400 italic">NULL</span>
                                  ) : typeof row[col] === 'object' ? (
                                    JSON.stringify(row[col])
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Table Browser Tab */}
          {activeTab === 'tables' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table List */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Database Tables
                </h3>
                {loadingTables ? (
                  <p className="text-gray-500 dark:text-gray-400">Loading tables...</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tables.map((table) => (
                      <div
                        key={table.table_name}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedTable === table.table_name
                            ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => loadTableSchema(table.table_name)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {table.table_name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {table.row_count} rows
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Table Schema */}
              <div className="lg:col-span-2 glass-card p-6">
                {tableSchema ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {tableSchema.table_name}
                      </h3>
                      <button
                        onClick={() => insertTableIntoQuery(tableSchema.table_name)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        📝 Insert Query
                      </button>
                    </div>
                    
                    <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Row Count:</strong> {tableSchema.row_count.toLocaleString()}
                      </p>
                    </div>

                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Columns</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Column
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Nullable
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Default
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {tableSchema.columns.map((col, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                {col.column_name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
                                {col.data_type}
                                {col.max_length && `(${col.max_length})`}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {col.is_nullable ? (
                                  <span className="text-green-600 dark:text-green-400">YES</span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">NO</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
                                {col.column_default || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                    Select a table to view its schema
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Query History Tab */}
          {activeTab === 'history' && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Query History
              </h3>
              {queryHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No query history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {queryHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                      onClick={() => loadHistoryQuery(item.query)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {item.rowCount} rows • {item.executionTime.toFixed(2)}ms
                        </span>
                      </div>
                      <pre className="text-sm font-mono text-gray-900 dark:text-white overflow-x-auto">
                        {item.query}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🔐 Confirm Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This operation requires password confirmation for security.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmExecuteQuery()}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPassword('');
                      setPendingQuery(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmExecuteQuery}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AdminGuard>
  );
}
