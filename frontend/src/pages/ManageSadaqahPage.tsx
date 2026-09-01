import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assistanceApi, beneficiariesApi, groupsApi } from '../api/client';
import { Assistance, Beneficiary, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  HeartHandshake,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const ManageSadaqahPage: React.FC = () => {
  const [grants, setGrants] = useState<Assistance[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Details Modal
  const [selectedGrant, setSelectedGrant] = useState<Assistance | null>(null);

  const { error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [astRes, benRes, groupsRes] = await Promise.all([
        assistanceApi.list({
          assistance_type: 'SADAQAH',
          beneficiary_id: selectedBeneficiaryId || undefined,
          group_id: selectedGroupId || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: search.trim() || undefined,
          limit: 100,
        }),
        beneficiariesApi.list({ limit: 200 }),
        groupsApi.list(),
      ]);
      setGrants(astRes.data);
      setBeneficiaries(benRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load Sadaqah records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedBeneficiaryId, selectedGroupId, fromDate, toDate]);

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val || 0);
    return '৳' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalDistributed = grants.reduce((s, g) => s + Number(g.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HeartHandshake className="w-7 h-7 text-rose-500" />
            <span>Manage Sadaqah (Non-Recoverable Grants)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review emergency relief distributions, healthcare aid, and group funding splits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermission('assistance.create') && (
            <Button
              variant="primary"
              onClick={() => navigate('/app/assistance/sadaqah/add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Sadaqah
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sadaqah Granted</p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(totalDistributed)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Non-recoverable humanitarian aid</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Grants Recorded</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {grants.length} Distributions
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Fully debited from group ledgers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Repayment Status</p>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-2">
            Non-Recoverable
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">0% repayment obligation</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, beneficiary, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <Select
            value={selectedBeneficiaryId}
            onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
          >
            <option value="">All Beneficiaries</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.group_name})
              </option>
            ))}
          </Select>

          <Select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">All Funding Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs"
              placeholder="From Date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card bodyClassName="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : grants.length === 0 ? (
          <div className="text-center py-16 p-8">
            <HeartHandshake className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Sadaqah Grants Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no distributions matching the selected criteria.</p>
            {hasPermission('assistance.create') && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/assistance/sadaqah/add')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Disburse Sadaqah Grant
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Grant Code</th>
                  <th className="py-2 px-3 sm:px-3.5">Date</th>
                  <th className="py-2 px-3 sm:px-3.5">Beneficiary</th>
                  <th className="py-2 px-3 sm:px-3.5">Funding Groups</th>
                  <th className="py-2 px-3 sm:px-3.5">Purpose</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Grant Amount</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Type</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {grants.map((grant) => (
                  <tr
                    key={grant.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-3 sm:px-3.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {grant.assistance_code}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {grant.disbursement_date}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {grant.beneficiary_name}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-xs">
                      <div className="space-y-0.5">
                        {grant.funding_allocations.map((fa, i) => (
                          <div key={i} className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 text-[11px]">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{fa.group_name}: <b>{formatCurrency(fa.allocated_amount)}</b></span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                      {grant.purpose || 'General Humanitarian Relief'}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {formatCurrency(grant.total_amount)}
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      <Badge variant="danger" size="sm">
                        GRANT
                      </Badge>
                    </td>
                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-7 w-7"
                          onClick={() => setSelectedGrant(grant)}
                          title="View Grant Details & Funding Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedGrant}
        onClose={() => setSelectedGrant(null)}
        title={`Grant Details: ${selectedGrant?.assistance_code}`}
        subtitle={`Sadaqah Grant of ${formatCurrency(selectedGrant?.total_amount)} to ${selectedGrant?.beneficiary_name}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200">
            <p className="font-bold">Humanitarian Non-Recoverable Grant</p>
            <p className="text-[11px] mt-0.5">
              This financial distribution has been recorded as a foundation expense and debited from the funding groups.
            </p>
          </div>

          <div className="space-y-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Beneficiary Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedGrant?.beneficiary_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Disbursement Date:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedGrant?.disbursement_date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Total Grant Amount:</span>
              <span className="font-extrabold text-rose-600 text-sm">{formatCurrency(selectedGrant?.total_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Purpose / Relief Category:</span>
              <span className="font-medium text-slate-900 dark:text-white">{selectedGrant?.purpose || 'General Sadaqah'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Authorized By:</span>
              <span className="text-slate-600 dark:text-slate-400">{selectedGrant?.created_by_name || 'System Admin'}</span>
            </div>
          </div>

          {/* Funding Group Breakdown */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-rose-600" />
              <span>Funding Group Allocations</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Funding Group</th>
                    <th className="p-2.5 text-right">Allocated Amount</th>
                    <th className="p-2.5 text-right">Proportion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedGrant?.funding_allocations.map((fa, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{fa.group_name}</td>
                      <td className="p-2.5 text-right font-semibold">{formatCurrency(fa.allocated_amount)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        {(Number(fa.proportion_ratio || 0) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedGrant?.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 font-semibold mb-0.5">Notes:</p>
              <p className="text-slate-800 dark:text-slate-200">{selectedGrant.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const benId = selectedGrant?.beneficiary_id;
                setSelectedGrant(null);
                navigate(`/app/beneficiaries/ledger?beneficiary_id=${benId}`);
              }}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              View Beneficiary Ledger
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGrant(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
