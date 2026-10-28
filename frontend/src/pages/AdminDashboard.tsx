import React, { useState, useEffect } from 'react';
import { DoorOpen, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { dashboardService } from '../services/dashboard.service';
import { bookingService } from '../services/booking.service';
import { roomService } from '../services/room.service';
import { Booking } from '../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBuildings: 0,
    activeRequests: 0,
    occupancyRate: '0%',
    available: 0,
    occupied: 0,
    maintenance: 0,
  });

  const [recentRequests, setRecentRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashData, allBookings, allRooms] = await Promise.all([
          dashboardService.getStats().catch(() => null),
          bookingService.getAllBookings().catch(() => []),
          roomService.getAllRooms().catch(() => []),
        ]);

        if (!isMounted) return;

        if (dashData) {
          const facilities = dashData.facilities || {};
          const summary = dashData.summary || {};
          const bookings = dashData.bookings || {};

          const total = summary.totalFacilities || allRooms.length;
          const occ = facilities.occupied || allRooms.filter((r) => r.status === 'OCCUPIED').length;
          const avail = facilities.available || allRooms.filter((r) => r.status === 'AVAILABLE').length;
          const maint = facilities.maintenance || allRooms.filter((r) => r.status === 'MAINTENANCE').length;

          const rate = total > 0 ? `${Math.round((occ / total) * 100)}%` : '0%';

          setStats({
            totalRooms: total,
            totalBuildings: new Set(allRooms.map((r) => r.location).filter(Boolean)).size || 1,
            activeRequests: bookings.pending ?? allBookings.filter((b) => b.status === 'PENDING').length,
            occupancyRate: rate,
            available: avail,
            occupied: occ,
            maintenance: maint,
          });

          if (dashData.recentActivity && dashData.recentActivity.length > 0) {
            setRecentRequests(
              dashData.recentActivity.map((r: any) => ({
                id: r.id,
                displayId: `REQ-2026-${String(r.id).padStart(3, '0')}`,
                user_id: r.user_id,
                user_name: r.user_name || 'Student',
                resource_id: r.resource_id,
                resource_name: r.resource_name || 'Facility',
                start_time: r.start_time,
                end_time: r.end_time,
                purpose: r.purpose,
                status: r.status,
              }))
            );
          } else {
            setRecentRequests(allBookings.slice(0, 5));
          }
        } else {
          setRecentRequests(allBookings.slice(0, 5));
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load administrator metrics');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const chartData = [
    { name: 'Available', value: stats.available, color: '#20A875' },
    { name: 'Occupied', value: stats.occupied, color: '#E65363' },
    { name: 'Maintenance', value: stats.maintenance, color: '#F4AD32' },
  ].filter((item) => item.value > 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (startStr?: string, endStr?: string) => {
    if (!startStr) return '—';
    try {
      const s = new Date(startStr);
      const e = new Date(endStr || startStr);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sTime = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const eTime = e.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${sTime} - ${eTime}`;
      }
    } catch {}
    return '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#17243B] tracking-tight">System Administration</h1>
        <p className="text-[13px] text-[#718096] mt-0.5">High-level campus resource metrics, utilization, and activity.</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#FEF7EC] border border-[#FCE1B6] text-[#E09214] text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Resources"
          value={loading ? '...' : stats.totalRooms}
          icon={<DoorOpen size={20} />}
          iconBgColor="bg-[#EDF4FF]"
          iconTextColor="text-[#2166F3]"
        />
        <StatCard
          title="Pending Requests"
          value={loading ? '...' : stats.activeRequests}
          icon={<Clock size={20} />}
          iconBgColor="bg-[#FEF7EC]"
          iconTextColor="text-[#E09214]"
        />
        <StatCard
          title="Available Now"
          value={loading ? '...' : stats.available}
          icon={<DoorOpen size={20} />}
          iconBgColor="bg-[#EAF7F0]"
          iconTextColor="text-[#20A875]"
        />
        <StatCard
          title="Occupancy Rate"
          value={loading ? '...' : stats.occupancyRate}
          icon={<Clock size={20} />}
          iconBgColor="bg-[#F3E8FF]"
          iconTextColor="text-[#8B5CF6]"
        />
      </div>

      {/* Main Grid: Chart & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Resource Allocation Pie Chart */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E1E8F0] p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-[#17243B] mb-1">Resource Status Breakdown</h2>
          <p className="text-xs text-[#718096] mb-4">Real-time availability distribution</p>

          <div className="h-60 w-full flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#718096]">No resource data available</p>
            )}
          </div>

          <div className="flex items-center justify-around border-t border-[#E1E8F0] pt-4 mt-2">
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#20A875] mr-1.5" />
              <span className="text-xs text-[#718096]">Available ({stats.available})</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E65363] mr-1.5" />
              <span className="text-xs text-[#718096]">Occupied ({stats.occupied})</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F4AD32] mr-1.5" />
              <span className="text-xs text-[#718096]">Maintenance ({stats.maintenance})</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E1E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E1E8F0] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#17243B]">Recent Access Requests</h2>
            <span className="text-xs text-[#718096]">Latest Submissions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E1E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Request ID</th>
                  <th className="py-2.5 px-4">Requester</th>
                  <th className="py-2.5 px-4">Resource</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E8F0] text-xs">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F3F7FC]">
                    <td className="py-3 px-4 font-semibold text-[#17243B]">
                      {req.displayId || `REQ-${req.id}`}
                    </td>
                    <td className="py-3 px-4 text-[#17243B] font-medium">{req.user_name || 'Student'}</td>
                    <td className="py-3 px-4 text-[#2166F3] font-medium">{req.resource_name || 'Room'}</td>
                    <td className="py-3 px-4 text-[#718096]">
                      {formatDate(req.start_time)} ({formatTime(req.start_time, req.end_time)})
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-[#718096]">
                      No recent activity recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
