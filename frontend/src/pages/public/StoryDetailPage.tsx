import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicStoryDetail } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  HeartHandshake,
  RotateCcw,
  Sparkles,
  Share2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const StoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<PublicStoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await publicApi.getStory(slug);
        setStory(res.data);
      } catch (err) {
        console.error('Failed to load story:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Story Not Found</h2>
        <p className="text-xs text-slate-500">The story you requested does not exist or is not publicly published.</p>
        <Button variant="primary" onClick={() => navigate('/stories')}>
          Back to Stories
        </Button>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Back Button */}
      <Link
        to="/stories"
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Impact Stories</span>
      </Link>

      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {story.category}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {story.assistance_type === 'QARD_HASAN' ? 'Qard Hasan (0% Microfinance)' : 'Sadaqah (Direct Grant)'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {story.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{story.location}</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Published on {new Date(story.published_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{story.read_time_minutes} min read</span>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {story.cover_image && (
        <div className="w-full h-72 sm:h-96 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
          <img
            src={story.cover_image}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Impact Highlight Box */}
      {story.impact_highlight && (
        <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start space-x-3 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-semibold shadow-sm">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-0.5">
              Documented Impact Metric
            </p>
            <p>{story.impact_highlight}</p>
          </div>
        </div>
      )}

      {/* Story Narrative Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-6 text-slate-700 dark:text-slate-300">
        {story.content.split('\n\n').map((paragraph, idx) => {
          if (paragraph.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xl font-extrabold text-slate-900 dark:text-white pt-4">
                {paragraph.replace('### ', '')}
              </h3>
            );
          }
          if (paragraph.startsWith('> ')) {
            return (
              <blockquote key={idx} className="p-4 bg-slate-50 dark:bg-slate-850/80 rounded-2xl border-l-4 border-emerald-500 italic text-slate-800 dark:text-slate-200">
                {paragraph.replace('> ', '').replace(/"/g, '')}
              </blockquote>
            );
          }
          return <p key={idx}>{paragraph}</p>;
        })}
      </div>

      {/* Privacy Guarantee Note */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center space-x-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>Published in accordance with the Foundation’s Public Transparency & Beneficiary Privacy Policy.</span>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-xl font-black">Inspired by this transformation?</h3>
          <p className="text-xs text-slate-400">Join as a contributing Member or recommend an aspiring entrepreneur.</p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <Link
            to="/member/apply"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-colors"
          >
            Become a Member
          </Link>
          <Link
            to="/assistance/apply"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
          >
            Request Aid
          </Link>
        </div>
      </div>
    </article>
  );
};
