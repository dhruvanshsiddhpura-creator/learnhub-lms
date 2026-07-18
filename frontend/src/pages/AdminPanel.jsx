import React, { useState, useEffect } from 'react';
import { Users, Layers, ShieldAlert, BookOpen, Trash2, Shield, Activity, Megaphone, Send } from 'lucide-react';
import { api } from "../context/AuthContext";
import { useToast } from '../components/Toast';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const { addToast } = useToast();

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, annRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/announcements')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setAnnouncements(annRes.data.data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      addToast('Role updated successfully', 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update role', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      addToast('User deleted', 'success');
      fetchAdminData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementTitle || !announcementContent) return;
    try {
      await api.post('/admin/announcements', { title: announcementTitle, content: announcementContent });
      addToast('Announcement published', 'success');
      setAnnouncementTitle('');
      setAnnouncementContent('');
      fetchAdminData();
    } catch (err) {
      addToast('Failed to publish announcement', 'error');
    }
  };

  if (loading) return <div className="text-dark-400 p-8 text-center animate-pulse">Loading Admin Workspace...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} title="Total Users" value={stats.users.total} color="text-primary-400" bg="bg-primary-500/10" />
        <StatCard icon={<Layers size={20} />} title="Active Classrooms" value={stats.classrooms} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={<BookOpen size={20} />} title="Course Modules" value={stats.courses} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={<Activity size={20} />} title="Total Submissions" value={stats.submissions} color="text-violet-400" bg="bg-violet-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-dark-800">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Shield size={16} className="text-primary-400" />
            User Access Management
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 px-4 font-semibold">User</th>
                  <th className="pb-3 px-4 font-semibold">Role</th>
                  <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-dark-900/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full border border-dark-700" />
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{u.name}</p>
                          <p className="text-[10px] text-dark-400 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-dark-900 border border-dark-700 text-xs text-white rounded-lg px-2 py-1 outline-none focus:border-primary-500"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="TEACHER">Teacher</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Announcements */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-dark-800">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Megaphone size={16} className="text-amber-400" />
              Broadcast Message
            </h3>
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <input 
                type="text" 
                placeholder="Announcement Title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                required
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500 transition-colors"
              />
              <textarea 
                placeholder="Broadcast content..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                required
                rows={4}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500 transition-colors resize-none"
              ></textarea>
              <button 
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-brand text-white font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary-500/20 active:scale-[0.98] transition-all"
              >
                <Send size={14} /> Send Broadcast
              </button>
            </form>
          </div>

          {/* Announcement Feed */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.map(a => (
              <div key={a.id} className="p-4 rounded-xl bg-dark-900/60 border border-dark-800">
                <h4 className="text-sm font-bold text-white">{a.title}</h4>
                <p className="text-xs text-dark-300 mt-1">{a.content}</p>
                <div className="text-[10px] text-dark-500 font-semibold mt-3 flex items-center justify-between">
                  <span>By {a.author.name}</span>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden border border-dark-800">
    <div className={`p-3.5 rounded-xl ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">{title}</span>
      <span className="text-2xl font-extrabold text-white mt-1 block">{value}</span>
    </div>
  </div>
);

export default AdminPanel;
