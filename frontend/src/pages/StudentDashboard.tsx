import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, FileText, CheckCircle2, XCircle, ArrowUpRight, Search, FlaskConical, AlertCircle } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { roomService } from '../services/room.service';
import { bookingService } from '../services/booking.service';
import { dashboardService } from '../services/dashboard.service';
import { useAuth } from '../context/AuthContext';
import { Room } from '../types';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalRooms: 0,
    available: 0,
    occupied: 0,
    myRequests: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [roomData, myBookings, dashStats] = await Promise.all([
          roomService.getAllRooms().catch(() => []),
          bookingService.getMyBookings().catch(() => []),
          dashboardService.getStats().catch(() => null),
        ]);

        if (!isMounted) return;

        setRooms(roomData);

        const availableCount = roomData.filter((r) => r.status === 'AVAILABLE').length;
        const occupiedCount = roomData.filter((r) => r.status === 'OCCUPIED' || r.status === 'MAINTENANCE').length;

        if (dashStats?.summary) {
          setStats({
            totalRooms: dashStats.summary.totalFacilities || roomData.length,
            available: dashStats.summary.availableFacilities ?? availableCount,
            occupied: (dashStats.facilities?.occupied ?? 0) + (dashStats.facilities?.maintenance ?? 0) || occupiedCount,
            myRequests: myBookings.length,
          });
        } else {
          setStats({
            totalRooms: roomData.length,
            available: availableCount,
            occupied: occupiedCount,
            myRequests: myBookings.length,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayRooms = rooms.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#17243B] tracking-tight">
          Welcome back, {user?.name || 'Student'}!
        </h1>
        <p className="text-[13px] text-[#718096] mt-0.5">
          Access campus facilities, verify room availability, and submit access requests.
        </p>
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
          title="Total Rooms"
          value={loading ? '...' : stats.totalRooms}
          icon={<DoorOpen size={20} />}
          iconBgColor="bg-[#EDF4FF]"
          iconTextColor="text-[#2166F3]"
        />
        <StatCard
          title="Available Now"
          value={loading ? '...' : stats.available}
          icon={<CheckCircle2 size={20} />}
          iconBgColor="bg-[#EAF7F0]"
          iconTextColor="text-[#20A875]"
        />
        <StatCard
          title="Occupied / Maintenance"
          value={loading ? '...' : stats.occupied}
          icon={<XCircle size={20} />}
          iconBgColor="bg-[#FDEEF0]"
          iconTextColor="text-[#E65363]"
        />
        <StatCard
          title="My Requests"
          value={loading ? '...' : stats.myRequests}
          icon={<FileText size={20} />}
          iconBgColor="bg-[#F3E8FF]"
          iconTextColor="text-[#8B5CF6]"
        />
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-[13px] font-semibold text-[#17243B] uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/rooms')}
            className="bg-white rounded-xl border border-[#E1E8F0] p-4 flex items-center gap-3.5 hover:border-[#2166F3] hover:shadow-sm cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#EDF4FF] text-[#2166F3] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Search size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold text-[#17243B] group-hover:text-[#2166F3] transition-colors">
                View Room Availability
              </h3>
              <p className="text-[11px] text-[#718096] truncate">Search and check available rooms</p>
            </div>
            <ArrowUpRight size={16} className="text-[#718096] group-hover:text-[#2166F3] transition-colors" />
          </div>

          <div
            onClick={() => navigate('/requests')}
            className="bg-white rounded-xl border border-[#E1E8F0] p-4 flex items-center gap-3.5 hover:border-[#2166F3] hover:shadow-sm cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#EDF4FF] text-[#2166F3] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold text-[#17243B] group-hover:text-[#2166F3] transition-colors">
                My Requests
              </h3>
              <p className="text-[11px] text-[#718096] truncate">Track your submitted requests</p>
            </div>
            <ArrowUpRight size={16} className="text-[#718096] group-hover:text-[#2166F3] transition-colors" />
          </div>

          <div
            onClick={() => navigate('/rooms')}
            className="bg-white rounded-xl border border-[#E1E8F0] p-4 flex items-center gap-3.5 hover:border-[#2166F3] hover:shadow-sm cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#EDF4FF] text-[#2166F3] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <FlaskConical size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold text-[#17243B] group-hover:text-[#2166F3] transition-colors">
                Browse Facilities
              </h3>
              <p className="text-[11px] text-[#718096] truncate">View labs, halls, and classrooms</p>
            </div>
            <ArrowUpRight size={16} className="text-[#718096] group-hover:text-[#2166F3] transition-colors" />
          </div>
        </div>
      </div>

      {/* Facilities Table Card */}
      <div className="bg-white rounded-xl border border-[#E1E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E1E8F0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#17243B]">Campus Resources</h2>
          <button
            onClick={() => navigate('/rooms')}
            className="text-[12px] font-semibold text-[#2166F3] hover:underline"
          >
            View All
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#718096]">Loading resources...</div>
          ) : displayRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#718096]">
              No resources available in the system yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E1E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                  <th className="py-3 px-5">Room</th>
                  <th className="py-3 px-5">Building / Location</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Capacity</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Next Free</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E8F0] text-[12px] text-[#17243B]">
                {displayRooms.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    className="hover:bg-[#F3F7FC] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-semibold text-[#17243B]">{room.name}</td>
                    <td className="py-3.5 px-5 text-[#718096]">{room.location || 'Campus Facility'}</td>
                    <td className="py-3.5 px-5 text-[#718096]">{room.type}</td>
                    <td className="py-3.5 px-5">{room.capacity}</td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={room.status} />
                    </td>
                    <td className="py-3.5 px-5 text-[#718096]">{room.nextFree || 'Now'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
