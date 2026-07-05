import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  List,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Brain,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'user'] },
  { to: '/requests/new', label: 'Create Request', icon: FilePlus, roles: ['admin', 'supervisor', 'user'] },
  { to: '/requests', label: 'Request Register', icon: List, roles: ['admin', 'supervisor', 'user'] },
  { to: '/my-requests', label: 'My Requests', icon: FileText, roles: ['user'] },
  { to: '/follow-ups', label: 'Follow-Ups', icon: MessageSquare, roles: ['admin', 'supervisor', 'user'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'supervisor'] },
  { to: '/admin', label: 'Admin Panel', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '4rem' : '16rem');

    return () => {
      document.documentElement.style.setProperty('--sidebar-width', '16rem');
    };
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0c1020]/88 backdrop-blur-2xl border-r border-violet-200/10 flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-violet-200/10 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 via-fuchsia-400 to-lime-400 text-white shrink-0 shadow-lg shadow-violet-500/20 ai-icon-glow interactive-lift">
          <Brain className="w-4 h-4" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white truncate">RequestTracker</h1>
            <p className="text-[10px] text-yellow-200 uppercase tracking-[0.15em] flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-lime-300" /> NOVA UI
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-violet-200/70 hover:text-yellow-200 transition-colors shrink-0 interactive-lift"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `interactive-lift flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-400/20 via-yellow-300/10 to-lime-400/10 text-violet-100 border border-violet-200/20 shadow-sm shadow-violet-500/10'
                  : 'text-gray-300 hover:bg-white/5 hover:text-yellow-100 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* AI Status indicator */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl glow-panel">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow shadow-green-400/50" />
            <span className="text-[11px] font-medium text-yellow-100/90">AI Engine Active</span>
          </div>
          <p className="text-[10px] text-violet-100/65">Animated review layer and IT validators online</p>
        </div>
      )}

      {/* User Info */}
      <div className="border-t border-violet-200/10 p-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 text-slate-950 text-sm font-semibold shrink-0 shadow-lg shadow-violet-500/20">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-violet-100/55 capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-violet-100/55 hover:text-yellow-200 transition-colors shrink-0 interactive-lift"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
