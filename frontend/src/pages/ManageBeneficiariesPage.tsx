import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { beneficiariesApi, groupsApi, filesApi } from '../api/client';
import { Beneficiary, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  HeartHandshake,
  UserPlus,
  Search,
  Building2,
  Edit2,
  Eye,
  FileSpreadsheet,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  HelpCircle,
  HandCoins,
  Shield,
  User,
  Paperclip,
  Camera,
  PenTool,
  Upload
} from 'lucide-react';

export const ManageBeneficiariesPage: React.FC = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // View Details Modal
  const [selectedBen, setSelectedBen] = useState<Beneficiary | null>(null);

  // Edit Modal State
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editRegistrationDate, setEditRegistrationDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // 1. Personal Info
  const [editFatherOrHusbandName, setEditFatherOrHusbandName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editMaritalStatus, setEditMaritalStatus] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAlternativePhone, setEditAlternativePhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPresentAddress, setEditPresentAddress] = useState('');
  const [editPermanentAddress, setEditPermanentAddress] = useState('');
  const [editReasonForAssistance, setEditReasonForAssistance] = useState('');

  // 2. Emergency Contact
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');

  // 3. Documents
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);

  const [editSignatureUrl, setEditSignatureUrl] = useState('');
  const [editSignatureFile, setEditSignatureFile] = useState<File | null>(null);
  const [editSignaturePreview, setEditSignaturePreview] = useState<string | null>(null);

  const [editDocumentType, setEditDocumentType] = useState('National ID (NID)');
  const [editDocFrontUrl, setEditDocFrontUrl] = useState('');
  const [editDocFrontFile, setEditDocFrontFile] = useState<File | null>(null);
  const [editDocFrontName, setEditDocFrontName] = useState('');

  const [editDocBackUrl, setEditDocBackUrl] = useState('');
  const [editDocBackFile, setEditDocBackFile] = useState<File | null>(null);
  const [editDocBackName, setEditDocBackName] = useState('');

  // 4. Additional Info
  const [editFamilyMembers, setEditFamilyMembers] = useState('');
  const [editFamilyInfo, setEditFamilyInfo] = useState('');
  const [editFinancialCondition, setEditFinancialCondition] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [savingEdit, setSavingEdit] = useState(false);

  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const editSignatureInputRef = useRef<HTMLInputElement>(null);
  const editDocFrontInputRef = useRef<HTMLInputElement>(null);
  const editDocBackInputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [benRes, groupsRes] = await Promise.all([
        beneficiariesApi.list({
          search,
          group_id: selectedGroupId || undefined,
          is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        }),
        groupsApi.list(),
      ]);
      setBeneficiaries(benRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      error('Failed to load beneficiaries data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedGroupId, statusFilter]);

  const getBeneficiaryActions = (b: Beneficiary): ActionMenuItem[] => [
    {
      label: 'View Profile',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => setSelectedBen(b),
    },
    {
      label: 'Assistance Ledger',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: () => navigate(`/app/beneficiaries/ledger?beneficiary_id=${b.id}`),
    },
    {
      label: 'Edit Beneficiary',
      icon: <Edit2 className="w-4 h-4" />,
      hidden: !hasPermission('beneficiaries.edit'),
      onClick: () => openEditModal(b),
    },
  ];

  const openEditModal = (b: Beneficiary) => {
    setEditingBen(b);
    setEditName(b.name);
    setEditGroupId(b.group_id);
    setEditCode(b.beneficiary_code || '');
    setEditRegistrationDate(b.registration_date ? String(b.registration_date).split('T')[0] : '');
    setEditIsActive(b.is_active);

    setEditFatherOrHusbandName(b.father_or_husband_name || '');
    setEditDob(b.date_of_birth ? String(b.date_of_birth).split('T')[0] : '');
    setEditGender(b.gender || '');
    setEditNationalId(b.national_id || '');
    setEditOccupation(b.occupation || '');
    setEditEducation(b.education || '');
    setEditMaritalStatus(b.marital_status || '');
    setEditPhone(b.phone || '');
    setEditAlternativePhone(b.alternative_phone || '');
    setEditEmail(b.email || '');
    setEditPresentAddress(b.present_address || b.address || '');
    setEditPermanentAddress(b.permanent_address || b.address || '');
    setEditReasonForAssistance(b.reason_for_assistance || '');

    setEditEmergencyName(b.emergency_contact_name || '');
    setEditEmergencyRelation(b.emergency_contact_relation || '');
    setEditEmergencyPhone(b.emergency_contact_phone || '');

    setEditPhotoUrl(b.photo_url || '');
    setEditPhotoFile(null);
    setEditPhotoPreview(b.photo_url || null);

    setEditSignatureUrl(b.signature_url || '');
    setEditSignatureFile(null);
    setEditSignaturePreview(b.signature_url || null);

    setEditDocumentType(b.document_type || 'National ID (NID)');
    setEditDocFrontUrl(b.document_front_url || '');
    setEditDocFrontFile(null);
    setEditDocFrontName(b.document_front_url ? 'Existing Front Attached' : '');

    setEditDocBackUrl(b.document_back_url || '');
    setEditDocBackFile(null);
    setEditDocBackName(b.document_back_url ? 'Existing Back Attached' : '');

    setEditFamilyMembers(b.family_members_count ? String(b.family_members_count) : '');
    setEditFamilyInfo(b.family_info || '');
    setEditFinancialCondition(b.financial_condition || '');
    setEditNotes(b.notes || '');
  };

  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditPhotoFile(file);
      setEditPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleEditSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditSignatureFile(file);
      setEditSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleEditDocFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditDocFrontFile(file);
      setEditDocFrontName(file.name);
    }
  };

  const handleEditDocBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditDocBackFile(file);
      setEditDocBackName(file.name);
    }
  };

  const handleUpdateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBen) return;
    if (!editName.trim()) {
      error('Beneficiary Full Name is required.');
      return;
    }
    if (!editGroupId) {
      error('Assigned Group is required.');
      return;
    }

    setSavingEdit(true);
    try {
      let finalPhotoUrl = editPhotoUrl;
      let finalSignatureUrl = editSignatureUrl;
      let finalDocFrontUrl = editDocFrontUrl;
      let finalDocBackUrl = editDocBackUrl;

      // Upload newly selected media to Cloudinary via backend
      if (editPhotoFile) {
        const pFormData = new FormData();
        pFormData.append('file', editPhotoFile);
        pFormData.append('entity_type', 'beneficiary');
        pFormData.append('entity_id', editingBen.id);
        pFormData.append('visibility', 'PUBLIC');
        const pRes = await filesApi.upload(pFormData);
        finalPhotoUrl = pRes.data.file.secure_url;
      }

      if (editSignatureFile) {
        const sFormData = new FormData();
        sFormData.append('file', editSignatureFile);
        sFormData.append('entity_type', 'beneficiary');
        sFormData.append('entity_id', editingBen.id);
        sFormData.append('visibility', 'PRIVATE');
        const sRes = await filesApi.upload(sFormData);
        finalSignatureUrl = sRes.data.file.secure_url;
      }

      if (editDocFrontFile) {
        const dfFormData = new FormData();
        dfFormData.append('file', editDocFrontFile);
        dfFormData.append('entity_type', 'beneficiary');
        dfFormData.append('entity_id', editingBen.id);
        dfFormData.append('visibility', 'PRIVATE');
        const dfRes = await filesApi.upload(dfFormData);
        finalDocFrontUrl = dfRes.data.file.secure_url;
      }

      if (editDocBackFile) {
        const dbFormData = new FormData();
        dbFormData.append('file', editDocBackFile);
        dbFormData.append('entity_type', 'beneficiary');
        dbFormData.append('entity_id', editingBen.id);
        dbFormData.append('visibility', 'PRIVATE');
        const dbRes = await filesApi.upload(dbFormData);
        finalDocBackUrl = dbRes.data.file.secure_url;
      }

      await beneficiariesApi.update(editingBen.id, {
        name: editName.trim(),
        group_id: editGroupId,
        beneficiary_code: editCode.trim() || undefined,
        registration_date: editRegistrationDate || undefined,
        is_active: editIsActive,

        father_or_husband_name: editFatherOrHusbandName.trim() || undefined,
        date_of_birth: editDob || undefined,
        gender: editGender || undefined,
        national_id: editNationalId.trim() || undefined,
        occupation: editOccupation.trim() || undefined,
        education: editEducation.trim() || undefined,
        marital_status: editMaritalStatus || undefined,
        phone: editPhone.trim() || undefined,
        alternative_phone: editAlternativePhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        present_address: editPresentAddress.trim() || undefined,
        permanent_address: editPermanentAddress.trim() || undefined,
        reason_for_assistance: editReasonForAssistance.trim() || undefined,

        emergency_contact_name: editEmergencyName.trim() || undefined,
        emergency_contact_relation: editEmergencyRelation.trim() || undefined,
        emergency_contact_phone: editEmergencyPhone.trim() || undefined,

        photo_url: finalPhotoUrl || undefined,
        signature_url: finalSignatureUrl || undefined,
        document_type: editDocumentType || undefined,
        document_front_url: finalDocFrontUrl || undefined,
        document_back_url: finalDocBackUrl || undefined,

        family_members_count: editFamilyMembers ? parseInt(editFamilyMembers) : undefined,
        family_info: editFamilyInfo.trim() || undefined,
        financial_condition: editFinancialCondition.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      success(`Beneficiary "${editName}" updated successfully!`);
      setEditingBen(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update beneficiary.';
      error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (b: Beneficiary) => {
    try {
      await beneficiariesApi.update(b.id, {
        is_active: !b.is_active,
      });
      success(`Beneficiary "${b.name}" ${!b.is_active ? 'activated' : 'deactivated'} successfully.`);
      loadData();
    } catch (err: any) {
      error('Failed to update beneficiary status');
    }
  };

  const formatCurrency = (val: string | number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <HeartHandshake className="w-7 h-7 text-emerald-500" />
            <span>Manage Beneficiaries</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Directory of all assistance recipients, assigned fund cohorts, and historical aid ledgers.
          </p>
        </div>

        {hasPermission('beneficiaries.create') && (
          <Button
            variant="primary"
            onClick={() => navigate('/app/beneficiaries/add')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add New Beneficiary
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, phone, NID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">All Fund Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Beneficiaries Only</option>
              <option value="INACTIVE">Inactive Beneficiaries Only</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Beneficiaries Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading beneficiaries...</div>
        ) : beneficiaries.length === 0 ? (
          <div className="text-center py-12">
            <HeartHandshake className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No beneficiaries found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new beneficiary.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 sm:px-3.5">Beneficiary Info</th>
                  <th className="py-2 px-3 sm:px-3.5">Assigned Fund Circle</th>
                  <th className="py-2 px-3 sm:px-3.5">Contact</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Qard Hasan Loan</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Outstanding Loan</th>
                  <th className="py-2 px-3 sm:px-3.5 text-center">Status</th>
                  <th className="py-2 px-3 sm:px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {beneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300 overflow-hidden flex-shrink-0 text-[11px]">
                          {b.photo_url ? (
                            <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            b.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight text-xs truncate max-w-[160px]">{b.name}</p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {b.beneficiary_code || 'BEN-UNSET'}
                            </span>
                            {b.occupation && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[100px]">• {b.occupation}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5">
                      <div className="flex items-center space-x-1 text-xs text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[120px]">{b.group_name || 'Unassigned'}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-xs text-slate-500 dark:text-slate-400">
                      {b.phone ? (
                        <p className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-[11px]">{b.phone}</span>
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No phone</span>
                      )}
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {formatCurrency(b.total_qard_hasan_received)}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Repaid: {formatCurrency(b.total_qard_hasan_repaid)}
                      </p>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                        {formatCurrency(b.outstanding_qard_hasan)}
                      </p>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-center">
                      <Badge variant={b.is_active ? 'success' : 'neutral'} size="sm">
                        {b.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="py-2 px-3 sm:px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-0.5">
                        <div className="hidden lg:flex items-center space-x-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => navigate(`/app/beneficiaries/ledger?beneficiary_id=${b.id}`)}
                            title="Open Assistance Ledger"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-7 w-7"
                            onClick={() => setSelectedBen(b)}
                            title="View Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {hasPermission('beneficiaries.edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={() => openEditModal(b)}
                              title="Edit Beneficiary Information"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                          )}
                        </div>

                        <ActionMenu
                          items={getBeneficiaryActions(b)}
                          label={`Actions for ${b.name}`}
                          size="sm"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ==================================================== */}
      {/* VIEW BENEFICIARY DETAILS MODAL                       */}
      {/* ==================================================== */}
      <Modal
        isOpen={!!selectedBen}
        onClose={() => setSelectedBen(null)}
        title={selectedBen?.name || 'Beneficiary Details'}
        subtitle={`Beneficiary Profile • Assigned to ${selectedBen?.group_name || 'No Group'}`}
        maxWidth="2xl"
      >
        <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Summary with Photo & Financial Metrics */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200/80 dark:border-teal-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-500/30 overflow-hidden flex items-center justify-center text-xl font-bold text-teal-700 dark:text-teal-300 flex-shrink-0 shadow-sm">
              {selectedBen?.photo_url ? (
                <img src={selectedBen.photo_url} alt={selectedBen.name} className="w-full h-full object-cover" />
              ) : (
                selectedBen?.name?.charAt(0)
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedBen?.name}
                </h3>
                <Badge variant={selectedBen?.is_active ? 'success' : 'neutral'}>
                  {selectedBen?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="font-mono text-teal-600 dark:text-teal-400 font-bold">
                {selectedBen?.beneficiary_code || 'BEN-UNSET'} • {selectedBen?.group_name}
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Qard Hasan Loan</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {formatCurrency(selectedBen?.total_qard_hasan_received)}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Repaid</span>
                  <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedBen?.total_qard_hasan_repaid)}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Outstanding</span>
                  <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(selectedBen?.outstanding_qard_hasan)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Personal Information */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <User className="w-3.5 h-3.5 text-teal-500" />
              <span>Personal Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Father/Husband:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.father_or_husband_name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Date of Birth:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.date_of_birth ? String(selectedBen.date_of_birth).split('T')[0] : '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Gender:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.gender || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">National ID:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedBen?.national_id || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Occupation:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.occupation || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Education:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.education || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Marital Status:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.marital_status || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Registration Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.registration_date ? String(selectedBen.registration_date).split('T')[0] : '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Mobile Phone:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Alternative Mobile:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.alternative_phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 sm:col-span-2">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.email || '—'}</span>
              </div>
            </div>

            {selectedBen?.present_address && (
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Present Address:</p>
                <p className="text-slate-800 dark:text-slate-200">{selectedBen.present_address}</p>
              </div>
            )}
            {selectedBen?.permanent_address && (
              <div className="pt-1">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Permanent Address:</p>
                <p className="text-slate-800 dark:text-slate-200">{selectedBen.permanent_address}</p>
              </div>
            )}
          </div>

          {/* 2. Emergency Contact */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Emergency Contact & Guarantor
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.emergency_contact_name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Relation</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.emergency_contact_relation || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Mobile</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBen?.emergency_contact_phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* 3. Documents & Media */}
          {(selectedBen?.signature_url || selectedBen?.document_front_url || selectedBen?.document_back_url) && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Documents & Verification Media
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedBen.signature_url && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Signature</span>
                    <img src={selectedBen.signature_url} alt="Signature" className="h-14 max-w-full mx-auto object-contain" />
                  </div>
                )}
                {selectedBen.document_front_url && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ID Document Front</span>
                    <a href={selectedBen.document_front_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline text-[11px]">
                      View Front Image/PDF
                    </a>
                  </div>
                )}
                {selectedBen.document_back_url && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ID Document Back</span>
                    <a href={selectedBen.document_back_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline text-[11px]">
                      View Back Image/PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Additional Information */}
          {(selectedBen?.reason_for_assistance || selectedBen?.family_info || selectedBen?.financial_condition || selectedBen?.notes) && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              {selectedBen.reason_for_assistance && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Reason / Need for Assistance:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedBen.reason_for_assistance}</p>
                </div>
              )}
              {selectedBen.financial_condition && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Financial Condition & Income:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedBen.financial_condition}</p>
                </div>
              )}
              {selectedBen.family_info && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Family / Dependents Background:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedBen.family_info}</p>
                </div>
              )}
              {selectedBen.notes && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Internal Case Notes:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedBen.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBen(null)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const benId = selectedBen?.id;
                setSelectedBen(null);
                navigate(`/app/beneficiaries/ledger?beneficiary_id=${benId}`);
              }}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            >
              Open Assistance Ledger
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* EDIT BENEFICIARY MODAL                               */}
      {/* ==================================================== */}
      <Modal
        isOpen={!!editingBen}
        onClose={() => setEditingBen(null)}
        title={`Edit Beneficiary: ${editingBen?.name}`}
        subtitle="Only Full Name and Group are required. All other fields remain optional."
        maxWidth="3xl"
      >
        <form onSubmit={handleUpdateBeneficiary} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 text-xs">
          {/* Basic Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Beneficiary ID (Editable)"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="e.g. B-0001 or BEN-2026-001"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Human-facing ID</p>
              </div>

              <div>
                <Select
                  label="Assigned Fund Group *"
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  required
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Input
                  label="Registration Date (Optional)"
                  type="date"
                  value={editRegistrationDate}
                  onChange={(e) => setEditRegistrationDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 1. Personal Information */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              1. Personal Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <Input
                  label="Beneficiary Full Name *"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Input
                label="Father / Husband's Name (Optional)"
                value={editFatherOrHusbandName}
                onChange={(e) => setEditFatherOrHusbandName(e.target.value)}
              />

              <Input
                label="Date of Birth (Optional)"
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
              />

              <Select
                label="Gender (Optional)"
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </Select>

              <Input
                label="National ID / Birth Cert (Optional)"
                value={editNationalId}
                onChange={(e) => setEditNationalId(e.target.value)}
              />

              <Input
                label="Occupation (Optional)"
                value={editOccupation}
                onChange={(e) => setEditOccupation(e.target.value)}
              />

              <Input
                label="Education (Optional)"
                value={editEducation}
                onChange={(e) => setEditEducation(e.target.value)}
              />

              <Select
                label="Marital Status (Optional)"
                value={editMaritalStatus}
                onChange={(e) => setEditMaritalStatus(e.target.value)}
              >
                <option value="">Select Marital Status</option>
                <option value="Married">Married</option>
                <option value="Single">Single</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </Select>

              <Input
                label="Mobile Phone (Optional)"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />

              <Input
                label="Alternative Mobile (Optional)"
                type="tel"
                value={editAlternativePhone}
                onChange={(e) => setEditAlternativePhone(e.target.value)}
              />

              <Input
                label="Email (Optional)"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Present Address (Optional)"
                  value={editPresentAddress}
                  onChange={(e) => setEditPresentAddress(e.target.value)}
                />
                <Input
                  label="Permanent Address (Optional)"
                  value={editPermanentAddress}
                  onChange={(e) => setEditPermanentAddress(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <Textarea
                  label="Reason / Need for Assistance (Optional)"
                  value={editReasonForAssistance}
                  onChange={(e) => setEditReasonForAssistance(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Emergency Contact */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              2. Emergency Contact & Guarantor
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Name (Optional)"
                value={editEmergencyName}
                onChange={(e) => setEditEmergencyName(e.target.value)}
              />
              <Input
                label="Relation (Optional)"
                value={editEmergencyRelation}
                onChange={(e) => setEditEmergencyRelation(e.target.value)}
              />
              <Input
                label="Phone (Optional)"
                type="tel"
                value={editEmergencyPhone}
                onChange={(e) => setEditEmergencyPhone(e.target.value)}
              />
            </div>
          </div>

          {/* 3. Documents & Media (Cloudinary) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              3. Documents & Media (Cloudinary)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Photo */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Photo</span>
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-700">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={editPhotoInputRef}
                  onChange={handleEditPhotoSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editPhotoInputRef.current?.click()}
                >
                  {editPhotoPreview ? 'Replace' : 'Upload'}
                </Button>
              </div>

              {/* Signature */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Signature</span>
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-700">
                  {editSignaturePreview ? (
                    <img src={editSignaturePreview} alt="Signature" className="w-full h-full object-contain p-1" />
                  ) : (
                    <PenTool className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={editSignatureInputRef}
                  onChange={handleEditSignatureSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editSignatureInputRef.current?.click()}
                >
                  {editSignaturePreview ? 'Replace' : 'Upload'}
                </Button>
              </div>

              {/* ID Front */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase text-center">
                  ID Front
                </span>
                {editDocFrontName && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate text-center">
                    📄 {editDocFrontName}
                  </p>
                )}
                <input
                  type="file"
                  ref={editDocFrontInputRef}
                  onChange={handleEditDocFrontSelect}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editDocFrontInputRef.current?.click()}
                  className="w-full"
                >
                  {editDocFrontName ? 'Replace' : 'Upload Front'}
                </Button>
              </div>

              {/* ID Back */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase text-center">
                  ID Back
                </span>
                {editDocBackName && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate text-center">
                    📄 {editDocBackName}
                  </p>
                )}
                <input
                  type="file"
                  ref={editDocBackInputRef}
                  onChange={handleEditDocBackSelect}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editDocBackInputRef.current?.click()}
                  className="w-full"
                >
                  {editDocBackName ? 'Replace' : 'Upload Back'}
                </Button>
              </div>
            </div>
          </div>

          {/* 4. Additional Information */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
              4. Additional Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Family Members Count (Optional)"
                type="number"
                value={editFamilyMembers}
                onChange={(e) => setEditFamilyMembers(e.target.value)}
              />
              <Input
                label="Financial Condition / Income (Optional)"
                value={editFinancialCondition}
                onChange={(e) => setEditFinancialCondition(e.target.value)}
              />
              <Textarea
                label="Family / Dependents Info (Optional)"
                value={editFamilyInfo}
                onChange={(e) => setEditFamilyInfo(e.target.value)}
              />
              <Textarea
                label="Case Notes (Optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Active Beneficiary Status</p>
              <p className="text-[11px] text-slate-500">Allow disbursing new assistance records for this beneficiary</p>
            </div>
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingBen(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={savingEdit}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
