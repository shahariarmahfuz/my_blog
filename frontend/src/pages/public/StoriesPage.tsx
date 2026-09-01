import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/client';
import { PublicStoryListItem } from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  BookOpen,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

export const StoriesPage: React.FC = () => {
  const [stories, setStories] = useState<PublicStoryListItem[]>([]);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStories = async () => {
      try {
        setLoading(true);
        const res = await publicApi.getStories({
          category: category !== 'ALL' ? category : undefined,
        });
        setStories(res.data);
      } catch (err) {
        console.error('Failed to load stories:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStories();
  }, [category]);

  const categories = ['ALL', 'Small Business', 'Emergency Medical', 'Community Agriculture', 'Education'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="success">Transparency & Impact Stories</Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Voices of Resilience & Recovery
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Explore documented impact cases demonstrating how benevolent capital, mutual community trust, and interest-free solidarity are lifting families into self-sufficiency.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              category === cat
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
            }`}
          >
            {cat === 'ALL' ? 'All Impact Stories' : cat}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No stories found</h3>
          <p className="text-xs text-slate-500">There are no published stories in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story) => (
            <Link
              key={story.id}
              to={`/stories/${story.slug}`}
              className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {story.cover_image && (
                  <div className="h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/75 text-white backdrop-blur-md">
                        {story.assistance_type === 'QARD_HASAN' ? 'Qard Hasan' : 'Sadaqah'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-3">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{story.location}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{story.read_time_minutes} min read</span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                    {story.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {story.summary}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-4">
                {story.impact_highlight && (
                  <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-900 dark:text-emerald-300 font-semibold">
                    ✨ {story.impact_highlight}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(story.published_date).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center space-x-1">
                    <span>Read Story</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
