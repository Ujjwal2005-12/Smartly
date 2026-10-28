import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  Search,
  Users,
  Monitor,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { roomService } from '../services/room.service';
import { bookingService } from '../services/booking.service';
import { Modal } from '../components/common/Modal';
import { Room } from '../types';

export const RoomAvailabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [building, setBuilding] = useState('All Buildings');
  const [roomType, setRoomType] = useState('All Types');
  const [capacity, setCapacity] = useState('Any');
  const [equipment, setEquipment] = useState('All');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Booking Modal State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookPurpose, setBookPurpose] = useState('Project discussion');
  const [bookDate, setBookDate] = useState(todayStr);
  const [bookStart, setBookStart] = useState('11:00');
  const [bookEnd, setBookEnd] = useState('12:00');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomService.getAllRooms();
      setRooms(data);
      setFilteredRooms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
      setRooms([]);
      setFilteredRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleFilter = () => {
    let list = [...rooms];

    if (building !== 'All Buildings') {
      list = list.filter((r) => r.building === building || r.location?.includes(building));
    }
    if (roomType !== 'All Types') {
      list = list.filter((r) => r.type?.toLowerCase() === roomType.toLowerCase());
    }
    if (capacity !== 'Any') {
      const minCap = parseInt(capacity, 10);
      list = list.filter((r) => r.capacity >= minCap);
    }
    if (equipment !== 'All') {
      list = list.filter((r) =>
        r.equipment?.some((eq) => eq.toLowerCase().includes(equipment.toLowerCase()))
      );
    }

    setFilteredRooms(list);
  };

  const handleClear = () => {
    setBuilding('All Buildings');
    setRoomType('All Types');
    setCapacity('Any');
    setEquipment('All');
    setDate(todayStr);
    setStartTime('');
    setEndTime('');
    setFilteredRooms(rooms);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setBookingError(null);
    setBookingLoading(true);

    try {
      await bookingService.createBooking({
        roomId: selectedRoom.id,
        startTime: `${bookDate}T${bookStart}:00`,
        endTime: `${bookDate}T${bookEnd}:00`,
        purpose: bookPurpose.trim(),
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedRoom(null);
        navigate('/requests');
      }, 1200);
    } catch (err: any) {
      setBookingError(
        err.status === 409
          ? 'Booking conflict: An approved reservation already exists for this room during this time window.'
          : err.message || 'Failed to submit booking request.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header with View Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17243B] tracking-tight">Room Availability</h1>
          <p className="text-[13px] text-[#718096] mt-0.5">Find and request classrooms or laboratories.</p>
        </div>

        {/* View Selectors */}
        <div className="flex items-center bg-white p-1 rounded-lg border border-[#E1E8F0] shadow-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-[#2166F3] text-white shadow-xs'
                : 'text-[#718096] hover:text-[#17243B]'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Grid View</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-[#2166F3] text-white shadow-xs'
                : 'text-[#718096] hover:text-[#17243B]'
            }`}
          >
            <ListIcon size={14} />
            <span>List View</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-[#2166F3] text-white shadow-xs'
                : 'text-[#718096] hover:text-[#17243B]'
            }`}
          >
            <CalendarIcon size={14} />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E1E8F0] p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          {/* Building */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Building</label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            >
              <option>All Buildings</option>
              <option>Academic Block</option>
              <option>Science Block</option>
              <option>Computer Block</option>
              <option>Building A</option>
              <option>Building B</option>
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            >
              <option>All Types</option>
              <option value="ROOM">Room / Classroom</option>
              <option value="LAB">Laboratory</option>
              <option value="HALL">Hall / Auditorium</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Capacity</label>
            <select
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            >
              <option>Any</option>
              <option value="20">20+ Students</option>
              <option value="30">30+ Students</option>
              <option value="40">40+ Students</option>
              <option value="50">50+ Students</option>
            </select>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Equipment</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            >
              <option>All</option>
              <option>Computers</option>
              <option>Projector</option>
              <option>Wi-Fi</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-[11px] font-semibold text-[#718096] mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E1E8F0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#17243B] focus:outline-none focus:border-[#2166F3]"
            />
          </div>

          {/* Buttons: Search & Clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFilter}
              className="flex-1 bg-[#2166F3] hover:bg-[#1a54cc] text-white py-1.5 px-3 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Search size={14} />
              <span>Search</span>
            </button>
            <button
              onClick={handleClear}
              className="bg-white hover:bg-[#F3F7FC] border border-[#E1E8F0] text-[#718096] hover:text-[#17243B] py-1.5 px-3 rounded-lg text-[12px] font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-[#718096]">Loading room availability...</div>
      )}

      {!loading && filteredRooms.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E1E8F0] p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-[#718096] mb-2" />
          <h3 className="text-sm font-semibold text-[#17243B]">No Rooms Found</h3>
          <p className="text-xs text-[#718096] mt-1 mb-4">No campus facilities match the current criteria.</p>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg bg-[#2166F3] text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Room Display Grid */}
      {!loading && filteredRooms.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-[#E1E8F0] p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[15px] font-bold text-[#17243B] tracking-tight">{room.name}</h3>
                  <StatusBadge status={room.status} />
                </div>
                <p className="text-[12px] text-[#718096] mb-3">{room.building || room.location || 'Campus Facility'}</p>

                <div className="space-y-1.5 text-[12px] text-[#718096] pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2166F3]" />
                    <span>{room.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-[#718096]" />
                    <span>{room.capacity} capacity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor size={13} className="text-[#718096]" />
                    <span className="truncate">
                      {room.equipment ? room.equipment.join(', ') : 'Projector, Wi-Fi'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#17243B] pt-0.5">
                    <Clock size={13} className="text-[#20A875]" />
                    <span className="font-medium text-[11px]">
                      Availability: <span className="font-semibold">{room.status === 'AVAILABLE' ? 'Open for booking' : room.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-3.5">
                <button
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-[#E1E8F0] text-[12px] font-medium text-[#17243B] hover:bg-[#F3F7FC] transition-colors text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    setSelectedRoom(room);
                    setBookingSuccess(false);
                    setBookingError(null);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#2166F3] hover:bg-[#1a54cc] text-white text-[12px] font-semibold transition-colors text-center shadow-xs"
                >
                  Book Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && filteredRooms.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-[#E1E8F0] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E1E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E8F0] text-[12px] text-[#17243B]">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-[#F3F7FC]">
                  <td className="py-3.5 px-4 font-semibold">{room.name}</td>
                  <td className="py-3.5 px-4 text-[#718096]">{room.location || room.building}</td>
                  <td className="py-3.5 px-4 text-[#718096]">{room.type}</td>
                  <td className="py-3.5 px-4">{room.capacity} students</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={room.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => navigate(`/rooms/${room.id}`)}
                      className="text-[#2166F3] font-medium hover:underline text-[12px]"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setBookingSuccess(false);
                        setBookingError(null);
                      }}
                      className="px-2.5 py-1 rounded bg-[#2166F3] text-white font-medium text-[11px]"
                    >
                      Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl border border-[#E1E8F0] p-8 text-center shadow-xs">
          <CalendarIcon size={36} className="mx-auto text-[#2166F3] mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-[#17243B]">Campus Room Schedule Calendar</h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto mt-1 mb-4">
            Viewing real-time availability slots for {date}. Switch to Grid View to request instant room allocation.
          </p>
          <button
            onClick={() => setViewMode('grid')}
            className="px-4 py-2 bg-[#2166F3] text-white text-xs font-semibold rounded-lg"
          >
            Back to Grid View
          </button>
        </div>
      )}

      {/* Quick Booking Modal */}
      <Modal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={`Request ${selectedRoom?.name}`}
      >
        {bookingSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 size={44} className="mx-auto text-[#20A875] mb-2 animate-bounce" />
            <h4 className="text-base font-bold text-[#17243B]">Request Submitted Successfully!</h4>
            <p className="text-xs text-[#718096] mt-1">
              Your request for {selectedRoom?.name} has been routed for faculty approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleBookSubmit} className="space-y-4">
            {bookingError && (
              <div className="p-3 rounded-lg bg-[#FDEEF0] border border-[#F9C9CF] text-[#E65363] text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#F3F7FC] border border-[#E1E8F0] flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-[#17243B]">{selectedRoom?.name}</p>
                <p className="text-[#718096]">{selectedRoom?.building} • Capacity: {selectedRoom?.capacity}</p>
              </div>
              <StatusBadge status={selectedRoom?.status || 'AVAILABLE'} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Date</label>
              <input
                type="date"
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                required
                className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Start Time</label>
                <input
                  type="time"
                  value={bookStart}
                  onChange={(e) => setBookStart(e.target.value)}
                  required
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243B] mb-1">End Time</label>
                <input
                  type="time"
                  value={bookEnd}
                  onChange={(e) => setBookEnd(e.target.value)}
                  required
                  className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#17243B] mb-1">Purpose / Reason</label>
              <textarea
                value={bookPurpose}
                onChange={(e) => setBookPurpose(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Project discussion, Extra lecture, Study session"
                className="w-full bg-white border border-[#E1E8F0] rounded-lg px-3 py-2 text-xs text-[#17243B] focus:outline-none focus:border-[#2166F3]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-[#E1E8F0] text-xs font-medium text-[#718096] hover:bg-[#F3F7FC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookingLoading}
                className="flex-1 py-2 px-3 rounded-lg bg-[#2166F3] hover:bg-[#1a54cc] text-white text-xs font-semibold shadow-xs disabled:opacity-60"
              >
                {bookingLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
