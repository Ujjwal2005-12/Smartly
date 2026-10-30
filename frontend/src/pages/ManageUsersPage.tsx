import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { userService } from '../services/user.service';
import { User, UserRole } from '../types';
import { Modal } from '../components/common/Modal';

export const ManageUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('FACULTY');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STUDENT');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditActive(u.is_active === 1 || u.is_active === true);
    setActionError(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await userService.updateUser(editingUser.id, {
        name: editName.trim(),
        role: editRole,
        is_active: editActive ? 1 : 0,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: editName.trim(), role: editRole, is_active: editActive ? 1 : 0 }
            : u
        )
      );

      setActionSuccess(`User ${editName} updated successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
      setEditingUser(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await userService.createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setUsers((previous) => [...previous, result.user]);
      setActionSuccess(`${result.user.role} account created for ${result.user.name}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('FACULTY');
    } catch (err: any) {
      setActionError(err.message || 'Failed to create user account');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#17243B] tracking-tight">Manage Users</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Control institutional account privileges, roles, and access status.</p>
          </div>
          <button
            onClick={() => { setActionError(null); setCreateOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2166F3] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a54cc]"
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-[#EAF7F0] border border-[#B7E7D1] text-[#20A875] text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-[#FEF7EC] border border-[#FCE1B6] text-[#E09214] text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E1E8F0] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              roleFilter === 'ALL' ? 'bg-[#2166F3] text-white' : 'bg-[#F8FAFC] text-[#718096]'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setRoleFilter('STUDENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              roleFilter === 'STUDENT' ? 'bg-[#2166F3] text-white' : 'bg-[#F8FAFC] text-[#718096]'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setRoleFilter('FACULTY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              roleFilter === 'FACULTY' ? 'bg-[#2166F3] text-white' : 'bg-[#F8FAFC] text-[#718096]'
            }`}
          >
            Faculty
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              roleFilter === 'ADMIN' ? 'bg-[#2166F3] text-white' : 'bg-[#F8FAFC] text-[#718096]'
            }`}
          >
            Admins
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#718096]">Loading user directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E1E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E8F0] text-xs">
                {filtered.map((u) => {
                  const isActive = u.is_active === 1 || u.is_active === true;
                  return (
                    <tr key={u.id} className="hover:bg-[#F3F7FC]">
                      <td className="py-3.5 px-4 font-semibold text-[#17243B]">{u.name}</td>
                      <td className="py-3.5 px-4 text-[#718096]">{u.email}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#2166F3]">{u.role}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? 'bg-[#EAF7F0] text-[#20A875]'
                              : 'bg-[#FDEEF0] text-[#E65363]'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-[#2166F3] hover:text-[#1a54cc] font-medium text-[11px] hover:underline"
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#718096] text-xs">
                      No accounts found matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit User: ${editingUser?.name}`}
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-1.5 text-xs text-[#17243B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Email</label>
            <input
              type="text"
              value={editingUser?.email || ''}
              disabled
              className="w-full bg-[#F1F5F9] border border-[#E1E8F0] rounded-lg px-3 py-1.5 text-xs text-[#718096] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Access Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#17243B]"
            >
              <option value="STUDENT">STUDENT</option>
              <option value="FACULTY">FACULTY</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-[#E1E8F0] text-[#2166F3] focus:ring-[#2166F3] h-4 w-4"
              />
              <span className="text-[12px] font-semibold text-[#17243B]">Account Active</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-3 py-1.5 rounded-lg border border-[#E1E8F0] text-[#718096] hover:bg-[#F3F7FC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-lg bg-[#2166F3] hover:bg-[#1a54cc] text-white font-semibold disabled:opacity-60"
            >
              {actionLoading ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create User Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Full Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required minLength={2}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Temporary Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]" />
            <p className="mt-1 text-[10px] text-[#718096]">Share this password securely; the user can change it after signing in.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Account Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-2 text-xs text-[#17243B]">
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1.5 rounded-lg border border-[#E1E8F0] text-[#718096] hover:bg-[#F3F7FC]">Cancel</button>
            <button type="submit" disabled={actionLoading} className="px-4 py-1.5 rounded-lg bg-[#2166F3] hover:bg-[#1a54cc] text-white font-semibold disabled:opacity-60">
              {actionLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
