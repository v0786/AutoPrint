import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Lock,
  Mail,
  Phone,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export interface UserAccount {
  id: string;
  username: string;
  owner_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'staff';
  is_active: number;
  branch?: string;
  kiosk_number?: string;
  created_at: string;
  updated_at?: string;
}

interface UserManagementViewProps {
  currentUserId?: string;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'staff'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form States for Add User
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<'staff' | 'admin'>('staff');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Form State for Password Reset
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('autoprint_merchant_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiFetch('/api/merchant/users', { headers });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to load user accounts.');
      }

      setUsers(json.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to backend user repository.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('autoprint_merchant_session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiFetch('/api/merchant/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: newUsername.trim(),
          ownerName: newFullName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || undefined,
          password: newPassword,
          role: newRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to create user account.');
      }

      setSuccessMessage(json.message || `User @${newUsername} created successfully.`);
      setIsAddModalOpen(false);
      // Reset form
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('staff');
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add user.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('autoprint_merchant_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiFetch(`/api/merchant/users/${userId}`, {
        method: 'DELETE',
        headers,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to delete user.');
      }

      setSuccessMessage('User account deleted successfully.');
      setDeleteConfirmId(null);
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete user.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    setResetSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('autoprint_merchant_session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiFetch(`/api/merchant/users/${selectedUserForReset.id}/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: resetPasswordValue }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to reset password.');
      }

      setSuccessMessage(`Password updated successfully for @${selectedUserForReset.username}.`);
      setIsResetModalOpen(false);
      setSelectedUserForReset(null);
      setResetPasswordValue('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const staffCount = users.filter((u) => u.role === 'staff').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Staff & User Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Control desk operators, assign roles, and safeguard counter permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Refresh user roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141419]/90 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400 font-medium">Total Registered Users</div>
            <div className="text-2xl font-black text-white mt-1">{users.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#141419]/90 border border-purple-500/20 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-300 font-medium">System Administrators</div>
            <div className="text-2xl font-black text-purple-200 mt-1">{adminCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#141419]/90 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-300 font-medium">Staff & Desk Operators</div>
            <div className="text-2xl font-black text-blue-200 mt-1">{staffCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#141419]/90 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by username, name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-zinc-400 hidden sm:inline">Role:</span>
          {(['all', 'admin', 'staff'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRole === role
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {role === 'all' ? 'All Roles' : role === 'admin' ? 'Admins' : 'Staff'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#141419]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#1e1f26]/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-4 px-6">User & Identity</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Contact</th>
                <th className="py-4 px-6">Role & Status</th>
                <th className="py-4 px-6">Created On</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-zinc-400">No user accounts found</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Try adjusting your search query or add a new user.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const isCurrent = currentUserId === user.id || user.username === 'admin';

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border ${
                              isAdmin
                                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                                : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {user.owner_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{user.owner_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500">{user.shop_name || 'Desk Counter'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-purple-300 font-semibold">
                          @{user.username || user.email.split('@')[0]}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-6 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Mail className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Role & Status */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              <ShieldCheck className="w-3 h-3 text-purple-400" />
                              Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              <User className="w-3 h-3 text-blue-400" />
                              Staff Operator
                            </span>
                          )}
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active</span>
                          </div>
                        </div>
                      </td>

                      {/* Created On */}
                      <td className="py-4 px-6 text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserForReset(user);
                              setIsResetModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(user.id)}
                              disabled={isCurrent && adminCount <= 1}
                              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isCurrent && adminCount <= 1 ? 'Cannot delete sole admin' : 'Delete user'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141419] rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-5 text-white animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New User</h3>
                  <p className="text-xs text-zinc-400">Admin authorization required</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Username <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cashier_1 or rahul"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Full Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Phone</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Initial Password <span className="text-purple-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('staff')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newRole === 'staff'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Staff Operator</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Verification & Print Desk</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newRole === 'admin'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Administrator</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Full Settings & Users</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {formSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#141419] rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 text-white animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Password</h3>
                  <p className="text-xs text-zinc-400">For @{selectedUserForReset.username}</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 6 chars)"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {resetSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
