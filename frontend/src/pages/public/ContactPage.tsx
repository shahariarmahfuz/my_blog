import React, { useState, useEffect } from 'react';
import { publicApi } from '../../api/client';
import { PublicFoundationInfo } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [info, setInfo] = useState<PublicFoundationInfo | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const res = await publicApi.getFoundationInfo();
        setInfo(res.data);
      } catch (err) {
        console.error('Failed to load foundation info:', err);
      }
    };
    loadInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await publicApi.submitContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
      });
      success('Your message has been sent successfully!');
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      error('Failed to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Badge variant="info">Get in Touch</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Contact Al-Khair Foundation
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Have questions regarding donor group formation, partnerships, or assistance policies? Reach out to our team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Col */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Foundation Secretariat
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start space-x-3 text-slate-600 dark:text-slate-300">
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Principal Office</p>
                  <p>{info?.address || 'Level 4, Al-Khair Tower, Dhanmondi 27, Dhaka, Bangladesh'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-slate-600 dark:text-slate-300">
                <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Helpline / WhatsApp</p>
                  <p>{info?.phone || '+880 1700-112233'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-slate-600 dark:text-slate-300">
                <Mail className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Inquiries & Support</p>
                  <p>{info?.email || 'contact@alkhairfoundation.org'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-slate-600 dark:text-slate-300">
                <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Operating Hours</p>
                  <p>Sunday – Thursday: 9:00 AM – 5:00 PM</p>
                  <p className="text-[11px] text-slate-400">Closed on Fridays & National Holidays</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Col */}
        <div className="lg:col-span-2">
          <Card
            title="Send an Online Message"
            subtitle="We will respond to your inquiry within 24–48 business hours."
          >
            {submitted ? (
              <div className="p-8 text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Message Sent!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Thank you for contacting us. A foundation officer will follow up with you shortly.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Your Name *"
                    placeholder="e.g. Abdullah Al Mamun"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    placeholder="+880 17..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <Input
                    label="Subject *"
                    placeholder="e.g. Group circle donation query"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <Textarea
                  label="Your Message *"
                  placeholder="How can our foundation assist or collaborate with you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={submitting}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Send Message
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
