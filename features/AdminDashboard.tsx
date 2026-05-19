
import React, { useState, useEffect } from 'react';
import { UserAccount, UserSession } from '../types';
import { Card, Button, Input, Select, Modal, ConfirmModal } from '../components/Shared';
import { Eye, EyeOff, Trash2, UserPlus, Users, Calendar, Shield, Smartphone, Send, Clock, Search, X, Video, Play, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { getUserTierName } from '../lib/tier';

interface Props {
  onBack: () => void;
  session: UserSession;
}

const AdminDashboard: React.FC<Props> = ({ onBack, session }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tutorials' | 'settings'>('users');
  
  // Settings state
  const [limits, setLimits] = useState({
    ai_voice_guest_limit: 2,
    transcribe_guest_limit: 2,
    transcribe_user_limit: 3
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Tutorials state
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialToDelete, setTutorialToDelete] = useState<any | null>(null);
  const [tutorialFormData, setTutorialFormData] = useState({
    id: '',
    title: '',
    video_id: '',
    time_start: 0,
    content: '',
    tool_key: ''
  });

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    startDate: new Date().toISOString().split('T')[0],
    expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isLifetime: false,
    telegram: '',
    linkTranscribeExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const getAdminHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Admin-ID': session.adminAuth?.id || '',
      'X-Admin-Pass': session.adminAuth?.pass || ''
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: getAdminHeaders()
      });
      if (response.ok) {
        const rawData = await response.json();
        const mappedData: UserAccount[] = rawData.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          password: u.password,
          role: u.role,
          startDate: u.start_date,
          expiredDate: u.expired_date,
          isLifetime: u.is_lifetime,
          telegram: u.telegram,
          deviceId: u.device_id,
          lastLogin: u.last_login,
          createdAt: u.created_at,
          linkTranscribeExpiry: u.link_transcribe_expiry
        }));
        setUsers(mappedData);
      } else {
        const errText = await response.text();
        throw new Error(`Failed to fetch users: ${errText}`);
      }
    } catch (err: any) {
      toast.error(`Error fetching users: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTutorials = async () => {
    setTutorialsLoading(true);
    try {
      const response = await fetch('/api/admin/tutorials', {
        headers: getAdminHeaders()
      });
      if (response.ok) {
        setTutorials(await response.json());
      } else {
        const errText = await response.text();
        throw new Error(`Failed to fetch tutorials: ${errText}`);
      }
    } catch (err: any) {
      toast.error(`Error fetching tutorials: ${err.message}`);
      console.error(err);
    } finally {
      setTutorialsLoading(false);
    }
  };

  const fetchLimits = async () => {
    setSettingsLoading(true);
    try {
      const { getUsageLimits } = await import('../services/usageService');
      const data = await getUsageLimits();
      setLimits(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTutorials();
    fetchLimits();
  }, []);

  const handleSaveLimits = async () => {
    setSettingsLoading(true);
    try {
      const { updateUsageLimits } = await import('../services/usageService');
      const success = await updateUsageLimits(limits);
      if (success) {
        toast.success('Usage limits updated successfully');
      } else {
        toast.error('Failed to update usage limits (Check Supabase setup)');
      }
    } catch (err) {
      toast.error('Failed to update usage limits');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleEditUser = (user: UserAccount) => {
    const parseToISO = (val: any) => {
      if (!val) return new Date().toISOString().split('T')[0];
      const date = !isNaN(Number(val)) ? new Date(Number(val)) : new Date(val);
      return date.toISOString().split('T')[0];
    };

    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      startDate: parseToISO(user.startDate),
      expiredDate: user.isLifetime ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : parseToISO(user.expiredDate),
      isLifetime: user.isLifetime,
      telegram: user.telegram || '',
      linkTranscribeExpiry: parseToISO(user.linkTranscribeExpiry)
    });
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          startDate: new Date(formData.startDate + 'T00:00:00').getTime(),
          expiredDate: formData.isLifetime ? null : new Date(formData.expiredDate + 'T23:59:59').getTime(),
          linkTranscribeExpiry: new Date(formData.linkTranscribeExpiry + 'T23:59:59').getTime(),
          isLifetime: formData.isLifetime,
          telegram: formData.telegram,
          deviceId: editingUser?.deviceId || null
        })
      });

      if (response.ok) {
        toast.success(editingUser ? 'User updated successfully' : 'User added successfully');
        setShowAddModal(false);
        setEditingUser(null);
        setFormData({
          name: '',
          username: '',
          password: '',
          role: 'user',
          startDate: new Date().toISOString().split('T')[0],
          expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isLifetime: false,
          telegram: '',
          linkTranscribeExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        fetchUsers();
      } else {
        throw new Error('Failed to save user');
      }
    } catch (err) {
      toast.error('Failed to save user');
      console.error(err);
    }
  };

  const handleResetDevice = async (username: string) => {
    try {
      const user = users.find(u => u.username === username);
      if (!user) return;

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...user,
          startDate: user.startDate, // already numeric from mapped users
          expiredDate: user.expiredDate,
          deviceId: null // Resetting device ID
        })
      });

      if (response.ok) {
        toast.success('Device bound reset successfully');
        fetchUsers();
      } else {
        throw new Error('Failed to reset device');
      }
    } catch (err) {
      toast.error('Failed to reset device');
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.username}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (response.ok) {
        toast.success('User deleted successfully');
        setUserToDelete(null);
        fetchUsers();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
    }
  };

  const extractYouTubeId = (url: string) => {
    if (!url) return '';
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) return url;
    
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : url;
  };

  const handleSaveTutorial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/tutorials', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          id: tutorialFormData.id || undefined,
          title: tutorialFormData.title,
          video_id: extractYouTubeId(tutorialFormData.video_id),
          time_start: tutorialFormData.time_start,
          content: tutorialFormData.content,
          tool_key: tutorialFormData.tool_key || null
        })
      });

      if (response.ok) {
        toast.success(tutorialFormData.id ? 'Tutorial updated' : 'Tutorial added');
        setShowTutorialModal(false);
        setTutorialFormData({ id: '', title: '', video_id: '', time_start: 0, content: '', tool_key: '' });
        fetchTutorials();
      } else {
        throw new Error('Failed to save tutorial');
      }
    } catch (err) {
      toast.error('Failed to save tutorial');
      console.error(err);
    }
  };

  const handleDeleteTutorialConfirm = async () => {
    if (!tutorialToDelete) return;
    try {
      const response = await fetch(`/api/admin/tutorials/${tutorialToDelete.id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (response.ok) {
        toast.success('Tutorial deleted successfully');
        setTutorialToDelete(null);
        fetchTutorials();
      } else {
        throw new Error('Failed to delete tutorial');
      }
    } catch (err) {
      toast.error('Failed to delete tutorial');
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.telegram.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTutorials = tutorials.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.tool_key && t.tool_key.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatus = (user: UserAccount) => {
    if (user.isLifetime) return { label: 'Lifetime', color: 'text-purple-600 bg-purple-50' };
    if (!user.expiredDate) return { label: 'Invalid', color: 'text-gray-400 bg-gray-50' };
    
    const now = Date.now();
    const expiredDate = typeof user.expiredDate === 'string' 
      ? (!isNaN(Number(user.expiredDate)) ? Number(user.expiredDate) : new Date(user.expiredDate).getTime())
      : user.expiredDate;

    if (now > expiredDate) return { label: 'Expired', color: 'text-red-600 bg-red-50' };
    
    const daysLeft = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: 'text-amber-600 bg-amber-50' };
    
    return { label: 'Active', color: 'text-emerald-600 bg-emerald-50' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <X size={20} />
          </Button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-gray-500 font-medium">Manage user accounts and system configuration</p>
          </div>
        </div>
        {activeTab === 'users' && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6">
            <UserPlus size={18} /> Add New User
          </Button>
        )}
        {activeTab === 'tutorials' && (
          <Button onClick={() => setShowTutorialModal(true)} className="flex items-center gap-2 px-6 bg-purple-600 hover:bg-purple-700">
            <Video size={18} /> Add Tutorial
          </Button>
        )}
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 flex-wrap rounded-xl w-full max-w-md">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'users'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('tutorials')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'tutorials'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Tutorials
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'users' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Users</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{users.length}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Active Licenses</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {users.filter(u => u.isLifetime || (u.expiredDate && u.expiredDate > Date.now())).length}
            </p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Recently Added</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {users.filter(u => Date.now() - u.createdAt < 24 * 60 * 60 * 1000).length}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID or Telegram..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCredentials(!showCredentials)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              {showCredentials ? <EyeOff size={16} /> : <Eye size={16} />}
              {showCredentials ? 'Hide IDs' : 'Show IDs'}
            </button>
            <Button variant="secondary" onClick={fetchUsers} className="flex items-center gap-2 px-4 shadow-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50">
              <Clock size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">User Information</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Account Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Device</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <p className="font-bold uppercase tracking-widest text-[10px]">No users found</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const status = getStatus(user);
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{user.name}</span>
                        {showCredentials ? (
                          <div className="flex flex-col mt-1 space-y-0.5">
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 w-fit px-1.5 rounded">ID: {user.username}</span>
                            <span className="text-[10px] font-mono text-amber-600 bg-amber-50 w-fit px-1.5 rounded">PW: {user.password}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0.5 italic">Credentials Hidden</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest w-fit px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                           <Shield size={12} />
                           <span className="capitalize">{getUserTierName(user)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          <span>Exp: {user.isLifetime ? 'Unlimited' : new Date(user.expiredDate || 0).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Video size={12} className="text-purple-400" />
                          <span className={`${(user.linkTranscribeExpiry && user.linkTranscribeExpiry < Date.now()) ? 'text-red-500 line-through' : ''}`}>
                            Link: {user.linkTranscribeExpiry ? new Date(user.linkTranscribeExpiry).toLocaleDateString() : 'Not Set'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Send size={12} className="text-sky-500" />
                          <span>{user.telegram || 'Not set'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <Smartphone size={12} />
                          {user.deviceId ? <span className="text-gray-600 dark:text-gray-300">Bound</span> : <span>Available</span>}
                        </div>
                        {user.deviceId && (
                          <span className="text-[8px] font-mono text-gray-400 truncate max-w-[100px]">{user.deviceId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                         onClick={() => handleEditUser(user)}
                         className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                         title="Edit User"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setUserToDelete(user)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      </>
      )}

      {activeTab === 'settings' && (
        <Card className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">System Usage Limits</h3>
            <p className="text-sm text-gray-500">Configure daily usage limits for different tools and user types.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">AI Voice Limits</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Guest Limit (Daily)" 
                  type="number"
                  value={limits.ai_voice_guest_limit.toString()}
                  onChange={(val) => setLimits({...limits, ai_voice_guest_limit: parseInt(val) || 0})}
                  placeholder="2"
                />
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-800">
                  <Shield size={20} className="text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Logged in: Unlimited</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-black uppercase tracking-widest text-purple-500">YouTube Transcribe Limits</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Guest Limit (Daily)" 
                  type="number"
                  value={limits.transcribe_guest_limit.toString()}
                  onChange={(val) => setLimits({...limits, transcribe_guest_limit: parseInt(val) || 0})}
                  placeholder="2"
                />
                <Input 
                  label="User Limit (Daily)" 
                  type="number"
                  value={limits.transcribe_user_limit.toString()}
                  onChange={(val) => setLimits({...limits, transcribe_user_limit: parseInt(val) || 0})}
                  placeholder="3"
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveLimits} 
              disabled={settingsLoading}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white shadow-xl flex items-center justify-center gap-2"
            >
              {settingsLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Save Limits Configuration</>
              )}
            </Button>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
              <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Note:</strong> Limits are tracked per day based on Device ID for guests and Username for logged-in users. 
                Requires Supabase to be configured correctly with the necessary tables.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'tutorials' && (
      <>
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tutorials by title or tool..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={fetchTutorials} className="flex items-center gap-2 px-4 shadow-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 text-purple-600">
              <Clock size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/3">Title & Tool</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Video Content</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {tutorialsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Loading tutorials...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTutorials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <p className="font-bold uppercase tracking-widest text-[10px]">No tutorials found</p>
                  </td>
                </tr>
              ) : filteredTutorials.map((tut) => (
                <tr key={tut.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">#{tut.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2">{tut.title}</span>
                      {tut.tool_key && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 w-fit px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {tut.tool_key}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Video size={12} className="text-gray-400" />
                        <span className="font-mono">{tut.video_id}</span>
                        {tut.time_start > 0 && <span className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">@ {tut.time_start}s</span>}
                      </div>
                      {tut.content && (
                        <p className="line-clamp-2 text-xs italic opacity-75 mt-1 max-w-xs">{tut.content}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setTutorialFormData(tut);
                          setShowTutorialModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setTutorialToDelete(tut)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </>
      )}

      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setEditingUser(null);
        }} 
        title={editingUser ? "Edit User Account" : "Add User Account"}
      >
        <form onSubmit={handleAddUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Full Name" 
              placeholder="e.g. Kyaw Kyaw" 
              value={formData.name} 
              onChange={(val) => setFormData({...formData, name: val})} 
              className="md:col-span-2"
            />
            <Input 
              label="Username / ID" 
              placeholder="e.g. user_001" 
              value={formData.username} 
              onChange={(val) => setFormData({...formData, username: val})} 
              disabled={!!editingUser}
            />
            {editingUser && (
              <div className="flex items-end pb-1">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleResetDevice(editingUser.username)}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 py-1"
                >
                  Reset Device Lock
                </Button>
              </div>
            )}
            <Input 
              label="Password" 
              type="text"
              placeholder="Enter password" 
              value={formData.password} 
              onChange={(val) => setFormData({...formData, password: val})} 
            />
            <Select 
              label="Role" 
              value={formData.role} 
              onChange={(val) => setFormData({...formData, role: val as any})} 
              options={[
                { label: 'Standard User', value: 'user' },
                { label: 'Administrator', value: 'admin' }
              ]}
            />
            <Input 
              label="Telegram (Contact)" 
              placeholder="@username or phone" 
              value={formData.telegram} 
              onChange={(val) => setFormData({...formData, telegram: val})} 
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">License Type</label>
                {editingUser && !formData.isLifetime && (
                  <p className="text-[10px] text-gray-400 mt-1">Set expire date to extend subscription</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lifetime</span>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isLifetime: !formData.isLifetime})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.isLifetime ? 'bg-purple-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isLifetime ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Start Date" 
                type="date"
                value={formData.startDate} 
                onChange={(val) => setFormData({...formData, startDate: val})} 
              />
              {!formData.isLifetime && (
                <Input 
                  label="Expired Date" 
                  type="date"
                  value={formData.expiredDate} 
                  onChange={(val) => setFormData({...formData, expiredDate: val})} 
                />
              )}
              <Input 
                label="Link Transcribe Validity" 
                type="date"
                value={formData.linkTranscribeExpiry} 
                onChange={(val) => setFormData({...formData, linkTranscribeExpiry: val})} 
              />
            </div>
          </div>

          <Button type="submit" className={`w-full py-4 mt-4 shadow-xl ${editingUser ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
            {editingUser ? 'Update Account' : 'Create Account'}
          </Button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User Account"
        message={`Are you sure you want to delete ${userToDelete?.name}'s account? This action cannot be undone.`}
        confirmText="Delete Account"
        variant="danger"
      />

      {/* Tutorial Modals */}
      <Modal 
        isOpen={showTutorialModal} 
        onClose={() => setShowTutorialModal(false)} 
        title={tutorialFormData.id ? "Edit Tutorial" : "Add Tutorial"}
        contentClassName="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <form onSubmit={handleSaveTutorial} className="space-y-6">
          <Input 
            label="Title" 
            placeholder="e.g. How to use AI Voice" 
            value={tutorialFormData.title} 
            onChange={(val) => setTutorialFormData({...tutorialFormData, title: val})} 
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="YouTube Video ID" 
              placeholder="e.g. dQw4w9WgXcQ" 
              value={tutorialFormData.video_id} 
              onChange={(val) => setTutorialFormData({...tutorialFormData, video_id: val})} 
              required
            />
            <Input 
              label="Start Time (seconds)" 
              type="number"
              placeholder="0" 
              value={tutorialFormData.time_start.toString()} 
              onChange={(val) => setTutorialFormData({...tutorialFormData, time_start: parseInt(val) || 0})} 
            />
          </div>
          <Select 
            label="Tool / Feature Key" 
            value={tutorialFormData.tool_key || ''} 
            onChange={(val) => setTutorialFormData({...tutorialFormData, tool_key: val})} 
            options={[
              { label: 'None (Global)', value: '' },
              { label: 'AI Voice', value: 'ai-voice' },
              { label: 'Transcribe', value: 'transcribe' },
              { label: 'Translate', value: 'translate' },
              { label: 'SRT Generator', value: 'sub-generator' },
              { label: 'SRT Translate', value: 'srt-translate' },
              { label: 'AI Script Writer', value: 'script-writer' },
              { label: 'Teleprompter', value: 'teleprompter' },
              { label: 'Text to SRT', value: 'text-to-srt' },
              { label: 'Note Pad', value: 'note-pad' },
              { label: 'Home API Key', value: 'api_key' },
              { label: 'Music Playlist', value: 'music_playlist' }
            ]}
          />
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
              Description / Content
            </label>
            <textarea
              value={tutorialFormData.content || ''}
              onChange={(e) => setTutorialFormData({...tutorialFormData, content: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-gray-900"
              rows={4}
              placeholder="Any additional notes or descriptions..."
            />
          </div>
          <Button type="submit" className="w-full py-4 mt-4 shadow-xl bg-purple-600 hover:bg-purple-700">
            {tutorialFormData.id ? "Save Changes" : "Create Tutorial"}
          </Button>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!tutorialToDelete}
        onClose={() => setTutorialToDelete(null)}
        onConfirm={handleDeleteTutorialConfirm}
        title="Delete Tutorial"
        message={`Are you sure you want to delete "${tutorialToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Tutorial"
        variant="danger"
      />

    </div>
  );
};

export default AdminDashboard;
