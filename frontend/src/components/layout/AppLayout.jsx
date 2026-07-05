import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIBackground from '../ui/AIBackground';

export default function AppLayout() {
  return (
    <div className="app-shell min-h-screen flex bg-transparent">
      <div className="app-shell-background fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1020] via-[#24123e] to-[#15251a]" />
        <AIBackground particleCount={90} interactive={false} className="opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.08),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_28%)]" />
      </div>
      <div className="relative z-10 flex w-full min-h-screen">
        <Sidebar />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width, 16rem)' }}
      >
        <div className="page-transition flex-1 flex flex-col">
          <Outlet />
        </div>
      </div>
      </div>
    </div>
  );
}
