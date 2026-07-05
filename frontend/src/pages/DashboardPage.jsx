import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import {
  FileText, Clock, AlertTriangle, CheckCircle2, ArrowRight,
  TrendingUp, Activity, Zap, Shield, Brain, Cpu, Radio,
  BarChart3, PieChart as PieChartIcon, Layers, Sparkles,
  ChevronRight, Eye, Plus, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
const GLOW_COLORS = {
  brand: { ring: 'ring-indigo-500/20', glow: 'shadow-indigo-500/10', gradient: 'from-indigo-500 to-purple-600', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  red: { ring: 'ring-red-500/20', glow: 'shadow-red-500/10', gradient: 'from-red-500 to-orange-600', text: 'text-red-400', bg: 'bg-red-500/10' },
  green: { ring: 'ring-emerald-500/20', glow: 'shadow-emerald-500/10', gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  amber: { ring: 'ring-amber-500/20', glow: 'shadow-amber-500/10', gradient: 'from-amber-500 to-yellow-600', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  cyan: { ring: 'ring-cyan-500/20', glow: 'shadow-cyan-500/10', gradient: 'from-cyan-500 to-blue-600', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, requestsData] = await Promise.all([
          api.get('/requests/stats/dashboard'),
          api.get('/requests?limit=5'),
        ]);
        setStats(statsData);
        setRecentRequests(requestsData.requests);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  const statusData = stats?.byStatus?.map((s) => ({ name: s.status, value: parseInt(s.count) })) || [];
  const priorityData = stats?.byPriority?.map((s) => ({ name: s.priority, value: parseInt(s.count) })) || [];
  const typeData = stats?.byType?.map((s) => ({ name: s.request_type, value: parseInt(s.count) })) || [];
  const totalRequests = statusData.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <Header title="Dashboard" subtitle={`Welcome back, ${user?.name}`} />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* ─── Command Center Header ─── */}
        <AnimatedSection delay={0}>
          <div className="relative mb-6 rounded-2xl overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 via-yellow-300/10 to-lime-400/10 animate-gradient-shift" />
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-float-slow" />
              <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-slow-reverse" />
            </div>

            <div className="relative border border-indigo-500/10 rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {/* AI Brain Icon with pulse */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-md animate-pulse" />
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 shadow-lg shadow-violet-500/25">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      AI Command Center
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Real-time monitoring · AI Validation Engine · Smart Analytics
                    </p>
                  </div>
                </div>

                {/* Live clock + status indicators */}
                <div className="flex items-center gap-3">
                  <StatusPill icon={Shield} label="Secure" color="emerald" />
                  <StatusPill icon={Cpu} label="AI Engine" color="indigo" />
                  <StatusPill icon={Radio} label="Connected" color="cyan" />
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-mono text-gray-400 tabular-nums">
                      {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Animated pulse line */}
              <div className="mt-4 h-px w-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent animate-pulse-line" />
              </div>

              {/* Quick metric bar */}
              <div className="mt-3 flex items-center gap-6 flex-wrap">
                <MiniMetric label="Total Tickets" value={totalRequests} icon={Layers} />
                <MiniMetric label="Open" value={stats?.totalOpen || 0} icon={FileText} />
                <MiniMetric label="Overdue" value={stats?.overdue || 0} icon={AlertTriangle} alert={stats?.overdue > 0} />
                <MiniMetric label="On Time" value={stats?.onTime || 0} icon={CheckCircle2} />
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <GlowCard title="Open Requests" value={stats?.totalOpen || 0} icon={FileText} color="brand" trend="+2 this week" trendUp delay={100} />
          <GlowCard title="Overdue" value={stats?.overdue || 0} icon={AlertTriangle} color="red" trend="Needs attention" alert delay={200} />
          <GlowCard title="On Time" value={stats?.onTime || 0} icon={CheckCircle2} color="green" trend="Good standing" trendUp delay={300} />
          <GlowCard title="Avg Resolution" value="2.4d" icon={Clock} color="amber" trend="Improving ↗" delay={400} />
        </div>

        {/* ─── Charts Section ─── */}
        <AnimatedSection delay={500}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ChartCard title="Requests by Status" icon={PieChartIcon}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: '#e0e0ff' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Priority Distribution" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: '#e0e0ff' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === 'high' ? '#ef4444' : entry.name === 'medium' ? '#f59e0b' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Request Types" icon={PieChartIcon}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: '#e0e0ff' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </AnimatedSection>

        {/* ─── Activity + Quick Actions ─── */}
        <AnimatedSection delay={700}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Overdue vs On-Time with area chart style */}
            <div className="card p-6 relative overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full" />
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Health Overview
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'On Time', value: stats?.onTime || 0 },
                      { name: 'Overdue', value: stats?.overdue || 0 },
                    ]}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: '#e0e0ff' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Actions — redesigned */}
            <div className="card p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full" />
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  to="/requests/new"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-violet-400/10 to-yellow-300/10 border border-violet-200/20 hover:border-yellow-300/30 transition-all duration-300 group/action hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-lime-400 text-white shadow-lg shadow-violet-500/20 group-hover/action:scale-110 transition-transform duration-300">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Create New Request</p>
                    <p className="text-xs text-gray-500">AI-powered validation & documentation</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover/action:text-indigo-400 group-hover/action:translate-x-1 transition-all duration-300" />
                </Link>

                <Link
                  to="/requests"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-yellow-300/10 to-violet-400/10 border border-yellow-300/20 hover:border-violet-300/30 transition-all duration-300 group/action hover:shadow-lg hover:shadow-yellow-300/10"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 to-violet-400 text-slate-950 shadow-lg shadow-yellow-300/20 group-hover/action:scale-110 transition-transform duration-300">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">View All Requests</p>
                    <p className="text-xs text-gray-500">Browse & manage the request register</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover/action:text-cyan-400 group-hover/action:translate-x-1 transition-all duration-300" />
                </Link>

                <Link
                  to="/requests"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-lime-400/10 to-violet-400/10 border border-lime-300/20 hover:border-lime-300/30 transition-all duration-300 group/action hover:shadow-lg hover:shadow-lime-300/10"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 shadow-lg shadow-lime-300/20 group-hover/action:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Analytics & Reports</p>
                    <p className="text-xs text-gray-500">Track trends & performance metrics</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover/action:text-emerald-400 group-hover/action:translate-x-1 transition-all duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ─── Recent Requests Table ─── */}
        <AnimatedSection delay={900}>
          <div className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Recent Requests
              </h3>
              <Link to="/requests" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100/50">
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">ID</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Requestor</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Priority</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {recentRequests.map((req, idx) => (
                    <tr key={req.id} className="hover:bg-indigo-500/[0.02] transition-colors duration-200 group/row"
                      style={{ animation: `fadeSlideUp 0.4s ease-out ${idx * 0.08}s both` }}>
                      <td className="px-6 py-3">
                        <Link to={`/requests/${req.id}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                          {req.request_id}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{req.requestor_name}</td>
                      <td className="px-6 py-3"><StatusBadge value={req.request_type} /></td>
                      <td className="px-6 py-3"><StatusBadge value={req.priority} /></td>
                      <td className="px-6 py-3"><StatusBadge value={req.status} /></td>
                      <td className="px-6 py-3">
                        <span className={`text-sm ${req.is_overdue ? 'text-red-400 font-medium' : 'text-gray-600'}`}>
                          {req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}
                          {req.is_overdue && ' ⚠'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      </main>
    </>
  );
}

/* ─── Helper Components ─── */

function StatusPill({ icon: Icon, label, color }) {
  const c = color === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : color === 'indigo' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  return (
    <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium uppercase tracking-wider ${c}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon, alert }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${alert ? 'text-red-400' : 'text-gray-500'}`} />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className={`text-sm font-bold tabular-nums ${alert ? 'text-red-400' : 'text-gray-900'}`}>
        <AnimatedNumber value={typeof value === 'number' ? value : 0} display={value} />
      </span>
    </div>
  );
}

