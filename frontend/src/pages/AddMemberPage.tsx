import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersApi, groupsApi, filesApi, settingsApi } from '../api/client';
import { Group, ContributionSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import {
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Upload,
  Camera,
  PenTool,
  Paperclip,
  HeartHandshake
} from 'lucide-react';

export const AddMemberPage: React.FC = () => {
  // Basic Information
  const [memberCode, setMemberCode] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupId, setGroupId] = useState('');
  const [monthlyContributionAmount, setMonthlyContributionAmount] = useState('500');

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

  // Groups and UX state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
  const [createdMemberName, setCreatedMemberName] = useState<string>('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToast();
  const navigate = useNavigate();

  // Load active groups, next auto-generated member code, and contribution settings
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingGroups(true);
        const [gRes, codeRes, setRes] = await Promise.all([
          groupsApi.list({ is_active: true }),
          membersApi.getNextCode().catch(() => ({ data: { next_member_code: 'M-0001' } })),
          settingsApi.getSection<ContributionSettings>('contributions').catch(() => null),
        ]);
        const memberGroups = gRes.data.filter(g => g.group_type !== 'EXTERNAL_FUND');
        setGroups(memberGroups);
        if (memberGroups.length > 0) {
          setGroupId(memberGroups[0].id);
        }
        if (codeRes?.data?.next_member_code) {
          setMemberCode(codeRes.data.next_member_code);
        }
        if (setRes?.data?.config_data?.default_monthly_contribution) {
          setMonthlyContributionAmount(setRes.data.config_data.default_monthly_contribution.toString());
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

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentFile(file);
      setDocumentFileName(file.name);
    }
  };

  const handleReset = () => {
    setName('');
    if (groups.length > 0) {
      setGroupId(groups[0].id);
    }
    setJoinDate(new Date().toISOString().split('T')[0]);
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
    setReferenceName('');
    setReferenceRelation('');
    setReferencePhone('');
    setCommitmentAccepted(false);
    setPhotoUrl('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSignatureUrl('');
    setSignatureFile(null);
    setSignaturePreview(null);
    setDocumentType('National ID (NID)');
    setDocumentUrl('');
    setDocumentFile(null);
    setDocumentFileName('');
    setReasonForJoining('');
    setNotes('');
    setCreatedMemberId(null);
    setCreatedMemberName('');

    // Fetch fresh next code
    membersApi.getNextCode().then((res) => {
      if (res.data?.next_member_code) setMemberCode(res.data.next_member_code);
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Member Full Name is required.');
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
      let finalDocUrl = documentUrl;

      // 1. Upload documents to Cloudinary via backend if files were selected
      if (photoFile || signatureFile || documentFile) {
        setUploadingDocs(true);
      }

      if (photoFile) {
        const pFormData = new FormData();
        pFormData.append('file', photoFile);
        pFormData.append('entity_type', 'member');
        pFormData.append('visibility', 'PUBLIC');
        const pRes = await filesApi.upload(pFormData);
        finalPhotoUrl = pRes.data.file.secure_url;
      }

      if (signatureFile) {
        const sFormData = new FormData();
        sFormData.append('file', signatureFile);
        sFormData.append('entity_type', 'member');
        sFormData.append('visibility', 'PRIVATE');
        const sRes = await filesApi.upload(sFormData);
        finalSignatureUrl = sRes.data.file.secure_url;
      }

      if (documentFile) {
        const dFormData = new FormData();
        dFormData.append('file', documentFile);
        dFormData.append('entity_type', 'member');
        dFormData.append('visibility', 'PRIVATE');
        const dRes = await filesApi.upload(dFormData);
        finalDocUrl = dRes.data.file.secure_url;
      }

      // 2. Create Member record in PostgreSQL
      const res = await membersApi.create({
        name: name.trim(),
        group_id: groupId,
        member_code: memberCode.trim() || undefined,
        join_date: joinDate || undefined,
        monthly_contribution_amount: parseFloat(monthlyContributionAmount) >= 0 ? parseFloat(monthlyContributionAmount) : undefined,
        is_active: true,

        // 1. Personal Information
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
        reference_name: referenceName.trim() || undefined,
        reference_relation: referenceRelation.trim() || undefined,
        reference_phone: referencePhone.trim() || undefined,

        // 4. Commitment
        commitment_accepted: commitmentAccepted,

        // 5. Documents
        photo_url: finalPhotoUrl || undefined,
        signature_url: finalSignatureUrl || undefined,
        document_type: documentType || undefined,
        document_url: finalDocUrl || undefined,

        // 6. Additional Information
        reason_for_joining: reasonForJoining.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Member "${name}" enrolled successfully!`);
      setCreatedMemberId(res.data.id);
      setCreatedMemberName(res.data.name);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to enroll member.';
      error(msg);
    } finally {
      setSaving(false);
      setUploadingDocs(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header Bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
          <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
          <span>Add New Member</span>
        </h1>
      </div>

      {/* Success Notification Banner */}
      {createdMemberId && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Member "{createdMemberName}" Enrolled Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Ready to record monthly contributions or view member financial ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Add Another Member
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/app/members/ledger?member_id=${createdMemberId}`)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Member Ledger
            </Button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <Card title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Member ID (Optional)"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="Leave empty to auto-generate (e.g. M-0008)"
            />

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

            <Input
              label="Join / Enrolment Date (Optional)"
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
            />

            <Input
              label="Monthly Contribution Amount (৳)"
              type="number"
              min="0"
              step="10"
              placeholder="500"
              value={monthlyContributionAmount}
              onChange={(e) => setMonthlyContributionAmount(e.target.value)}
            />
          </div>
        </Card>

        {/* 1. Personal Information */}
        <Card title="1. Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Full Name *"
                placeholder="e.g. Mohammad Rahim Ahmed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Input
              label="Father's Name (Optional)"
              placeholder="e.g. Late Abdul Karim"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />

            <Input
              label="Mother's Name (Optional)"
              placeholder="e.g. Sufia Begum"
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
              label="National ID / Birth Certificate (Optional)"
              placeholder="e.g. 19851234567890"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />

            <Input
              label="Occupation / Workplace (Optional)"
              placeholder="e.g. Software Engineer, Business, Teacher"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />

            <Input
              label="Education / Qualification (Optional)"
              placeholder="e.g. B.Sc in Engineering, Masters, Alim"
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
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
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
              placeholder="e.g. rahim.ahmed@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Present Address (Optional)"
                placeholder="e.g. House #12, Road #4, Dhanmondi, Dhaka"
                value={presentAddress}
                onChange={(e) => setPresentAddress(e.target.value)}
              />

              <Input
                label="Permanent Address (Optional)"
                placeholder="e.g. Vill: Chandpur, P.O: Madaripur, Dist: Barishal"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* 2. Emergency Contact */}
        <Card title="2. Emergency Contact">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Contact Name (Optional)"
              placeholder="e.g. Sister Fatima Ahmed"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />

            <Input
              label="Relation (Optional)"
              placeholder="e.g. Spouse, Brother, Father"
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

        {/* 3. Reference */}
        <Card title="3. Reference">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Referee Name (Optional)"
              placeholder="e.g. Brother Tariq Hasan"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
            />

            <Input
              label="Relation / Designation (Optional)"
              placeholder="e.g. Senior Member, Colleague"
              value={referenceRelation}
              onChange={(e) => setReferenceRelation(e.target.value)}
            />

            <Input
              label="Mobile Number (Optional)"
              type="tel"
              placeholder="e.g. +880 1612-345678"
              value={referencePhone}
              onChange={(e) => setReferencePhone(e.target.value)}
            />
          </div>
        </Card>

        {/* 4. Commitment & Declaration */}
        <Card title="4. Commitment & Declaration">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-start space-x-3">
              <HeartHandshake className="w-5 h-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                "I hereby affirm my commitment to the benevolent principles and financial solidarity of the Foundation. I intend to contribute regularly to my designated Fund Circle and support zero-interest benevolent micro-capital for community empowerment."
              </p>
            </div>

            <label className="flex items-center space-x-2.5 pt-1 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={commitmentAccepted}
                onChange={(e) => setCommitmentAccepted(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Member acknowledges commitment statement (Optional)</span>
            </label>
          </div>
        </Card>

        {/* 5. Documents & Media */}
        <Card title="5. Documents & Media">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Member Photo */}
            <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Member Photo (Optional)
              </span>

              <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
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
                {photoFile ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>

            {/* Signature */}
            <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Signature (Optional)
              </span>

              <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-2" />
                ) : (
                  <PenTool className="w-8 h-8 text-slate-400" />
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
                {signatureFile ? 'Change Signature' : 'Upload Signature'}
              </Button>
            </div>

            {/* Identity Document */}
            <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block text-center">
                  Identity Document (Optional)
                </span>

                <Select
                  label="Document Type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="National ID (NID)">National ID (NID)</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Other">Other Document</option>
                </Select>

                {documentFileName && (
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate text-center">
                    📄 {documentFileName}
                  </p>
                )}
              </div>

              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocSelect}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => docInputRef.current?.click()}
                leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                className="w-full"
              >
                {documentFile ? 'Change Document' : 'Upload PDF/Image'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 6. Additional Information */}
        <Card title="6. Additional Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Textarea
              label="Reason for Joining (Optional)"
              placeholder="e.g. Aspiring to participate in community welfare and mutual fund support..."
              value={reasonForJoining}
              onChange={(e) => setReasonForJoining(e.target.value)}
            />

            <Textarea
              label="Internal Administrative Notes (Optional)"
              placeholder="Donor preferences, payment schedules, special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        {/* Form Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
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
            isLoading={saving}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {uploadingDocs ? 'Enrolling Member...' : 'Save & Enrol Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};
