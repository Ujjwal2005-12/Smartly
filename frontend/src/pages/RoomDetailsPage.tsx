import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Users,
  Monitor,
  Building,
  Hash,
  Layers,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { roomService } from '../services/room.service';
import { bookingService } from '../services/booking.service';
import { Room } from '../types';

export const RoomDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [room, setRoom] = useState<Room | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('Project discussion');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRoom = async () => {
      if (!id) return;
      setFetchLoading(true);
      setFetchError(null);
      try {
        const r = await roomService.getRoomById(id);
        if (isMounted) setRoom(r);
      } catch (err: any) {
        if (isMounted) setFetchError(err.message || 'Room not found');
      } finally {
        if (isMounted) setFetchLoading(false);
      }
    };
    fetchRoom();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    setSuccessMsg(null);
    setErrorMsg(null);
    setSubmitting(true);

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;

    try {
      const res = await bookingService.createBooking({
        roomId: room.id,
        startTime: startDateTime,
        endTime: endDateTime,
        purpose: purpose.trim(),
      });

      setSuccessMsg(res?.message || 'Booking request submitted successfully! Pending approval.');
      setTimeout(() => {
        navigate('/requests');
      }, 1500);
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMsg('Booking conflict: An approved reservation already exists for this room during this time window.');
      } else {
        setErrorMsg(err.message || 'Failed to submit booking request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="p-12 text-center text-xs text-[#718096]">
        Loading facility details...
      </div>
    );
  }

  if (fetchError || !room) {
    return (
      <div className="bg-white rounded-xl border border-[#E1E8F0] p-8 text-center max-w-lg mx-auto mt-6">
        <AlertCircle size={36} className="mx-auto text-[#E65363] mb-3" />
        <h2 className="text-base font-bold text-[#17243B]">Facility Not Found</h2>
        <p className="text-xs text-[#718096] mt-1 mb-4">{fetchError || 'The requested resource does not exist.'}</p>
        <button
          onClick={() => navigate('/rooms')}
          className="px-4 py-2 bg-[#2166F3] text-white text-xs font-semibold rounded-lg"
        >
          Back to Room Availability
        </button>
      </div>
    );
  }

  // Schedule items for room
  const scheduleItems = room.schedule || [
    { time: '09:00 - 10:00', title: 'Data Structures (Class)', status: 'Occupied' as const },
    { time: '10:00 - 11:00', title: 'Systems Programming', status: 'Occupied' as const },
    { time: '11:00 - 12:00', title: 'Available Window', status: 'Available' as const },
    { time: '12:00 - 01:00', title: 'DBMS Lab', status: 'Occupied' as const },
    { time: '01:00 - 02:00', title: 'Available Window', status: 'Available' as const },
    { time: '02:00 - 03:00', title: 'AI Lab Session', status: 'Reserved' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Heading */}
      <div>
        <button
          onClick={() => navigate('/rooms')}
          className="inline-flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#2166F3] mb-2 font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Room Availability</span>
        </button>
        <h1 className="text-2xl font-bold text-[#17243B] tracking-tight">{room.name}</h1>
        <p className="text-[13px] text-[#718096] mt-0.5">
          {room.building || room.location || 'Campus Facility'} • {room.type || 'ROOM'}
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-[#E1E8F0] overflow-hidden shadow-xs">
            <div className="relative h-60 w-full overflow-hidden bg-slate-100">
              <img
                src={room.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80'}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <StatusBadge status={room.status} />
              </div>
            </div>

            {/* Quick Metadata Grid (6 Cards) */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096]">Status</p>
                <div className="mt-1">
                  <StatusBadge status={room.status} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096] flex items-center gap-1">
                  <Users size={12} />
                  <span>Capacity</span>
                </p>
                <p className="text-[12px] font-semibold text-[#17243B] mt-0.5">{room.capacity} Students</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096] flex items-center gap-1">
                  <Monitor size={12} />
                  <span>Equipment</span>
                </p>
                <p className="text-[11px] font-semibold text-[#17243B] mt-0.5 truncate">
                  {room.equipment ? room.equipment.join(', ') : 'Computers, Projector, Wi-Fi'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096] flex items-center gap-1">
                  <Building size={12} />
                  <span>Location</span>
                </p>
                <p className="text-[12px] font-semibold text-[#17243B] mt-0.5 truncate">{room.location || room.building || 'Campus'}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096] flex items-center gap-1">
                  <Layers size={12} />
                  <span>Type</span>
                </p>
                <p className="text-[12px] font-semibold text-[#17243B] mt-0.5 truncate">{room.type}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E1E8F0]">
                <p className="text-[10px] uppercase font-semibold text-[#718096] flex items-center gap-1">
                  <Hash size={12} />
                  <span>Resource Name</span>
                </p>
                <p className="text-[12px] font-semibold text-[#17243B] mt-0.5">{room.name}</p>
              </div>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="bg-white rounded-xl border border-[#E1E8F0] shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E8F0] mb-3">
              <h2 className="text-sm font-semibold text-[#17243B]">Schedule Timeline</h2>
              <span className="text-xs text-[#718096]">Date: {date}</span>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {scheduleItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-[#17243B] w-28">{item.time}</span>
                    <span className="text-[#718096]">{item.title}</span>
                  </div>
                  <div>
                    <StatusBadge status={item.status === 'Available' ? 'AVAILABLE' : item.status === 'Reserved' ? 'RESERVED' : 'OCCUPIED'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Request Form */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E1E8F0] shadow-xs p-6">
          <h2 className="text-base font-bold text-[#17243B] mb-4">Request this Facility</h2>

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-[#EAF7F0] border border-[#B7E7D1] text-[#20A875] text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243B] mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243B] mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#17243B] mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#17243B] mb-1.5">
                Purpose / Reason
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={4}
                required
                placeholder="e.g. Project discussion, Research lab session"
                className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2166F3] hover:bg-[#1a54cc] text-white py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wide transition-colors shadow-sm disabled:opacity-70 mt-2"
            >
              {submitting ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </form>

          <div className="mt-5 p-3 rounded-lg bg-[#F3F7FC] border border-[#E1E8F0] text-[11px] text-[#718096]">
            <p className="font-semibold text-[#17243B] mb-0.5">Approval Policy Notice</p>
            <p>
              Resource allocations are automatically routed to relevant department faculty for confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
