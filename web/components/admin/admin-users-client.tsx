'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Calendar,
  Activity,
  Mail,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Crown,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { isAdmin } from '@/lib/admin-service';
import { supabase } from '@/lib/supabase';

interface AdminUserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  profile?: {
    full_name?: string;
    role?: string;
    updated_at?: string;
  };
  sensor_count?: number;
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ full_name: string; role: 'admin' | 'user' }>({ full_name: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Check admin access
      const adminStatus = await isAdmin();
      setHasAdminAccess(adminStatus);
      
      if (!adminStatus) return;

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token available');
        return;
      }

      // Fetch users with real email addresses using API route
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users:', response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: AdminUserData) => {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.profile?.full_name || '',
      role: (user.profile?.role as 'admin' | 'user') || 'user'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('No session token available');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: editingUser,
          updates: editForm
        })
      });
      
      if (response.ok) {
        setEditingUser(null);
        await loadUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert('Error updating user: ' + error.error);
      }
    } catch (error) {
      alert('Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setSaving(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('No session token available');
        return;
      }

      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        setDeleteConfirm(null);
        await loadUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert('Error deleting user: ' + error.error);
      }
    } catch (error) {
      alert('Error deleting user');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ full_name: '', role: 'user' });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.profile?.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
          <Crown className="w-3 h-3 mr-1" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
        User
      </span>
    );
  };

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-slate-400">
          You need admin permissions to manage users.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-slate-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{users.length}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {users.filter(u => u.profile?.role === 'admin').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Admins</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <UserPlus className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {users.filter(u => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(u.created_at) > weekAgo;
                }).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">New This Week</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {users.reduce((sum, u) => sum + (u.sensor_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Sensors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Sensors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.profile?.full_name?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div className="ml-4">
                        {editingUser === user.id ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              placeholder="Full name"
                              className="text-sm font-medium bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 w-32"
                            />
                            <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {user.profile?.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                        className="text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      getRoleBadge(user.profile?.role)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-slate-100">
                        {user.sensor_count || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {editingUser === user.id ? (
                        <>
                          <button 
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
              No users found
            </h3>
            <p className="text-gray-600 dark:text-slate-400">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'No users have been registered yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Delete User
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Are you sure you want to delete this user? This action cannot be undone and will remove all their data including sensors and achievements.
              </p>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}