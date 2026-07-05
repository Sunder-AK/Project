import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { FileText, Plus, User, ArrowRight, Clock } from 'lucide-react';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.get('/requests?limit=100');
        setRequests(data.requests);
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
        <Header title="My Requests" />
        <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
      </>
    );
  }

  return (
    <>
      <Header title="My Requests" subtitle={`${requests.length} requests`} />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Page Banner */}
        <div className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 via-yellow-300/10 to-lime-400/10 animate-gradient-shift" />
          <div className="relative border border-purple-500/10 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-md animate-pulse" />
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 shadow-lg shadow-violet-500/25">
                  <User className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">My Requests</h2>
                <p className="text-xs text-gray-500 mt-0.5">Track the status of all your submitted requests</p>
              </div>
            </div>
            <Link to="/requests/new" className="ai-btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Request
            </Link>
          </div>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No requests yet"
            description="Create your first request to get started."
            action={
              <Link to="/requests/new" className="ai-btn-primary gap-2">
                <Plus className="w-4 h-4" /> Create Request
              </Link>
            }
          />
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {requests.map((req, i) => (
              <Link
                key={req.id}
                to={`/requests/${req.id}`}
                className="card p-5 block group hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                style={{ animation: `fadeSlideUp 0.4s ease-out ${i * 0.06}s both` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-indigo-400">{req.request_id}</span>
                    <StatusBadge value={req.status} />
                    <StatusBadge value={req.priority} />
                  </div>
                  <div className="flex items-center gap-2">
                    {req.is_overdue && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Overdue</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                <p className="text-sm text-gray-300 font-medium mb-1">
                  {req.ai_summary || req.raw_description?.substring(0, 100)}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.request_type}</span>
                  <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                  <span>Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
