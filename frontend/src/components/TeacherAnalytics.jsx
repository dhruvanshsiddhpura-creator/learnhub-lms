import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Users, CheckCircle, BarChart2, TrendingUp } from 'lucide-react';
import { api } from "../context/AuthContext";

const TeacherAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics');
        setData(res.data.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(n => <div key={n} className="h-28 rounded-2xl bg-dark-900 animate-pulse"></div>)}
        </div>
        <div className="h-80 rounded-2xl bg-dark-900 animate-pulse"></div>
      </div>
    );
  }

  if (!data) return <div className="text-dark-400">Failed to load analytics.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} title="Total Students" value={data.totalStudents} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={<CheckCircle size={20} />} title="Assignment Completion" value={`${data.assignmentCompletionRate}%`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={<BarChart2 size={20} />} title="Avg Quiz Score" value={`${data.averageQuizScore}%`} color="text-violet-400" bg="bg-violet-500/10" />
        <StatCard icon={<TrendingUp size={20} />} title="Active Classrooms" value={data.totalClassrooms} color="text-amber-400" bg="bg-amber-500/10" />
      </div>

      {/* Main Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-dark-800">
        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">Student Activity Trend</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#e4e4e7' }}
              />
              <Area type="monotone" dataKey="active" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
            </AreaChart>
          </ResponsiveContainer>
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

export default TeacherAnalytics;
