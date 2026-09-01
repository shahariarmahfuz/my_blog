import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../api/client';
import { AuditLog } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import {
  History,
  Search,
  Eye,
  Calendar,
  Shield,
  User as UserIcon,
  Activity
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { error } = useToast();

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogsApi.list({
        action: actionFilter || undefined,
        entity_name: entityFilter || undefined,
      });
      setLogs(res.data);
    } catch (err) {
      error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const getActionBadgeVariant = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'DISBURSE':
      case 'REPAY':
        return 'success';
      case 'UPDATE':
      case 'EDIT':
        return 'info';
      case 'DELETE':
        return 'danger';
      case 'LOGIN':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Audit Trail & Security Logs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete, tamper-evident audit record of user logins, ledger disbursements, modifications, and repayments.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-48">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DISBURSE">DISBURSE</option>
            <option value="REPAY">REPAY</option>
            <option value="LOGIN">LOGIN</option>
            <option value="DELETE">DELETE</option>
          </Select>
        </div>

        <div className="w-48">
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="groups">Groups</option>
            <option value="members">Members</option>
            <option value="beneficiaries">Beneficiaries</option>
            <option value="contributions">Contributions</option>
            <option value="assistance">Assistance</option>
            <option value="qard_hasan_repayments">Repayments</option>
            <option value="users">Users</option>
            <option value="roles">Roles</option>
          </Select>
        </div>

        {(actionFilter || entityFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActionFilter(''); setEntityFilter(''); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Audit Logs Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 p-8">
            <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Audit Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">Actions performed on financial entities are recorded automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">IP / Client</th>
                  <th className="px-6 py-4 text-right">Inspect Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {log.entity_name} {log.entity_id ? `(#${log.entity_id.substring(0, 8)}...)` : ''}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        title="View Change Payload"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Log Diff Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Record: ${selectedLog?.action} on ${selectedLog?.entity_name}`}
        subtitle={`Performed by ${selectedLog?.user_name} on ${selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs font-mono">
          {selectedLog?.old_values && (
            <div>
              <p className="font-bold text-rose-600 dark:text-rose-400 mb-1.5 font-sans">
                Previous Values (Before Change):
              </p>
              <pre className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl overflow-x-auto text-slate-800 dark:text-slate-200">
                {JSON.stringify(selectedLog.old_values, null, 2)}
              </pre>
            </div>
          )}

          {selectedLog?.new_values && (
            <div>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 font-sans">
                Recorded Values (After Change):
              </p>
              <pre className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl overflow-x-auto text-slate-800 dark:text-slate-200">
                {JSON.stringify(selectedLog.new_values, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-2 text-[11px] text-slate-400 font-sans">
            Client User-Agent: {selectedLog?.user_agent || 'Standard HTTP Client'}
          </div>
        </div>
      </Modal>
    </div>
  );
};
