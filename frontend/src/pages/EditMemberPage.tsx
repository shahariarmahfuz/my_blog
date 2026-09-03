import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { membersApi, groupsApi, filesApi } from '../api/client';
import { Member, Group } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  Building2,
  Save,
  X,
  ArrowLeft,
  Upload,
  Camera,
  PenTool,
  Paperclip,
  Trash2,
  User,
  Shield,
  PhoneCall,
  UserCheck,
  FileText,
  Calendar,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye
} from 'lucide-react';

export const EditMemberPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  // Form State
  // Basic Information
  const [memberCode, setMemberCode] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [groupId, setGroupId] = useState('');
  const [monthlyContributionAmount, setMonthlyContributionAmount] = useState('');
  const [isActive, setIsActive] = useState(true);

  // 1. Personal Information
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  const [email, setEmail] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');

  // 2. Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // 3. Reference
  const [referenceName, setReferenceName] = useState('');
  const [referenceRelation, setReferenceRelation] = useState('');
  const [referencePhone, setReferencePhone] = useState('');

  // 4. Commitment
  const [commitmentAccepted, setCommitmentAccepted] = useState(false);

  // 5. Documents & Media (Cloudinary)
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState('National ID (NID)');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentFileName, setDocumentFileName] = useState('');

  // 6. Additional Information
  const [reasonForJoining, setReasonForJoining] = useState('');
  const [notes, setNotes] = useState('');

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load existing member and groups list
  useEffect(() => {
    if (!memberId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [memberRes, groupsRes] = await Promise.all([
          membersApi.get(memberId),
          groupsApi.list(),
        ]);

        const m = memberRes.data;
        setMember(m);
        const memberGroups = groupsRes.data.filter(g => g.group_type !== 'EXTERNAL_FUND' || g.id === m.group_id);
        setGroups(memberGroups);

        // Pre-fill all form state
        setMemberCode(m.member_code || '');
        setJoinDate(m.join_date ? String(m.join_date).split('T')[0] : '');
        setGroupId(m.group_id || '');
        setMonthlyContributionAmount(m.monthly_contribution_amount !== undefined && m.monthly_contribution_amount !== null ? String(m.monthly_contribution_amount) : '');
        setIsActive(m.is_active !== undefined ? m.is_active : true);

        setName(m.name || '');
        setFatherName(m.father_name || '');
        setMotherName(m.mother_name || '');
        setDob(m.date_of_birth ? String(m.date_of_birth).split('T')[0] : '');
        setGender(m.gender || '');
        setNationalId(m.national_id || '');
        setOccupation(m.occupation || '');
        setEducation(m.education || '');
        setBloodGroup(m.blood_group || '');
        setMaritalStatus(m.marital_status || '');
        setPhone(m.phone || '');
        setAlternativePhone(m.alternative_phone || '');
        setEmail(m.email || '');
        setPresentAddress(m.present_address || m.address || '');
        setPermanentAddress(m.permanent_address || m.address || '');

        setEmergencyName(m.emergency_contact_name || '');
        setEmergencyRelation(m.emergency_contact_relation || '');
        setEmergencyPhone(m.emergency_contact_phone || m.emergency_contact || '');

        setReferenceName(m.reference_name || '');
        setReferenceRelation(m.reference_relation || '');
        setReferencePhone(m.reference_phone || '');

        setCommitmentAccepted(m.commitment_accepted || false);

        setPhotoUrl(m.photo_url || '');
        setSignatureUrl(m.signature_url || '');
        setDocumentType(m.document_type || 'National ID (NID)');
        setDocumentUrl(m.document_url || '');

        setReasonForJoining(m.reason_for_joining || '');
        setNotes(m.notes || '');
      } catch (err: any) {
        console.error('Failed to load member for edit:', err);
        error(err.response?.data?.detail || 'Member not found or failed to load member details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [memberId]);

  // File Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, JPEG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Photo size must be under 5MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select an image file for the signature.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      error('Signature size must be under 2MB.');
      return;
    }

    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      error('Document size must be under 10MB.');
      return;
    }

    setDocumentFile(file);
    setDocumentFileName(file.name);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removeSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    setSignatureUrl('');
    if (signatureInputRef.current) signatureInputRef.current.value = '';
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentFileName('');
    setDocumentUrl('');
    if (docInputRef.current) docInputRef.current.value = '';
  };

  // Submit Handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Member Full Name is required.');
      return;
    }

    if (!groupId) {
      error('Assigned Fund Group is required.');
      return;
    }

    if (!member) return;

    setSaving(true);
    let finalPhotoUrl = photoUrl;
    let finalSignatureUrl = signatureUrl;
    let finalDocumentUrl = documentUrl;

    try {
      // 1. Upload photo if newly selected
      if (photoFile) {
        setUploadingDocs(true);
        const pFormData = new FormData();
        pFormData.append('file', photoFile);
        pFormData.append('entity_type', 'member');
        pFormData.append('visibility', 'PUBLIC');
        const photoRes = await filesApi.upload(pFormData);
        finalPhotoUrl = photoRes.data.file.secure_url;
      }

      // 2. Upload signature if newly selected
      if (signatureFile) {
        setUploadingDocs(true);
        const sFormData = new FormData();
        sFormData.append('file', signatureFile);
        sFormData.append('entity_type', 'member');
        sFormData.append('visibility', 'PRIVATE');
        const sigRes = await filesApi.upload(sFormData);
        finalSignatureUrl = sigRes.data.file.secure_url;
      }

      // 3. Upload document if newly selected
      if (documentFile) {
        setUploadingDocs(true);
        const dFormData = new FormData();
        dFormData.append('file', documentFile);
        dFormData.append('entity_type', 'member');
        dFormData.append('visibility', 'PRIVATE');
        const docRes = await filesApi.upload(dFormData);
        finalDocumentUrl = docRes.data.file.secure_url;
      }

      setUploadingDocs(false);

      // 4. Update member details in backend
      const payload: any = {
        name: name.trim(),
        group_id: groupId,
        member_code: memberCode.trim() || null,
        join_date: joinDate || null,
        monthly_contribution_amount: monthlyContributionAmount !== '' ? parseFloat(monthlyContributionAmount) : null,
        is_active: isActive,

        father_name: fatherName.trim() || null,
        mother_name: motherName.trim() || null,
        date_of_birth: dob || null,
        gender: gender || null,
        national_id: nationalId.trim() || null,
        occupation: occupation.trim() || null,
        education: education.trim() || null,
        blood_group: bloodGroup || null,
        marital_status: maritalStatus || null,
        phone: phone.trim() || null,
        alternative_phone: alternativePhone.trim() || null,
        email: email.trim() || null,
        present_address: presentAddress.trim() || null,
        permanent_address: permanentAddress.trim() || null,

        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relation: emergencyRelation.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,

        reference_name: referenceName.trim() || null,
        reference_relation: referenceRelation.trim() || null,
        reference_phone: referencePhone.trim() || null,

        commitment_accepted: commitmentAccepted,

        photo_url: finalPhotoUrl || null,
        signature_url: finalSignatureUrl || null,
        document_type: finalDocumentUrl ? documentType : null,
        document_url: finalDocumentUrl || null,

        reason_for_joining: reasonForJoining.trim() || null,
        notes: notes.trim() || null,
      };

      await membersApi.update(member.id, payload);
      success(`Member "${name.trim()}" updated successfully.`);
      navigate(`/app/members/${payload.member_code || member.member_code || member.id}`);
    } catch (err: any) {
      console.error('Failed to update member:', err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to save changes. Please check the inputs.';
      error(msg);
    } finally {
      setSaving(false);
      setUploadingDocs(false);
    }
  };

  const handleCancel = () => {
    if (member) {
      navigate(`/app/members/${member.member_code || member.id}`);
    } else {
      navigate('/app/members/manage');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Link to="/app/members/manage" className="hover:text-slate-600 dark:hover:text-slate-200">Members</Link>
          <span>/</span>
          <span>Loading Member Editor...</span>
        </div>
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading member data for editing...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Link to="/app/members/manage" className="hover:text-slate-600 dark:hover:text-slate-200">Members</Link>
          <span>/</span>
          <span>Not Found</span>
        </div>
        <Card>
          <div className="text-center py-16 space-y-4">
            <Users2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Member Not Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We could not find any member with the identifier "{memberId}".
            </p>
            <Button variant="primary" onClick={() => navigate('/app/members/manage')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Member Directory
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
            <span>Edit Member: {member.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            <span className="font-mono text-slate-500 dark:text-slate-400">
              ID: {member.member_code || 'M-UNSET'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {member.group_name || 'No Group'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Badge variant={isActive ? 'success' : 'neutral'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveChanges}
            isLoading={saving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {saving ? (uploadingDocs ? 'Saving...' : 'Saving...') : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSaveChanges} className="space-y-5">
        {/* Basic Information */}
        <Card title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Input
                label="Member ID (Editable)"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="e.g. M-0008 or MEM-2026-008"
              />
            </div>

            <div>
              <Select
                label="Assigned Fund Group *"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                <option value="">Select a Group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code || 'GRP'})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Input
                label="Join Date (Optional)"
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Monthly Contribution Amount (৳)"
                type="number"
                min="0"
                step="10"
                placeholder="500 (Global default)"
                value={monthlyContributionAmount}
                onChange={(e) => setMonthlyContributionAmount(e.target.value)}
              />
            </div>

            <div className="sm:col-span-3 pt-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Active Member Status</span>
              </label>
            </div>
          </div>
        </Card>

        {/* 1. Personal Information */}
        <Card title="1. Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Full Legal Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brother Tariq Rahman"
                required
                autoFocus
              />
            </div>

            <Input
              label="Father's Name (Optional)"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="Father's full name"
            />

            <Input
              label="Mother's Name (Optional)"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="Mother's full name"
            />

            <Input
              label="Date of Birth (Optional)"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />

            <Select
              label="Gender (Optional)"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>

            <Input
              label="National ID / Birth Cert (Optional)"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="NID or Birth Certificate Number"
            />

            <Input
              label="Occupation / Workplace (Optional)"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Teacher, Business Owner"
            />

            <Input
              label="Education / Degree (Optional)"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. B.Sc, Fazil, HSC"
            />

            <Select
              label="Blood Group (Optional)"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </Select>

            <Select
              label="Marital Status (Optional)"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
            >
              <option value="">Select Marital Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </Select>

            <Input
              label="Primary Mobile Phone (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +880 1700 000000"
            />

            <Input
              label="Alternative Mobile (Optional)"
              type="tel"
              value={alternativePhone}
              onChange={(e) => setAlternativePhone(e.target.value)}
              placeholder="Secondary contact number"
            />

            <Input
              label="Email Address (Optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@example.com"
            />

            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Present / Residential Address (Optional)"
                value={presentAddress}
                onChange={(e) => setPresentAddress(e.target.value)}
                placeholder="Current living address, street, city..."
                rows={2}
              />
              <Textarea
                label="Permanent / Village Address (Optional)"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                placeholder="Permanent village/home address..."
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* 2 & 3. Emergency Contact & Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="2. Emergency Contact">
            <div className="space-y-4">
              <Input
                label="Emergency Contact Name (Optional)"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Full name of contact"
              />
              <Input
                label="Relationship (Optional)"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. Brother, Spouse, Father"
              />
              <Input
                label="Emergency Phone (Optional)"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </Card>

          <Card title="3. Reference Person">
            <div className="space-y-4">
              <Input
                label="Reference Name (Optional)"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                placeholder="Full name of referee"
              />
              <Input
                label="Relationship / Designation (Optional)"
                value={referenceRelation}
                onChange={(e) => setReferenceRelation(e.target.value)}
                placeholder="e.g. Foundation Member, Colleague"
              />
              <Input
                label="Reference Phone (Optional)"
                type="tel"
                value={referencePhone}
                onChange={(e) => setReferencePhone(e.target.value)}
                placeholder="Referee contact phone"
              />
            </div>
          </Card>
        </div>

        {/* 4. Commitment & Declaration */}
        <Card title="4. Commitment & Declaration">
          <div className="space-y-4">
            <label className="flex items-start space-x-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={commitmentAccepted}
                onChange={(e) => setCommitmentAccepted(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5 mt-0.5 cursor-pointer"
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-xs">
                  Member has accepted foundation constitution & financial bylaws
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm the member has reviewed and agreed to the mutual accountability terms.
                </p>
              </div>
            </label>

            <Textarea
              label="Reason for Joining (Optional)"
              value={reasonForJoining}
              onChange={(e) => setReasonForJoining(e.target.value)}
              placeholder="Why the member is participating in the foundation..."
              rows={2}
            />

            <Textarea
              label="Administrative Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal administrative comments or audit remarks..."
              rows={2}
            />
          </div>
        </Card>

        {/* 5. Documents & Media (Cloudinary) */}
        <Card title="5. Documents & Media">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Member Photo */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <span>Member Photo</span>
                </div>

                <div className="w-28 h-28 mx-auto rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center relative group">
                  {photoPreview ? (
                    <img src={photoPreview} alt="New Preview" className="w-full h-full object-cover" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Current Photo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full text-xs"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  {photoPreview || photoUrl ? 'Replace Photo' : 'Upload Photo'}
                </Button>
                {(photoPreview || photoUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePhoto}
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 2. Member Signature */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <PenTool className="w-4 h-4 text-teal-500" />
                  <span>Digital Signature</span>
                </div>

                <div className="w-full h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center p-2">
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="New Signature" className="max-h-full max-w-full object-contain" />
                  ) : signatureUrl ? (
                    <img src={signatureUrl} alt="Current Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No signature on file</span>
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={signatureInputRef}
                onChange={handleSignatureSelect}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => signatureInputRef.current?.click()}
                  className="w-full text-xs"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  {signaturePreview || signatureUrl ? 'Replace Signature' : 'Upload Signature'}
                </Button>
                {(signaturePreview || signatureUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeSignature}
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                    title="Remove Signature"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 3. Identity Document */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <Paperclip className="w-4 h-4 text-sky-500" />
                  <span>Identity Document (NID/Passport)</span>
                </div>

                <div className="space-y-2">
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    <option value="National ID (NID)">National ID (NID)</option>
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Other Document">Other Document</option>
                  </Select>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    {documentFileName ? (
                      <p className="font-semibold text-emerald-600 truncate">{documentFileName}</p>
                    ) : documentUrl ? (
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 font-semibold text-sky-600 hover:underline truncate max-w-full"
                      >
                        <span>View Current Document</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-slate-400 italic">No document attached</p>
                    )}
                  </div>
                </div>
              </div>

              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocumentSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => docInputRef.current?.click()}
                  className="w-full text-xs"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  {documentFileName || documentUrl ? 'Replace Document' : 'Upload Document'}
                </Button>
                {(documentFileName || documentUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeDocument}
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                    title="Remove Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Bottom Save & Cancel Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Only Full Name and Group are mandatory. Changes save immediately.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="w-full sm:w-auto"
              leftIcon={<Save className="w-4 h-4" />}
            >
              {saving ? (uploadingDocs ? 'Uploading Media...' : 'Saving Changes...') : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
