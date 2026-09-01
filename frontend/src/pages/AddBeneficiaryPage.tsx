import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { beneficiariesApi, groupsApi, filesApi } from '../api/client';
import { Group } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import {
  UserPlus,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Shield,
  PhoneCall,
  User,
  FileText,
  Upload,
  Camera,
  PenTool,
  Paperclip,
  Users
} from 'lucide-react';

export const AddBeneficiaryPage: React.FC = () => {
  // Basic Information
  const [beneficiaryCode, setBeneficiaryCode] = useState('');
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupId, setGroupId] = useState('');

  // 1. Personal Information
  const [name, setName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');
  const [email, setEmail] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [reasonForAssistance, setReasonForAssistance] = useState('');

  // 2. Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // 3. Documents & Media (Cloudinary via backend)
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState('National ID (NID)');
  const [docFrontUrl, setDocFrontUrl] = useState('');
  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docFrontName, setDocFrontName] = useState('');

  const [docBackUrl, setDocBackUrl] = useState('');
  const [docBackFile, setDocBackFile] = useState<File | null>(null);
  const [docBackName, setDocBackName] = useState('');

  // 4. Additional Information
  const [familyMembersCount, setFamilyMembersCount] = useState('');
  const [familyInfo, setFamilyInfo] = useState('');
  const [financialCondition, setFinancialCondition] = useState('');
  const [notes, setNotes] = useState('');

  // Groups and UX state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [createdBenId, setCreatedBenId] = useState<string | null>(null);
  const [createdBenName, setCreatedBenName] = useState<string>('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const docFrontInputRef = useRef<HTMLInputElement>(null);
  const docBackInputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToast();
  const navigate = useNavigate();

  // Load active fund groups and next auto-generated beneficiary code
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingGroups(true);
        const [gRes, codeRes] = await Promise.all([
          groupsApi.list({ is_active: true }),
          beneficiariesApi.getNextCode().catch(() => ({ data: { next_beneficiary_code: 'BEN-0001' } })),
        ]);
        setGroups(gRes.data);
        if (gRes.data.length > 0) {
          setGroupId(gRes.data[0].id);
        }
        if (codeRes?.data?.next_beneficiary_code) {
          setBeneficiaryCode(codeRes.data.next_beneficiary_code);
        }
      } catch (err) {
        error('Failed to load initial form data');
      } finally {
        setLoadingGroups(false);
      }
    };
    initData();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleDocFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFrontFile(file);
      setDocFrontName(file.name);
    }
  };

  const handleDocBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocBackFile(file);
      setDocBackName(file.name);
    }
  };

  const handleReset = () => {
    setName('');
    if (groups.length > 0) {
      setGroupId(groups[0].id);
    }
    setRegistrationDate(new Date().toISOString().split('T')[0]);
    setFatherOrHusbandName('');
    setDob('');
    setGender('');
    setNationalId('');
    setOccupation('');
    setEducation('');
    setMaritalStatus('');
    setPhone('');
    setAlternativePhone('');
    setEmail('');
    setPresentAddress('');
    setPermanentAddress('');
    setReasonForAssistance('');
    setEmergencyName('');
    setEmergencyRelation('');
    setEmergencyPhone('');
    setPhotoUrl('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSignatureUrl('');
    setSignatureFile(null);
    setSignaturePreview(null);
    setDocumentType('National ID (NID)');
    setDocFrontUrl('');
    setDocFrontFile(null);
    setDocFrontName('');
    setDocBackUrl('');
    setDocBackFile(null);
    setDocBackName('');
    setFamilyMembersCount('');
    setFamilyInfo('');
    setFinancialCondition('');
    setNotes('');
    setCreatedBenId(null);
    setCreatedBenName('');

    beneficiariesApi.getNextCode().then((res) => {
      if (res.data?.next_beneficiary_code) setBeneficiaryCode(res.data.next_beneficiary_code);
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Beneficiary Full Name is required.');
      return;
    }
    if (!groupId) {
      error('Please select an Assigned Fund Group.');
      return;
    }

    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl;
      let finalSignatureUrl = signatureUrl;
      let finalDocFrontUrl = docFrontUrl;
      let finalDocBackUrl = docBackUrl;

      // 1. Upload documents to Cloudinary via backend if files were selected
      if (photoFile || signatureFile || docFrontFile || docBackFile) {
        setUploadingDocs(true);
      }

      if (photoFile) {
        const pFormData = new FormData();
        pFormData.append('file', photoFile);
        pFormData.append('entity_type', 'beneficiary');
        pFormData.append('visibility', 'PUBLIC');
        const pRes = await filesApi.upload(pFormData);
        finalPhotoUrl = pRes.data.file.secure_url;
      }

      if (signatureFile) {
        const sFormData = new FormData();
        sFormData.append('file', signatureFile);
        sFormData.append('entity_type', 'beneficiary');
        sFormData.append('visibility', 'PRIVATE');
        const sRes = await filesApi.upload(sFormData);
        finalSignatureUrl = sRes.data.file.secure_url;
      }

      if (docFrontFile) {
        const dfFormData = new FormData();
        dfFormData.append('file', docFrontFile);
        dfFormData.append('entity_type', 'beneficiary');
        dfFormData.append('visibility', 'PRIVATE');
        const dfRes = await filesApi.upload(dfFormData);
        finalDocFrontUrl = dfRes.data.file.secure_url;
      }

      if (docBackFile) {
        const dbFormData = new FormData();
        dbFormData.append('file', docBackFile);
        dbFormData.append('entity_type', 'beneficiary');
        dbFormData.append('visibility', 'PRIVATE');
        const dbRes = await filesApi.upload(dbFormData);
        finalDocBackUrl = dbRes.data.file.secure_url;
      }

      // 2. Create Beneficiary record in PostgreSQL
      const res = await beneficiariesApi.create({
        name: name.trim(),
        group_id: groupId,
        beneficiary_code: beneficiaryCode.trim() || undefined,
        registration_date: registrationDate || undefined,
        is_active: true,

        // 1. Personal Information
        father_or_husband_name: fatherOrHusbandName.trim() || undefined,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        national_id: nationalId.trim() || undefined,
        occupation: occupation.trim() || undefined,
        education: education.trim() || undefined,
        marital_status: maritalStatus || undefined,
        phone: phone.trim() || undefined,
        alternative_phone: alternativePhone.trim() || undefined,
        email: email.trim() || undefined,
        present_address: presentAddress.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,
        reason_for_assistance: reasonForAssistance.trim() || undefined,

        // 2. Emergency Contact
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_relation: emergencyRelation.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,

        // 3. Documents
        photo_url: finalPhotoUrl || undefined,
        signature_url: finalSignatureUrl || undefined,
        document_type: documentType || undefined,
        document_front_url: finalDocFrontUrl || undefined,
        document_back_url: finalDocBackUrl || undefined,

        // 4. Additional Information
        family_members_count: familyMembersCount ? parseInt(familyMembersCount) : undefined,
        family_info: familyInfo.trim() || undefined,
        financial_condition: financialCondition.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Beneficiary "${name}" registered successfully!`);
      setCreatedBenId(res.data.id);
      setCreatedBenName(res.data.name);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to register beneficiary.';
      error(msg);
    } finally {
      setSaving(false);
      setUploadingDocs(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <UserPlus className="w-7 h-7 text-emerald-500" />
            <span>Add New Beneficiary</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register a Qard Hasan borrower or Sadaqah recipient. <b>Only Full Name and Group are required.</b> All other fields are optional.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/app/beneficiaries/manage')}
          leftIcon={<HeartHandshake className="w-4 h-4" />}
        >
          Manage Beneficiaries
        </Button>
      </div>

      {/* Success Notification Banner */}
      {createdBenId && (
        <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Beneficiary "{createdBenName}" Registered Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Ready to disburse Qard Hasan benevolent loans or Sadaqah grants.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Add Another Beneficiary
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/app/beneficiaries/ledger?beneficiary_id=${createdBenId}`)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Beneficiary Ledger
            </Button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ==================================================== */}
        {/* BASIC INFORMATION                                   */}
        {/* ==================================================== */}
        <Card
          title="Basic Information"
          subtitle="Core identity and fund circle cohort assignment."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Beneficiary ID (Optional - Manual or Auto-generated) */}
            <div>
              <Input
                label="Beneficiary ID (Optional)"
                value={beneficiaryCode}
                onChange={(e) => setBeneficiaryCode(e.target.value)}
                placeholder="Leave empty to auto-generate (e.g. B-0001)"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Optional: Enter custom ID or leave blank for backend auto-generation.
              </p>
            </div>

            {/* Assigned Fund Group * (REQUIRED) */}
            <div>
              <Select
                label="Assigned Fund Group *"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
                disabled={loadingGroups}
              >
                {loadingGroups ? (
                  <option value="">Loading groups...</option>
                ) : groups.length === 0 ? (
                  <option value="">No fund groups available</option>
                ) : (
                  groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.code ? `(${g.code})` : ''}
                    </option>
                  ))
                )}
              </Select>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                * Required: Cohort group for assistance accounting
              </p>
            </div>

            {/* Registration Date (Optional) */}
            <div>
              <Input
                label="Registration Date (Optional)"
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">Defaults to today, editable</p>
            </div>
          </div>
        </Card>

        {/* ==================================================== */}
        {/* 1. PERSONAL INFORMATION                             */}
        {/* ==================================================== */}
        <Card
          title="1. Personal Information"
          subtitle="Full Name is required. All other background fields are completely optional."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Full Name * (REQUIRED) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Full Name *"
                placeholder="e.g. Rokeya Begum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                * Required: Primary identity for disbursement vouchers and ledger records
              </p>
            </div>

            <Input
              label="Father / Husband's Name (Optional)"
              placeholder="e.g. Md. Abdul Gafur"
              value={fatherOrHusbandName}
              onChange={(e) => setFatherOrHusbandName(e.target.value)}
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
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </Select>

            <Input
              label="National ID / Birth Certificate (Optional)"
              placeholder="e.g. 19821234567890"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />

            <Input
              label="Occupation / Primary Livelihood (Optional)"
              placeholder="e.g. Small Trader, Seamstress, Daily Worker"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />

            <Input
              label="Education / Qualification (Optional)"
              placeholder="e.g. Primary, Secondary, None"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />

            <Select
              label="Marital Status (Optional)"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
            >
              <option value="">Select Marital Status</option>
              <option value="Married">Married</option>
              <option value="Single">Single</option>
              <option value="Widowed">Widowed</option>
              <option value="Divorced">Divorced</option>
            </Select>

            <Input
              label="Mobile Number (Optional)"
              type="tel"
              placeholder="e.g. +880 1712-345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Alternative Mobile (Optional)"
              type="tel"
              placeholder="e.g. +880 1812-345678"
              value={alternativePhone}
              onChange={(e) => setAlternativePhone(e.target.value)}
            />

            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="e.g. beneficiary@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Present Address (Optional)"
                placeholder="e.g. House #14, Ward #3, Kaliakair, Gazipur"
                value={presentAddress}
                onChange={(e) => setPresentAddress(e.target.value)}
              />

              <Input
                label="Permanent Address (Optional)"
                placeholder="e.g. Vill: Char Fasson, P.O: Char Fasson, Dist: Bhola"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Textarea
                label="Reason / Need for Assistance (Optional)"
                placeholder="e.g. Seeking zero-interest micro-capital for setting up a grocery stall / emergency medical expense..."
                value={reasonForAssistance}
                onChange={(e) => setReasonForAssistance(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ==================================================== */}
        {/* 2. EMERGENCY CONTACT                                */}
        {/* ==================================================== */}
        <Card
          title="2. Emergency Contact"
          subtitle="All fields optional. Contact person or guarantor for emergency communications."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              label="Contact Name (Optional)"
              placeholder="e.g. Md. Shahidul Islam"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />

            <Input
              label="Relation (Optional)"
              placeholder="e.g. Husband, Brother, Uncle"
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
            />

            <Input
              label="Mobile Number (Optional)"
              type="tel"
              placeholder="e.g. +880 1912-345678"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </Card>

        {/* ==================================================== */}
        {/* 3. DOCUMENTS (Cloudinary via FastAPI)               */}
        {/* ==================================================== */}
        <Card
          title="3. Documents & Verification Media"
          subtitle="Optional photos and identity attachments. Uploads are stored securely in Cloudinary."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Beneficiary Photo */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Photo (Optional)
              </span>

              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {photoFile ? 'Change' : 'Upload Photo'}
              </Button>
            </div>

            {/* Signature */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Signature (Optional)
              </span>

              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-2" />
                ) : (
                  <PenTool className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <input
                type="file"
                ref={signatureInputRef}
                onChange={handleSignatureSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => signatureInputRef.current?.click()}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {signatureFile ? 'Change' : 'Upload Signature'}
              </Button>
            </div>

            {/* NID Front */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block text-center mb-2">
                  ID Front (Optional)
                </span>
                <Select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="National ID (NID)">National ID</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Other">Other Document</option>
                </Select>
                {docFrontName && (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate text-center mt-2">
                    📄 {docFrontName}
                  </p>
                )}
              </div>

              <input
                type="file"
                ref={docFrontInputRef}
                onChange={handleDocFrontSelect}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => docFrontInputRef.current?.click()}
                leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                className="w-full"
              >
                {docFrontFile ? 'Change Front' : 'Upload Front'}
              </Button>
            </div>

            {/* NID Back */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block text-center mb-2">
                  ID Back (Optional)
                </span>
                <p className="text-[11px] text-slate-400 text-center">
                  Back side of National ID / Verification document
                </p>
                {docBackName && (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate text-center mt-2">
                    📄 {docBackName}
                  </p>
                )}
              </div>

              <input
                type="file"
                ref={docBackInputRef}
                onChange={handleDocBackSelect}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => docBackInputRef.current?.click()}
                leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                className="w-full"
              >
                {docBackFile ? 'Change Back' : 'Upload Back'}
              </Button>
            </div>
          </div>
        </Card>

        {/* ==================================================== */}
        {/* 4. ADDITIONAL INFORMATION                           */}
        {/* ==================================================== */}
        <Card
          title="4. Additional Information"
          subtitle="Household composition, financial condition, and case notes (Optional)."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Family Members Count (Optional)"
              type="number"
              min="1"
              placeholder="e.g. 5"
              value={familyMembersCount}
              onChange={(e) => setFamilyMembersCount(e.target.value)}
            />

            <Input
              label="Financial Condition / Monthly Income (Optional)"
              placeholder="e.g. Monthly household income approx ৳7,000, 3 school-going children"
              value={financialCondition}
              onChange={(e) => setFinancialCondition(e.target.value)}
            />

            <Textarea
              label="Family / Household Information (Optional)"
              placeholder="Details on dependents, disabled family members, breadwinners..."
              value={familyInfo}
              onChange={(e) => setFamilyInfo(e.target.value)}
            />

            <Textarea
              label="Internal Administrative Case Notes (Optional)"
              placeholder="Field investigation remarks, guarantor references, assessment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        {/* Form Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Clear Form
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saving}
            leftIcon={<UserPlus className="w-5 h-5" />}
          >
            {uploadingDocs ? 'Uploading & Registering Beneficiary...' : 'Save & Register Beneficiary'}
          </Button>
        </div>
      </form>
    </div>
  );
};
