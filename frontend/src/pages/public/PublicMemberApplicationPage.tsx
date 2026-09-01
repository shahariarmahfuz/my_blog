import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicApi, filesApi } from '../../api/client';
import { PublicEligibleGroup } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Info,
  Building2,
  Search,
  Copy,
  Check,
  Clock,
  Camera,
  PenTool,
  Home
} from 'lucide-react';

export const PublicMemberApplicationPage: React.FC = () => {
  // Required Fields
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');

  // 1. Personal Information (Optional)
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

  // 2. Emergency Contact (Optional)
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // 3. Reference (Optional)
  const [refName, setRefName] = useState('');
  const [refRelation, setRefRelation] = useState('');
  const [refPhone, setRefPhone] = useState('');

  // 4. Commitment (Optional acknowledgment)
  const [commitmentAccepted, setCommitmentAccepted] = useState(true);

  // 5. Documents (Optional, Cloudinary via FastAPI)
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

  // 6. Additional Information (Optional)
  const [reasonForJoining, setReasonForJoining] = useState('');
  const [notes, setNotes] = useState('');

  // Groups and state
  const [groups, setGroups] = useState<PublicEligibleGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Success Confirmation State
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState('');
  const [submittedGroup, setSubmittedGroup] = useState('');
  const [copied, setCopied] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const docFrontInputRef = useRef<HTMLInputElement>(null);
  const docBackInputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await publicApi.getEligibleGroups();
        setGroups(res.data);
        if (res.data.length > 0) {
          setGroupId(res.data[0].id);
        }
      } catch (err) {
        error('Unable to load fund groups at this moment.');
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
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
    if (groups.length > 0) setGroupId(groups[0].id);
    setFatherName('');
    setMotherName('');
    setDob('');
    setGender('');
    setNationalId('');
    setOccupation('');
    setEducation('');
    setBloodGroup('');
    setMaritalStatus('');
    setPhone('');
    setAlternativePhone('');
    setEmail('');
    setPresentAddress('');
    setPermanentAddress('');
    setEmergencyName('');
    setEmergencyRelation('');
    setEmergencyPhone('');
    setRefName('');
    setRefRelation('');
    setRefPhone('');
    setCommitmentAccepted(true);
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
    setReasonForJoining('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Full Name is required.');
      return;
    }
    if (!groupId) {
      error('Please select a Fund Group to join.');
      return;
    }

    setSubmitting(true);
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
        pFormData.append('entity_type', 'member_application');
        pFormData.append('visibility', 'PUBLIC');
        const pRes = await filesApi.upload(pFormData);
        finalPhotoUrl = pRes.data.file.secure_url;
      }

      if (signatureFile) {
        const sFormData = new FormData();
        sFormData.append('file', signatureFile);
        sFormData.append('entity_type', 'member_application');
        sFormData.append('visibility', 'PRIVATE');
        const sRes = await filesApi.upload(sFormData);
        finalSignatureUrl = sRes.data.file.secure_url;
      }

      if (docFrontFile) {
        const dfFormData = new FormData();
        dfFormData.append('file', docFrontFile);
        dfFormData.append('entity_type', 'member_application');
        dfFormData.append('visibility', 'PRIVATE');
        const dfRes = await filesApi.upload(dfFormData);
        finalDocFrontUrl = dfRes.data.file.secure_url;
      }

      if (docBackFile) {
        const dbFormData = new FormData();
        dbFormData.append('file', docBackFile);
        dbFormData.append('entity_type', 'member_application');
        dbFormData.append('visibility', 'PRIVATE');
        const dbRes = await filesApi.upload(dbFormData);
        finalDocBackUrl = dbRes.data.file.secure_url;
      }

      // 2. Submit Public Member Application
      const res = await publicApi.submitMemberApplication({
        applicant_name: name.trim(),
        proposed_group_id: groupId,

        // 1. Personal Info
        father_name: fatherName.trim() || undefined,
        mother_name: motherName.trim() || undefined,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        national_id: nationalId.trim() || undefined,
        occupation: occupation.trim() || undefined,
        education: education.trim() || undefined,
        blood_group: bloodGroup || undefined,
        marital_status: maritalStatus || undefined,
        phone: phone.trim() || undefined,
        alternative_phone: alternativePhone.trim() || undefined,
        email: email.trim() || undefined,
        present_address: presentAddress.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,

        // 2. Emergency Contact
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_relation: emergencyRelation.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,

        // 3. Reference
        reference_name: refName.trim() || undefined,
        reference_relation: refRelation.trim() || undefined,
        reference_phone: refPhone.trim() || undefined,

        // 4. Commitment
        commitment_accepted: commitmentAccepted,

        // 5. Documents
        photo_url: finalPhotoUrl || undefined,
        signature_url: finalSignatureUrl || undefined,
        document_type: documentType || undefined,
        document_url: finalDocFrontUrl || undefined,
        document_back_url: finalDocBackUrl || undefined,

        // 6. Additional Info
        reason_for_joining: reasonForJoining.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success('Membership application submitted successfully!');
      setSubmittedCode(res.data.application_code);
      setSubmittedName(res.data.applicant_name);
      setSubmittedGroup(res.data.proposed_group_name);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit application. Please try again.';
      error(msg);
    } finally {
      setSubmitting(false);
      setUploadingDocs(false);
    }
  };

  const handleCopyCode = () => {
    if (submittedCode) {
      navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Heading & Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="success">Admissions Intake Portal</Badge>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Apply for Foundation Membership
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Join our revolving benevolence circles. Only Full Name and Group are required.
          </p>
        </div>

        <div>
          <Link
            to="/member/application-status"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Check Application Status</span>
          </Link>
        </div>
      </div>

      {/* Success Confirmation Screen */}
      {submittedCode ? (
        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Application Submitted Successfully
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Thank you, <b>{submittedName}</b>. Your membership application for <b>{submittedGroup}</b> has been queued for review.
            </p>
          </div>

          {/* Application ID Highlight Box */}
          <div className="p-6 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 max-w-md mx-auto space-y-2.5">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Application ID
            </p>
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-widest">
                {submittedCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 transition-all shadow-sm"
                title="Copy Application ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Status: Pending Review
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto text-left flex items-start space-x-2.5">
            <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              <b>Important:</b> Your membership application has been submitted successfully. Please save your Application ID to check your application status later.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              leftIcon={<Home className="w-4 h-4" />}
            >
              Back to Home
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/member/application-status?code=${submittedCode}&contact=${encodeURIComponent(email || phone || name)}`)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Check Application Status
            </Button>
          </div>
        </div>
      ) : (
        /* Intake Form */
        <div className="space-y-6">
          {/* Informational Banner */}
          <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start space-x-3.5 shadow-sm">
            <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
              <h3 className="font-extrabold text-sm">
                Foundation Membership Application Guidelines
              </h3>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <b>Only Full Name and Group to Join are mandatory.</b> All other fields are completely optional. Submitting does not automatically create a Member record until approved by the Admissions Committee.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ==================================================== */}
            {/* 1. PERSONAL INFORMATION                             */}
            {/* ==================================================== */}
            <Card
              title="1. Personal Information"
              subtitle="Full Name and Fund Group are required. All other background fields are optional."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Full Name * (REQUIRED) */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Mohammad Aminul Islam"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    * Required: Full legal name for admission records
                  </p>
                </div>

                {/* Fund Group to Join * (REQUIRED) */}
                <div>
                  <Select
                    label="Group to Join *"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    required
                    disabled={loadingGroups}
                  >
                    {loadingGroups ? (
                      <option value="">Loading fund groups...</option>
                    ) : groups.length === 0 ? (
                      <option value="">No active groups available</option>
                    ) : (
                      groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.code ? `(${g.code})` : ''}
                        </option>
                      ))
                    )}
                  </Select>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    * Required: Selected accounting circle
                  </p>
                </div>

                <Input
                  label="Father's Name (Optional)"
                  placeholder="e.g. Md. Rafiqul Islam"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />

                <Input
                  label="Mother's Name (Optional)"
                  placeholder="e.g. Begum Rokeya"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
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
                  placeholder="e.g. 19851234567890"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />

                <Input
                  label="Occupation / Workplace (Optional)"
                  placeholder="e.g. Educator, Software Engineer, Trader"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />

                <Input
                  label="Education (Optional)"
                  placeholder="e.g. Graduate, HSC, Diploma"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
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
                  placeholder="e.g. applicant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Present Address (Optional)"
                    placeholder="e.g. House #14, Road #6, Mirpur-10, Dhaka"
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                  />

                  <Input
                    label="Permanent Address (Optional)"
                    placeholder="e.g. Vill: Char Fasson, P.O: Char Fasson, Bhola"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* ==================================================== */}
            {/* 2. EMERGENCY CONTACT                                */}
            {/* ==================================================== */}
            <Card
              title="2. Emergency Contact"
              subtitle="All fields optional. Contact person in case of urgent communications."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Name (Optional)"
                  placeholder="e.g. Md. Kamal Hossain"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />

                <Input
                  label="Relation (Optional)"
                  placeholder="e.g. Brother, Uncle, Spouse"
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
            {/* 3. REFERENCE                                        */}
            {/* ==================================================== */}
            <Card
              title="3. Reference"
              subtitle="All fields optional. A known foundation member or referee."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Name (Optional)"
                  placeholder="e.g. Dr. Tariqul Islam"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                />

                <Input
                  label="Relation / Designation (Optional)"
                  placeholder="e.g. Colleague, Existing Member"
                  value={refRelation}
                  onChange={(e) => setRefRelation(e.target.value)}
                />

                <Input
                  label="Mobile Number (Optional)"
                  type="tel"
                  placeholder="e.g. +880 1612-345678"
                  value={refPhone}
                  onChange={(e) => setRefPhone(e.target.value)}
                />
              </div>
            </Card>

            {/* ==================================================== */}
            {/* 4. COMMITMENT                                       */}
            {/* ==================================================== */}
            <Card
              title="4. Foundation Membership Commitment"
              subtitle="Ethical pledge and mutual responsibility agreement."
            >
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  "I declare that I will try to work as a responsible member while respecting the foundation's purpose, ideals, and policies. I will cooperate in the humanitarian activities of the foundation according to my ability and will maintain the organization's discipline, mutual respect, and values of brotherhood, Insha'Allah."
                </p>

                <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={commitmentAccepted}
                    onChange={(e) => setCommitmentAccepted(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    I agree to the Foundation's membership values and principles (Optional)
                  </span>
                </label>
              </div>
            </Card>

            {/* ==================================================== */}
            {/* 5. DOCUMENTS (Cloudinary via FastAPI)               */}
            {/* ==================================================== */}
            <Card
              title="5. Documents & Verification Media"
              subtitle="All document fields are optional. Uploads are stored securely via the backend."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Photo */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 flex flex-col items-center text-center space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Photo (Optional)
                  </span>
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
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
                  >
                    {photoFile ? 'Change' : 'Upload Photo'}
                  </Button>
                </div>

                {/* Signature */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 flex flex-col items-center text-center space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Signature (Optional)
                  </span>
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-1" />
                    ) : (
                      <PenTool className="w-6 h-6 text-slate-400" />
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
                  >
                    {signatureFile ? 'Change' : 'Upload Signature'}
                  </Button>
                </div>

                {/* ID Front */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block text-center mb-1">
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
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate text-center mt-1">
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
                    className="w-full"
                  >
                    {docFrontFile ? 'Change' : 'Upload Front'}
                  </Button>
                </div>

                {/* ID Back */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block text-center mb-1">
                      ID Back (Optional)
                    </span>
                    <p className="text-[10px] text-slate-400 text-center">
                      Back of ID / Document
                    </p>
                    {docBackName && (
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate text-center mt-1">
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
                    className="w-full"
                  >
                    {docBackFile ? 'Change' : 'Upload Back'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* ==================================================== */}
            {/* 6. ADDITIONAL INFORMATION                           */}
            {/* ==================================================== */}
            <Card
              title="6. Additional Information"
              subtitle="All fields optional. Reason for joining and personal statement."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Reason for Joining (Optional)"
                  placeholder="Share what motivates you to become a Foundation member..."
                  value={reasonForJoining}
                  onChange={(e) => setReasonForJoining(e.target.value)}
                />

                <Textarea
                  label="Additional Notes / Pledge Intentions (Optional)"
                  placeholder="Monthly contribution pledge or specific humanitarian interests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={submitting}
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitting}
                leftIcon={<HeartHandshake className="w-5 h-5" />}
              >
                {uploadingDocs ? 'Uploading & Submitting Application...' : 'Submit Membership Application'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
