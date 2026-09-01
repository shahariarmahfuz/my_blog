import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  CheckCircle2,
  Info,
  Clock,
  Send,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AssistanceApplyPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [assistanceType, setAssistanceType] = useState('QARD_HASAN');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success State
  const [inquiryCode, setInquiryCode] = useState<string | null>(null);

  const { success, error } = useToast();

  const handleReset = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setDistrict('');
    setAssistanceType('QARD_HASAN');
    setDescription('');
    setInquiryCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      error('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      error('Phone Number is required.');
      return;
    }
    if (!district.trim()) {
      error('District / City is required.');
      return;
    }
    if (!description.trim()) {
      error('Please describe your situation and need.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await publicApi.submitAssistanceInquiry({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        district_or_city: district.trim(),
        assistance_type_needed: assistanceType,
        description: description.trim(),
      });

      success('Assistance inquiry submitted successfully!');
      setInquiryCode(res.data.inquiry_code);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit inquiry. Please try again.';
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Badge variant="success">Assistance Intake Portal</Badge>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Request Benevolent Community Assistance
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Whether you need interest-free working capital for your trade or emergency medical support, our field team reviews every legitimate request with compassion and rigor.
        </p>
      </div>

      {inquiryCode ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Inquiry Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Thank you, <b>{fullName}</b>. Your preliminary request has been recorded for review.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 max-w-sm mx-auto space-y-1">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Inquiry Reference Code
            </p>
            <span className="text-2xl font-mono font-black text-slate-900 dark:text-white tracking-widest block">
              {inquiryCode}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto text-left flex items-start space-x-2.5">
            <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              <b>Next Steps:</b> A regional volunteer field officer will review your description and contact you via phone ({phone}) within 3–5 business days to verify documents and conduct physical assessment.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleReset}>
              Submit Another Inquiry
            </Button>
            <Link to="/" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Advisory Notice */}
          <div className="p-5 rounded-3xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 flex items-start space-x-3.5 shadow-sm text-xs text-sky-950 dark:text-sky-200">
            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm">Preliminary Intake Assessment Policy</h4>
              <p className="text-sky-800 dark:text-sky-300 leading-relaxed">
                Submitting this inquiry does <b>not</b> automatically guarantee disbursement or enroll you as a beneficiary. All requests undergo physical field verification and require consensus approval from participating Fund Groups to prevent fraud and ensure aid reaches those in genuine need.
              </p>
            </div>
          </div>

          <Card
            title="Preliminary Assistance Inquiry Form"
            subtitle="Please provide accurate contact information so our field team can reach you."
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Legal Name *"
                  placeholder="e.g. Tariqul Islam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />

                <Input
                  label="Primary Phone Number *"
                  type="tel"
                  placeholder="e.g. +880 1712-345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />

                <Input
                  label="District / City / Upazila *"
                  placeholder="e.g. Tangail, Manikganj, Bogura"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />

                <Select
                  label="Type of Assistance Needed *"
                  value={assistanceType}
                  onChange={(e) => setAssistanceType(e.target.value)}
                  required
                >
                  <option value="QARD_HASAN">Qard Hasan (0% Interest Micro-Capital / Business Loan)</option>
                  <option value="SADAQAH">Sadaqah (Emergency Medical / Destitute Grant)</option>
                  <option value="EDUCATION">Education & Vocational Grant</option>
                  <option value="OTHER">Other Humanitarian Need</option>
                </Select>

                <div className="sm:col-span-2">
                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="applicant@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    label="Description of Your Situation & Required Amount *"
                    placeholder="Please explain why you need assistance, what business or emergency this will address, and the estimated amount in BDT..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={handleReset}>
                  Clear
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Submit Assistance Inquiry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
