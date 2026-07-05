import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import {
  Users, Settings, Shield, Clock, Plus, Edit2, Trash2,
  ChevronLeft, ChevronRight, Cpu,
} from 'lucide-react';

export default function AdminPage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'user' });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const data = await api.get('/users');
        setUsers(data);
      } else if (tab === 'sla') {
        const data = await api.get('/admin/sla');
        setSlaRules(data);
      } else if (tab === 'audit') {
        const data = await api.get(`/admin/audit-log?page=${logPage}&limit=20`);
        setAuditLogs(data.logs);
        setLogTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tab, logPage]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', password: '', role: 'user' });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, password: '', role: user.role });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, userForm);
        addToast('User updated successfully', 'success');
      } else {
        if (!userForm.password) {
          addToast('Password is required for new users', 'error');
          return;
        }
        await api.post('/users', userForm);
        addToast('User created successfully', 'success');
      }
      setShowUserModal(false);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Delete user ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      addToast('User deleted', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdateSLA = async (priority, days) => {
    try {
      await api.put(`/admin/sla/${priority}`, { days: parseInt(days) });
      addToast(`SLA for ${priority} priority updated`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'sla', label: 'SLA Configuration', icon: Clock },
    { id: 'audit', label: 'Audit Log', icon: Shield },
  ];

  return (
    <>
      <Header title="Admin Panel" subtitle="System administration" />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Banner */}
        <div className="relative mb-6 rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400/10 via-yellow-300/10 to-lime-400/10 animate-gradient-shift" />
          <div className="relative border border-purple-500/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-md animate-pulse" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 shadow-lg shadow-violet-500/25">
                <Cpu className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Admin Control Center</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage users, SLA rules, and audit system activity</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit border border-white/5 bg-white/[0.03]" style={{ animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : (
          <>
            {/* User Management */}
            {tab === 'users' && (
              <div className="card ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Users ({users.length})</h3>
                  <button onClick={handleCreateUser} className="ai-btn-primary gap-2">
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Role</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                        <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u, i) => (
                        <tr key={u.id} className="hover:bg-indigo-500/[0.04] transition-colors" style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 0.03}s both` }}>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 text-slate-950 text-xs font-semibold shadow-lg shadow-violet-500/20">
                                {u.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-300">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-400">{u.email}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize border ${
                              u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              u.role === 'supervisor' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>{u.role}</span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditUser(u)} className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteUser(u)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SLA Configuration */}
            {tab === 'sla' && (
              <div className="card max-w-xl ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
                <div className="px-6 py-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">SLA Rules</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Configure due date calculation by priority</p>
                </div>
                <div className="p-6 space-y-4">
                  {slaRules.map((rule, i) => (
                    <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 transition-all" style={{ animation: `fadeSlideUp 0.4s ease-out ${i * 0.1}s both` }}>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg text-white text-xs font-bold uppercase shadow-lg ${
                        rule.priority === 'high' ? 'bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/20' :
                        rule.priority === 'medium' ? 'bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-500/20' :
                        'bg-gradient-to-br from-slate-500 to-gray-600 shadow-slate-500/20'
                      }`}>
                        {rule.priority.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-300 capitalize">{rule.priority} Priority</p>
                        <p className="text-xs text-gray-500">Due date offset from creation</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          defaultValue={rule.days}
                          className="input-field w-20 text-center"
                          onBlur={(e) => {
                            if (parseInt(e.target.value) !== rule.days) {
                              handleUpdateSLA(rule.priority, e.target.value);
                            }
                          }}
                        />
                        <span className="text-sm text-gray-500">days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log */}
            {tab === 'audit' && (
              <div className="card ring-1 ring-white/5" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
                <div className="px-6 py-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">System Audit Log</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Performed By</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Entity</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditLogs.map((log, i) => (
                        <tr key={log.id} className="hover:bg-indigo-500/[0.04] transition-colors" style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 0.03}s both` }}>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-300">{log.performer_name || '—'}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {log.entity_type} #{log.entity_id}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-400 max-w-xs truncate">{log.details}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {logTotalPages > 1 && (
                  <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Page {logPage} of {logTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setLogPage(Math.max(1, logPage - 1))} disabled={logPage === 1} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLogPage(Math.min(logTotalPages, logPage + 1))} disabled={logPage === logTotalPages} className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* User Modal */}
      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
            <input
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              className="input-field"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="input-field"
              placeholder="john@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Password {editingUser && <span className="text-gray-600 font-normal">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="input-field"
              placeholder={editingUser ? '••••••••' : 'Enter password'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className="input-field"
            >
              <option value="user">User</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">Cancel</button>
            <button onClick={handleSaveUser} className="ai-btn-primary">
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
