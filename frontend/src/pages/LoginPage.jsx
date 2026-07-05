import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, Brain, Zap, Shield, ChevronRight } from 'lucide-react';
import AIBackground from '../components/ui/AIBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel — AI Animated Background */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-[#0b1020] via-[#24123e] to-[#15251a]">
        <AIBackground particleCount={100} />

        {/* Overlay content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top logo */}
          <div className="flex items-center gap-3">
            <div className="ai-icon-glow w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 flex items-center justify-center shadow-lg shadow-violet-500/30 interactive-lift">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">RequestTracker</h1>
              <p className="text-[10px] text-yellow-200 uppercase tracking-[0.2em]">Nova Service Desk</p>
            </div>
          </div>

          {/* Center hero */}
          <div className="max-w-lg">
            <div className="ai-float">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-violet-200/20 text-xs text-yellow-100 mb-6 backdrop-blur-sm interactive-lift">
                <Zap className="w-3 h-3 text-lime-300" />
                Intelligent Request Analysis
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Smart IT Request
              <br />
              <span className="ai-gradient-text">Management System</span>
            </h2>
            <p className="text-violet-100/62 text-sm leading-relaxed mb-8">
              AI-powered validation engine that validates your requests against real-world 
              cloud provider rules before ticket creation. Supporting AWS, Azure, GCP, 
              Kubernetes, networking, and more.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: Brain, text: 'AI validates resource names against cloud provider rules' },
                { icon: Shield, text: 'Scope enforcement blocks out-of-scope requests' },
                { icon: Zap, text: 'Smart SLA tracking with automated escalation' },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-violet-200/10 flex items-center justify-center group-hover:bg-violet-400/20 group-hover:border-yellow-300/30 transition-all interactive-lift">
                    <feat.icon className="w-4 h-4 text-yellow-200" />
                  </div>
                  <span className="text-sm text-violet-100/62 group-hover:text-lime-100 transition-colors">{feat.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-xs text-violet-100/42">
            © 2026 RequestTracker · Enterprise AI Platform
          </p>
        </div>
      </div>

      {/* Right panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[#0b1020] relative">
        {/* Subtle particle bg for mobile */}
        <div className="absolute inset-0 lg:hidden">
          <AIBackground particleCount={40} interactive={false} />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 text-white mb-4 shadow-lg shadow-violet-500/30 ai-icon-glow interactive-lift">
              <Brain className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">RequestTracker</h1>
            <p className="text-sm text-yellow-100/70 mt-1">Nova Service Desk</p>
          </div>

          {/* Login Card */}
          <div className="ai-glass-card rounded-2xl p-8 page-transition">
            <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-violet-100/58 mb-6">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-yellow-100/78 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ai-input"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-yellow-100/78 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ai-input pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-100/46 hover:text-yellow-100 transition-colors interactive-lift"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ai-btn-primary w-full h-11 mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Sign In
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] text-violet-100/45 mb-3 font-medium uppercase tracking-[0.15em]">Quick Access — Demo Accounts</p>
              <div className="space-y-2">
                {[
                  { email: 'admin@company.com', password: 'admin123', role: 'Admin', color: 'from-red-500 to-orange-500' },
                  { email: 'smartasundar@gmail.com', password: 'super123', role: 'Supervisor', color: 'from-indigo-500 to-purple-500' },
                  { email: 'aishwaryadharmar9@gmail.com', password: 'user123', role: 'User', color: 'from-cyan-500 to-blue-500' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => { setEmail(demo.email); setPassword(demo.password); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-violet-200/10 hover:border-yellow-300/20 transition-all text-left group interactive-lift"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${demo.color} flex items-center justify-center text-white text-[10px] font-bold shadow`}>
                        {demo.role[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{demo.role}</p>
                        <p className="text-[11px] text-violet-100/48">{demo.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-violet-100/45 group-hover:text-yellow-100 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
