'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminUser, UserRole } from '@kynetra/contracts';
import { supabase } from '../../lib/supabase/client';

interface AdminUserManagementModalProps {
  apiBase: string;
  userRole: UserRole;
  onClose: () => void;
  onUserModified?: () => void;
}

export function AdminUserManagementModal({
  apiBase,
  userRole,
  onClose,
  onUserModified,
}: AdminUserManagementModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form State for Creating a New User
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newXp, setNewXp] = useState(100);
  const [newStatus, setNewStatus] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Status Notice
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Fetch real users from PostgreSQL database (API or Supabase direct)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try Fastify platform API service
      try {
        const res = await fetch(`${apiBase}/api/v1/admin/users`);
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to Supabase direct client
      }

      // 2. Direct Supabase Cloud Database query
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showNotice(`Supabase error: ${error.message}`);
      } else if (data) {
        setUsers(
          data.map((u: any) => ({
            id: u.id,
            email: u.email,
            handle: u.handle,
            displayName: u.display_name,
            role: (u.role || 'employee') as UserRole,
            xp: u.xp || 0,
            currentDistrictId: u.current_district_id || 'kynetra-central',
            statusMessage: u.status_message || '',
            createdAt: u.created_at || new Date().toISOString(),
            updatedAt: u.updated_at || new Date().toISOString(),
          }))
        );
      }
      setLoading(false);
    } catch {
      setLoading(false);
      showNotice('Failed to connect to users database');
    }
  }, [apiBase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newHandle) {
      setFormError('Please fill in all required fields');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      let created = false;

      // 1. Try API service
      try {
        const res = await fetch(`${apiBase}/api/v1/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newEmail.trim(),
            displayName: newName.trim(),
            handle: newHandle.trim(),
            role: newRole,
            xp: newXp,
            statusMessage: newStatus.trim() || 'Ready for engineering assignments',
            currentDistrictId: 'kynetra-central',
          }),
        });

        if (res.ok) {
          created = true;
        }
      } catch {
        // Fall through to Supabase direct insert
      }

      // 2. Direct Supabase Cloud insert
      if (!created) {
        const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const { error: supaErr } = await supabase.from('users').insert({
          id: userId,
          email: newEmail.trim(),
          handle: newHandle.trim(),
          display_name: newName.trim(),
          role: newRole,
          xp: newXp,
          status_message: newStatus.trim() || 'Ready for engineering assignments',
          current_district_id: 'kynetra-central',
          password_hash: '$2a$12$defaultHashedPasswordForDevEnvironment1234567890',
        });

        if (supaErr) {
          setFormError(supaErr.message);
          return;
        }
      }

      showNotice(`User '${newName}' created successfully!`);
      setShowCreateForm(false);
      setNewName('');
      setNewEmail('');
      setNewHandle('');
      setNewRole('employee');
      setNewXp(100);
      setNewStatus('');
      fetchUsers();
      if (onUserModified) onUserModified();
    } catch {
      setFormError('Network error connecting to database');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: string, targetRole: UserRole) => {
    try {
      let updated = false;

      // 1. Try API service
      try {
        const res = await fetch(`${apiBase}/api/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: targetRole }),
        });
        if (res.ok) {
          updated = true;
        }
      } catch {
        // Fall through to Supabase
      }

      // 2. Direct Supabase update
      if (!updated) {
        const { error: supaErr } = await supabase
          .from('users')
          .update({ role: targetRole, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (supaErr) {
          showNotice(`Error: ${supaErr.message}`);
          return;
        }
      }

      showNotice(`User role updated to '${targetRole}'.`);
      fetchUsers();
      if (onUserModified) onUserModified();
    } catch {
      showNotice('Network error updating user role');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === 'usr_admin_01') {
      showNotice('Cannot delete primary root administrator account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}" from the database?`)) {
      return;
    }

    try {
      let deleted = false;

      // 1. Try API service
      try {
        const res = await fetch(`${apiBase}/api/v1/admin/users/${userId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          deleted = true;
        }
      } catch {
        // Fall through to Supabase
      }

      // 2. Direct Supabase delete
      if (!deleted) {
        const { error: supaErr } = await supabase.from('users').delete().eq('id', userId);
        if (supaErr) {
          showNotice(`Failed to delete: ${supaErr.message}`);
          return;
        }
      }

      showNotice(`User '${userName}' removed from database.`);
      fetchUsers();
      if (onUserModified) onUserModified();
    } catch {
      showNotice('Network error deleting user');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const archsCount = users.filter((u) => u.role === 'architect').length;
  const empsCount = users.filter((u) => u.role === 'employee').length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '90vh',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '2px solid #f59e0b',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>👑</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  Executive Admin Suite — User & RBAC Management Terminal
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid #f59e0b',
                    color: '#fbbf24',
                    fontWeight: 700,
                  }}
                >
                  LIVE POSTGRESQL
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Direct CRUD management for platform accounts, access control levels, and career tiers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMsg && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(245, 158, 11, 0.2)',
              borderBottom: '1px solid #f59e0b',
              color: '#fbbf24',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            ⚡ {statusMsg}
          </div>
        )}

        {/* Metrics Counter Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            padding: '14px 24px',
            background: 'rgba(2, 6, 23, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>TOTAL USERS</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{users.length}</div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '11px', color: '#f87171', fontFamily: 'var(--font-mono)' }}>ADMINISTRATORS</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>{adminsCount}</div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>ARCHITECTS</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>{archsCount}</div>
          </div>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>ENGINEERS</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>{empsCount}</div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            gap: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by name, email, or handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '340px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(203, 213, 225, 0.2)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(203, 213, 225, 0.2)',
                color: '#fff',
                fontSize: '12px',
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="architect">Architect</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchUsers}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '12px' }}
              title="Refresh users from PostgreSQL"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>+</span>
              <span>Create New User</span>
            </button>
          </div>
        </div>

        {/* Collapsible User Creation Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateUser}
            style={{
              padding: '16px 24px',
              background: 'rgba(2, 6, 23, 0.9)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                PROVISION NEW KYNETRA USER
              </span>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕ Close Form
              </button>
            </div>

            {formError && (
              <div style={{ color: '#f87171', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                ⚠️ {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Maya Sterling"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya@kynetra.dev"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Handle / Nickname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. maya_dev"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  RBAC Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  <option value="employee">Employee</option>
                  <option value="architect">Architect</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Initial Career XP
                </label>
                <input
                  type="number"
                  value={newXp}
                  onChange={(e) => setNewXp(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Status Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Kubernetes Architect"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={formSubmitting}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '12px', fontWeight: 700 }}
              >
                {formSubmitting ? 'Saving to Database...' : 'Commit User to PostgreSQL'}
              </button>
            </div>
          </form>
        )}

        {/* Users Table Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              Querying live users from PostgreSQL database...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              No users matching your search criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14px' }}>
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <th style={{ padding: '10px 8px' }}>USER</th>
                  <th style={{ padding: '10px 8px' }}>EMAIL</th>
                  <th style={{ padding: '10px 8px' }}>ROLE</th>
                  <th style={{ padding: '10px 8px' }}>XP</th>
                  <th style={{ padding: '10px 8px' }}>DISTRICT</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '12px',
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background:
                              u.role === 'admin'
                                ? '#ef4444'
                                : u.role === 'architect'
                                ? '#f59e0b'
                                : '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        >
                          {u.displayName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.displayName}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                            @{u.handle}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                      {u.email}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      {userRole === 'admin' ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(30, 41, 59, 0.9)',
                            border: `1px solid ${
                              u.role === 'admin' ? '#f87171' : u.role === 'architect' ? '#fbbf24' : '#60a5fa'
                            }`,
                            color: u.role === 'admin' ? '#f87171' : u.role === 'architect' ? '#fbbf24' : '#60a5fa',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          <option value="employee">Employee</option>
                          <option value="architect">Architect</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: u.role === 'admin' ? '#f87171' : u.role === 'architect' ? '#fbbf24' : '#60a5fa',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: '#fbbf24', fontWeight: 700 }}>
                      ⚡ {u.xp}
                    </td>

                    <td style={{ padding: '12px 8px', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {u.currentDistrictId}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {u.id !== 'usr_admin_01' && userRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.displayName)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Delete from database"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
