import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { Search, Filter, ChevronLeft, ChevronRight, FileText, Database, Zap, Layers, X } from 'lucide-react';

export default function RequestRegisterPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    request_type: '',
    overdue: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const data = await api.get(`/requests?${params}`);
      setRequests(data.requests);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  return (
    <>
      <Header title="Request Register" subtitle={`${total} total requests`} />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Page Banner */}
        <div className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 via-yellow-300/10 to-lime-400/10 animate-gradient-shift" />
          <div className="relative border border-cyan-500/10 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md animate-pulse" />
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 shadow-lg shadow-violet-500/25">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Request Register
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-medium text-cyan-400 uppercase tracking-wider">
                    <Layers className="w-3 h-3" /> {total} Records
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Browse, search and filter all submitted requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/20 text-[10px] font-medium text-indigo-400 bg-indigo-500/10 uppercase tracking-wider">
                <Zap className="w-3 h-3" /> Live Data
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden" style={{ animation: 'fadeSlideUp 0.5s ease-out 0.1s both' }}>
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by ID, requestor, or description..."
              />
            </form>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                showFilters
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex flex-wrap gap-3 items-center" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
              <select
                value={filters.status}
                onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                className="input-field w-auto"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}
                className="input-field w-auto"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                value={filters.request_type}
                onChange={(e) => { setFilters({ ...filters, request_type: e.target.value }); setPage(1); }}
                className="input-field w-auto"
              >
                <option value="">All Types</option>
                <option value="access">Access</option>
                <option value="issue">Issue</option>
                <option value="information">Information</option>
                <option value="change">Change</option>
                <option value="other">Other</option>
              </select>
              <select
                value={filters.overdue}
                onChange={(e) => { setFilters({ ...filters, overdue: e.target.value }); setPage(1); }}
                className="input-field w-auto"
              >
                <option value="">All Due Dates</option>
                <option value="true">Overdue Only</option>
              </select>
              <button
                onClick={() => { setFilters({ status: '', priority: '', request_type: '', overdue: '' }); setPage(1); }}
                className="text-sm text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <LoadingSpinner className="py-20" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No requests found"
              description="Try adjusting your filters or create a new request."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Request ID</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Requestor</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Priority</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Due Date</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Supervisor</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map((req, i) => (
                    <tr
                      key={req.id}
                      className="hover:bg-indigo-500/[0.04] transition-colors group"
                      style={{ animation: `fadeSlideUp 0.4s ease-out ${i * 0.04}s both` }}
                    >
                      <td className="px-6 py-3">
                        <Link to={`/requests/${req.id}`} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                          {req.request_id}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">{req.requestor_name}</td>
                      <td className="px-6 py-3"><StatusBadge value={req.request_type} /></td>
                      <td className="px-6 py-3"><StatusBadge value={req.priority} /></td>
                      <td className="px-6 py-3"><StatusBadge value={req.status} /></td>
                      <td className="px-6 py-3">
                        <span className={`text-sm ${req.is_overdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                          {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}
                          {req.is_overdue && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">{req.supervisor_name || '—'}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {req.tags?.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} requests)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
