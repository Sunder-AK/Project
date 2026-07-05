import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { TrendingUp, FileText, AlertTriangle, CheckCircle2, Clock, BarChart3, Activity, Gauge } from 'lucide-react';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const darkTooltipStyle = {
  contentStyle: { background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  itemStyle: { color: '#d1d5db' },
  labelStyle: { color: '#9ca3af' },
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.get('/requests/stats/dashboard');
        setStats(data);
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
        <Header title="Analytics" subtitle="Request analytics and insights" />
        <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
      </>
    );
  }

  const statusData = stats?.byStatus?.map((s) => ({ name: s.status, value: parseInt(s.count) })) || [];
  const priorityData = stats?.byPriority?.map((s) => ({ name: s.priority, value: parseInt(s.count) })) || [];
  const typeData = stats?.byType?.map((s) => ({ name: s.request_type, value: parseInt(s.count) })) || [];
  const trendData = (stats?.trend || []).reverse().map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: parseInt(t.count),
  }));

  const totalRequests = statusData.reduce((acc, s) => acc + s.value, 0);

  return (
    <>
      <Header title="Analytics" subtitle="Request analytics and insights" />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Banner */}
        <div className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 via-yellow-300/10 to-lime-400/10 animate-gradient-shift" />
          <div className="relative border border-emerald-500/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md animate-pulse" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 shadow-lg shadow-violet-500/25">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Analytics Dashboard
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                  <Activity className="w-3 h-3" /> Real-time
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Comprehensive insights and performance metrics</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { icon: FileText, label: 'Total Requests', value: totalRequests, gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
            { icon: TrendingUp, label: 'Open', value: stats?.totalOpen || 0, gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
            { icon: AlertTriangle, label: 'Overdue', value: stats?.overdue || 0, gradient: 'from-red-500 to-orange-600', shadow: 'shadow-red-500/20', alert: stats?.overdue > 0 },
            { icon: CheckCircle2, label: 'On Time', value: stats?.onTime || 0, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
            { icon: Gauge, label: 'SLA', value: totalRequests > 0 ? `${Math.round(((stats?.onTime || 0) / totalRequests) * 100)}%` : '—', gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
          ].map((card, i) => (
            <div
              key={card.label}
              className="card p-4 relative overflow-hidden group hover:shadow-lg transition-all ring-1 ring-white/5"
              style={{ animation: `fadeSlideUp 0.5s ease-out ${i * 0.08}s both` }}
            >
              <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${card.gradient} opacity-[0.07] rounded-full blur-2xl group-hover:opacity-[0.15] transition-opacity`} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                </div>
                <p className={`text-2xl font-bold ${card.alert ? 'text-red-400' : 'text-white'}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Row 1: Status and Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.4s both' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Requests by Status</h3>
            <p className="text-xs text-gray-500 mb-4">Distribution across lifecycle stages</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip {...darkTooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.5s both' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Requests by Priority</h3>
            <p className="text-xs text-gray-500 mb-4">Breakdown by urgency level</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#9ca3af' }} width={70} />
                <Tooltip {...darkTooltipStyle} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={30}>
                  {priorityData.map((entry, index) => (
                    <Cell key={index} fill={entry.name === 'high' ? '#ef4444' : entry.name === 'medium' ? '#f59e0b' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Type and Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.6s both' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Requests by Type</h3>
            <p className="text-xs text-gray-500 mb-4">Category distribution</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip {...darkTooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {typeData.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.7s both' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Request Trend</h3>
            <p className="text-xs text-gray-500 mb-4">Daily request volume over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip {...darkTooltipStyle} />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#areaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: SLA + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.8s both' }}>
            <h3 className="text-sm font-semibold text-white mb-1">SLA Performance</h3>
            <p className="text-xs text-gray-500 mb-4">Overdue vs on-time requests</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[{ name: 'On Time', value: stats?.onTime || 0 }, { name: 'Overdue', value: stats?.overdue || 0 }]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip {...darkTooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 card p-6 ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.9s both' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Request Volume" value={totalRequests} description="Total requests in system" />
              <MetricCard label="Open Rate" value={totalRequests > 0 ? `${Math.round((stats?.totalOpen / totalRequests) * 100)}%` : '0%'} description="Requests currently open" />
              <MetricCard label="Overdue Rate" value={totalRequests > 0 ? `${Math.round((stats?.overdue / totalRequests) * 100)}%` : '0%'} description="Past due date" alert={stats?.overdue > 0} />
              <MetricCard label="Resolution Ratio" value={(() => { const closed = statusData.find(s => s.name === 'closed')?.value || 0; return totalRequests > 0 ? `${Math.round((closed / totalRequests) * 100)}%` : '0%'; })()} description="Requests closed/resolved" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function MetricCard({ label, value, description, alert }) {
  return (
    <div className={`p-4 rounded-xl ${alert ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/[0.03] border border-white/5'} transition-all hover:border-indigo-500/20`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-gray-600 mt-1">{description}</p>
    </div>
  );
}
