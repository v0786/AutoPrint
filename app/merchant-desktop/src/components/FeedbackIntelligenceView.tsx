import React, { useState, useEffect } from 'react';
import { BackendApiService } from '../services/backendApiService';
import {
  Sparkles,
  Star,
  RefreshCw,
  Search,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';

export const FeedbackIntelligenceView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, listData] = await Promise.all([
        BackendApiService.getFeedbackAnalytics(),
        BackendApiService.getAllFeedback(),
      ]);
      setAnalytics(analyticsData);
      setFeedbackList(listData || []);
    } catch (e) {
      console.warn('Failed to load feedback analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredList = feedbackList.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      (f.customer_name || '').toLowerCase().includes(term) ||
      (f.verification_code || '').includes(term) ||
      (f.comment || '').toLowerCase().includes(term) ||
      (f.improvement_suggestion || '').toLowerCase().includes(term) ||
      (f.category || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#18181C] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D0BCFF]" />
            <span>Customer Feedback & Intelligence Hub</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Real customer satisfaction ratings, print quality feedback, and software improvement ideas submitted after document pickup.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh analytics"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold block">Total Reviews</span>
            <div className="text-2xl font-black text-white">{analytics.totalFeedbackCount}</div>
            <span className="text-[10px] text-zinc-400">Post-collection submissions</span>
          </div>

          <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold block">Overall Rating</span>
            <div className="text-2xl font-black text-[#D0BCFF] flex items-center gap-1.5">
              <span>{analytics.averageOverall?.toFixed(1) || '0.0'}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] text-zinc-400">Customer experience</span>
          </div>

          <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold block">Print Quality</span>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{analytics.averageQuality?.toFixed(1) || '0.0'}</span>
              <Star className="w-4 h-4 fill-amber-400/80 text-amber-400/80" />
            </div>
            <span className="text-[10px] text-zinc-400">Resolution & sharpness</span>
          </div>

          <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold block">Store Service</span>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{analytics.averageService?.toFixed(1) || '0.0'}</span>
              <Star className="w-4 h-4 fill-amber-400/80 text-amber-400/80" />
            </div>
            <span className="text-[10px] text-zinc-400">Handover speed</span>
          </div>

          <div className="bg-[#18181C] border border-white/5 rounded-2xl p-4 space-y-1 col-span-2 lg:col-span-1">
            <span className="text-[11px] text-zinc-500 font-semibold block">Ease of Ordering</span>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{analytics.averageEase?.toFixed(1) || '0.0'}</span>
              <Star className="w-4 h-4 fill-amber-400/80 text-amber-400/80" />
            </div>
            <span className="text-[10px] text-zinc-400">Web UI simplicity</span>
          </div>
        </div>
      )}

      {/* Product Improvement Suggestions Feed */}
      {analytics?.recentSuggestions && analytics.recentSuggestions.length > 0 && (
        <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>Actionable Customer Improvement Suggestions</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.recentSuggestions.map((item: any) => (
              <div
                key={item.id}
                className="bg-[#18181C]/90 border border-white/5 rounded-xl p-3.5 space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#D0BCFF]">{item.customer_name || 'Customer'}</span>
                  <span className="text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-zinc-200 italic leading-relaxed">
                  "{item.improvement_suggestion}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Feedback Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feedback comments, customer names, or codes..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#18181C] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D0BCFF]"
            />
          </div>
          <div className="text-xs text-zinc-400 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
            Total: <span className="text-white font-bold">{filteredList.length}</span>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center bg-[#18181C] border border-white/5 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No customer feedback reviews found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredList.map((f) => (
              <div
                key={f.id}
                className="bg-[#18181C] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{f.customer_name || 'Walk-In Customer'}</span>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="font-mono text-xs text-[#D0BCFF]">{f.verification_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 text-[10px] font-bold">
                      {f.category?.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400 font-bold text-xs">
                      <span>{f.rating_overall}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[11px] text-zinc-400">
                  <div>Quality: <span className="text-white font-semibold">{f.rating_quality}/5</span></div>
                  <div>Service: <span className="text-white font-semibold">{f.rating_service}/5</span></div>
                  <div>Ease: <span className="text-white font-semibold">{f.rating_ease}/5</span></div>
                  <div className="text-right text-zinc-500">{new Date(f.created_at).toLocaleDateString()}</div>
                </div>

                {f.comment && (
                  <p className="text-xs text-zinc-300 bg-black/30 p-2.5 rounded-xl border border-white/5">
                    {f.comment}
                  </p>
                )}

                {f.improvement_suggestion && (
                  <div className="text-xs text-purple-200 bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20 flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
                    <p className="italic">Suggestion: "{f.improvement_suggestion}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