function AnimatedSection({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </div>
  );
}

function GlowCard({ title, value, icon: Icon, color, trend, trendUp, alert, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const c = GLOW_COLORS[color] || GLOW_COLORS.brand;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`card p-5 relative overflow-hidden group transition-all duration-700 ease-out ring-1 ${c.ring} hover:shadow-xl hover:${c.glow} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Corner glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${c.gradient} opacity-[0.07] rounded-full blur-2xl group-hover:opacity-[0.15] transition-opacity duration-500`} />
      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 w-full h-px overflow-hidden">
        <div className={`h-full bg-gradient-to-r from-transparent via-violet-300/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse-line`} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} shadow-lg ${`shadow-${color === 'brand' ? 'indigo' : color}-500/20`} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
        <div className="mb-1.5">
          {typeof value === 'number' ? (
            <span className={`text-3xl font-bold tabular-nums ${alert ? 'text-red-400' : 'text-gray-900'}`}>
              <AnimatedNumber value={value} display={value} />
            </span>
          ) : (
            <span className="text-3xl font-bold text-gray-900">{value}</span>
          )}
        </div>
        {trend && (
          <p className={`text-[11px] flex items-center gap-1 ${trendUp ? 'text-emerald-400' : alert ? 'text-red-400' : 'text-gray-500'}`}>
            <Activity className="w-3 h-3" />
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="card p-6 relative overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-500 ring-1 ring-white/5">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-lime-300/20 to-transparent" />
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function AnimatedNumber({ value, display }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number' || value === 0) { setCount(0); return; }
    const duration = 1200;
    const steps = 40;
    const stepDuration = duration / steps;
    let current = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, stepDuration);
    return () => clearInterval(timer);
  }, [value]);

  if (typeof display === 'string' && isNaN(display)) return display;
  return count;
}
