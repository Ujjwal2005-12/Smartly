const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../app');
const { generateToken } = require('../utils/token');
const dashboardRepository = require('../repositories/dashboardRepository');
const userRepository = require('../repositories/userRepository');

let server;
let baseUrl;

const studentToken = generateToken({ id: 3, role: 'STUDENT' });
const originalGetStats = dashboardRepository.getStats;
const originalFindUserById = userRepository.findUserById;

describe('Dashboard Analytics Test Suite', () => {
  before(async () => {
    dashboardRepository.getStats = async () => ({
      summary: { totalUsers: 3, activeUsers: 3, totalFacilities: 2, availableFacilities: 2, totalBookings: 1, pendingBookings: 1 },
      users: { students: 1, faculty: 1, admins: 1 },
      facilities: { rooms: 2, labs: 0, halls: 0, available: 2, maintenance: 0, occupied: 0 },
      bookings: { total: 1, pending: 1, approved: 0, rejected: 0, cancelled: 0 },
      recentActivity: []
    });
    userRepository.findUserById = async (id) => ({ id: Number(id), role: 'STUDENT', is_active: 1 });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    dashboardRepository.getStats = originalGetStats;
    userRepository.findUserById = originalFindUserById;
  });

  test('1. GET /api/dashboard/stats rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`);
    assert.equal(res.status, 401);
  });

  test('2. GET /api/dashboard/stats returns aggregated metrics across campus entities', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.stats);

    // Verify summary structure
    const { summary, users, facilities, bookings, recentActivity } = data.stats;
    assert.ok(typeof summary.totalUsers === 'number');
    assert.ok(typeof summary.totalFacilities === 'number');
    assert.ok(typeof summary.totalBookings === 'number');

    // Verify user counts
    assert.ok(typeof users.students === 'number');
    assert.ok(typeof users.faculty === 'number');
    assert.ok(typeof users.admins === 'number');

    // Verify facility counts
    assert.ok(typeof facilities.rooms === 'number');
    assert.ok(typeof facilities.available === 'number');

    // Verify booking counts
    assert.ok(typeof bookings.total === 'number');
    assert.ok(typeof bookings.pending === 'number');

    // Verify recent activity feed
    assert.ok(Array.isArray(recentActivity));
  });
});
