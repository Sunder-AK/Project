import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { MessageSquare, Activity, ArrowRight, Clock, AlertTriangle } from 'lucide-react';

export default function FollowUpsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.get('/requests?limit=100');
        const active = data.requests.filter((r) => r.status !== 'closed');
        setRequests(active);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Follow-Ups" subtitle="Track active request follow-ups" />
        <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
      </>
    );
  }

  const overdueCount = requests.filter(r => r.is_overdue).length;

  return (
    <>
      <Header title="Follow-Ups" subtitle="Track active request follow-ups" />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Page Banner */}
        <div className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/10 via-violet-400/10 to-lime-400/10 animate-gradient-shift" />
          <div className="relative border border-amber-500/10 rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-md animate-pulse" />
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-300 via-violet-400 to-lime-400 shadow-lg shadow-yellow-300/25">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Active Follow-Ups
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-medium text-amber-400 uppercase tracking-wider">
                      {requests.length} Active
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Monitor pending requests that need attention</p>
                </div>
              </div>
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">{overdueCount} Overdue</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No active follow-ups"
            description="All requests are completed or closed."
          />
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {requests.map((req, i) => (
              <Link
                key={req.id}
                to={`/requests/${req.id}`}
                className={`card p-5 block group hover:shadow-lg transition-all ${
                  req.is_overdue
                    ? 'border-red-500/20 hover:border-red-500/30 hover:shadow-red-500/5'
                    : 'hover:border-indigo-500/20 hover:shadow-indigo-500/5'
                }`}
                style={{ animation: `fadeSlideUp 0.4s ease-out ${i * 0.06}s both` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-indigo-400">{req.request_id}</span>
                      <StatusBadge value={req.status} />
                      <StatusBadge value={req.priority} />
                      {req.is_overdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-300 mb-1">
                      {req.ai_summary || req.raw_description?.substring(0, 80)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>By {req.requestor_name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}</span>
                      <span>Supervisor: {req.supervisor_name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {req.tags?.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
