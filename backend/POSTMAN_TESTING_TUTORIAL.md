# Smartly Backend Testing Tutorial (Postman)

Use this guide to exercise the Smartly API from Postman, from health checks through student, staff, and admin workflows.

## Safety first

Run the write requests only against an isolated development/test database. Registration, room creation, booking requests, status changes, password changes, and user deactivation persist in MySQL. Deleting a room archives it; deleting a user deactivates it. Those rows are not physically removed. Do not use production or shared data, and do not run `database/seeds.sql` just to prepare this tutorial; that script updates fixed IDs.

## 1. Start the API

Configure `backend/.env` with the database and JWT settings, then start the server from a terminal:

```powershell
Set-Location E:\Smartly\backend
npm run dev
```

The default API base URL is `http://localhost:5000/api`. Leave the server running while you use Postman.

## 2. Create a Postman environment

Create an environment named **Smartly Local** with these variables:

| Variable | Initial value |
|---|---|
| `baseUrl` | `http://localhost:5000/api` |
| `studentEmail` | leave blank; the registration request sets it |
| `studentPassword` | `Tutorial-Pass-2026` |
| `studentToken` | leave blank |
| `studentId` | leave blank |
| `staffEmail` | your existing active Admin or Faculty email in the test DB |
| `staffPassword` | your staff account password; keep local/private |
| `staffToken` | leave blank |
| `roomId` | leave blank; set from a room in the list response |
| `bookingId` | leave blank |
| `secondBookingId` | leave blank |
| `testRoomId` | leave blank |
| `testRoomName` | leave blank |
| `testStart` | leave blank |
| `testEnd` | leave blank |

Select this environment in Postman. Use `{{baseUrl}}` in request URLs. Set the Authorization tab on protected requests to **Bearer Token** and use `{{studentToken}}` or `{{staffToken}}` as appropriate. Set `Content-Type: application/json` for JSON request bodies.

Keep staff credentials in a local Postman environment, not a shared collection or exported file.

## 3. Health and public room requests

### Health

- Method: `GET`
- URL: `{{baseUrl}}/health`
- Auth: none

Expected: `200 OK` and JSON containing `status: "ok"`, `database: "ok"`, and a timestamp. When MySQL is unavailable, the expected response is `503` with `status: "degraded"`.

### List and filter rooms

- Method: `GET`
- URL: `{{baseUrl}}/rooms?status=AVAILABLE&minCapacity=10&limit=10`
- Auth: none

Expected: `200 OK` and `{ "rooms": [...] }`. The list can be empty if no active rooms match. Copy an ID from the response into the environment's `roomId` variable.

### Get one room

- Method: `GET`
- URL: `{{baseUrl}}/rooms/{{roomId}}`
- Auth: none

Expected: `200 OK` with `{ "room": { ... } }`; a missing ID returns `404`.

### Check availability

In the **Pre-request Script** tab, generate a future one-hour interval:

```javascript
const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
start.setHours(9, 0, 0, 0);
const end = new Date(start.getTime() + 60 * 60 * 1000);
const localDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
pm.environment.set('testStart', localDateTime(start));
pm.environment.set('testEnd', localDateTime(end));
```

Then send:

- Method: `GET`
- URL: `{{baseUrl}}/rooms/available?startTime={{testStart}}&endTime={{testEnd}}&minCapacity=10`
- Auth: none

Expected: `200 OK` and `{ "rooms": [...] }`. Pick an ID from the returned list for `roomId` before creating a booking.

## 4. Register a disposable student and log in

### Register

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Auth: none
- Body → raw → JSON:

```json
{
  "name": "Postman Tutorial Student",
  "email": "{{studentEmail}}",
  "password": "{{studentPassword}}"
}
```

Add this to the **Pre-request Script** tab to make the email unique on each run:

```javascript
pm.environment.set('studentEmail', `postman-${Date.now()}@example.test`);
```

Add this to the **Scripts → Post-response** tab:

```javascript
pm.test('Registration creates a student', () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.user.role).to.eql('STUDENT');
  pm.expect(body.user).not.to.have.property('password_hash');
  pm.environment.set('studentToken', body.token);
  pm.environment.set('studentId', body.user.id);
});
```

Expected: `201 Created` with `{ message, token, user }`. Public registration always creates a `STUDENT`; the client cannot choose a role.

### Login

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Auth: none
- Body → raw → JSON:

```json
{
  "email": "{{studentEmail}}",
  "password": "{{studentPassword}}"
}
```

Post-response script:

```javascript
pm.test('Login succeeds and returns a safe profile', () => {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.user).not.to.have.property('password_hash');
  pm.environment.set('studentToken', body.token);
  pm.environment.set('studentId', body.user.id);
});
```

### Current user

- Method: `GET`
- URL: `{{baseUrl}}/auth/me`
- Auth: Bearer Token → `{{studentToken}}`

Expected: `200 OK` and `{ "user": { ... } }` without a password hash.

## 5. Authentication and authorization checks

### Student must be denied admin access

- Method: `GET`
- URL: `{{baseUrl}}/auth/admin-only`
- Auth: Bearer Token → `{{studentToken}}`
- Expected: `403 Forbidden`

### Missing token must be denied

- Method: `GET`
- URL: `{{baseUrl}}/dashboard/stats`
- Auth: set to **No Auth**
- Expected: `401 Unauthorized`

### Admin or Faculty login

Use an existing active staff account in the isolated database:

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Auth: none
- Body:

```json
{
  "email": "{{staffEmail}}",
  "password": "{{staffPassword}}"
}
```

Post-response script:

```javascript
pm.test('Staff login succeeds', () => {
  pm.response.to.have.status(200);
  pm.environment.set('staffToken', pm.response.json().token);
});
```

For staff-only requests below, use Bearer Token → `{{staffToken}}`. `/users` and room CRUD require `ADMIN`; booking review accepts `ADMIN` or `FACULTY`.

## 6. Student booking workflow

### Create a booking request

Use a room ID returned by the availability request and the future `testStart`/`testEnd` values generated earlier.

- Method: `POST`
- URL: `{{baseUrl}}/bookings`
- Auth: Bearer Token → `{{studentToken}}`
- Body:

```json
{
  "roomId": {{roomId}},
  "startTime": "{{testStart}}",
  "endTime": "{{testEnd}}",
  "purpose": "Postman tutorial booking - disposable test data"
}
```

Post-response script:

```javascript
pm.test('Booking request is created as pending', () => {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.booking.status).to.eql('PENDING');
  pm.environment.set('bookingId', body.booking.id);
});
```

Expected: `201 Created` with `{ message, booking }`. The server takes the requester ID from the authenticated account.

### List the student's bookings

- Method: `GET`
- URL: `{{baseUrl}}/bookings/my`
- Auth: Bearer Token → `{{studentToken}}`
- Expected: `200 OK` and `{ "bookings": [...] }` scoped to the current user.

### List bookings with a filter

- Method: `GET`
- URL: `{{baseUrl}}/bookings?status=PENDING&limit=10&offset=0`
- Auth: Bearer Token → `{{studentToken}}` or `{{staffToken}}`
- Expected: `200 OK`. Students only see their own requests; staff can list campus requests.

### Get a booking by ID

- Method: `GET`
- URL: `{{baseUrl}}/bookings/{{bookingId}}`
- Auth: Bearer Token → `{{studentToken}}`
- Expected: `200 OK` for the owner. A student requesting another user's booking gets `403`.

## 7. Staff review, conflict, and cancellation

### Approve the pending request

- Method: `PUT`
- URL: `{{baseUrl}}/bookings/{{bookingId}}/status`
- Auth: Bearer Token → `{{staffToken}}`
- Body:

```json
{ "status": "APPROVED" }
```

Expected: `200 OK` and a booking with `status: "APPROVED"`. Only pending requests can be reviewed.

### Test an overlapping request

Send `POST {{baseUrl}}/bookings` with the same `roomId` and overlapping times as the approved request. For example:

```json
{
  "roomId": {{roomId}},
  "startTime": "{{testStart}}",
  "endTime": "{{testEnd}}",
  "purpose": "Expected 409 overlap test"
}
```

Expected: `409 Conflict`. A time interval that begins exactly at the approved booking's end (or ends exactly at its start) is adjacent and is allowed. An accepted adjacent request creates a pending row.

### Reject a different pending request

Duplicate the booking creation request and use this **Pre-request Script** for a non-overlapping interval after the first booking:

```javascript
const start = new Date(pm.environment.get('testEnd'));
start.setHours(start.getHours() + 1);
const end = new Date(start.getTime() + 60 * 60 * 1000);
const localDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
pm.environment.set('secondStart', localDateTime(start));
pm.environment.set('secondEnd', localDateTime(end));
```

Use `{{secondStart}}` and `{{secondEnd}}` for that request's `startTime` and `endTime`. Add this **Post-response** script to save the new request ID:

```javascript
pm.test('Second booking is pending', () => {
  pm.response.to.have.status(201);
  pm.environment.set('secondBookingId', pm.response.json().booking.id);
});
```

Then send:

- Method: `PUT`
- URL: `{{baseUrl}}/bookings/{{secondBookingId}}/status`
- Auth: Bearer Token → `{{staffToken}}`
- Body:

```json
{
  "status": "REJECTED",
  "rejection_reason": "Postman tutorial rejection test"
}
```

Expected: `200 OK` and `status: "REJECTED"`.

### Cancel a request

- Method: `POST`
- URL: `{{baseUrl}}/bookings/{{bookingId}}/cancel`
- Auth: Bearer Token → `{{studentToken}}` as owner, or `{{staffToken}}` as staff
- Expected: `200 OK` and `status: "CANCELLED"`. Cancelling rejected/already-cancelled requests returns `409`.

Run this only while the selected request is still `PENDING` or `APPROVED`. If you cancel `bookingId` as a student, create a fresh pending request before continuing with the Faculty review workflow.

## 8. Dashboard

- Method: `GET`
- URL: `{{baseUrl}}/dashboard/stats`
- Auth: Bearer Token → `{{studentToken}}` or `{{staffToken}}`
- Expected: `200 OK` and `{ "stats": { "summary", "users", "facilities", "bookings", "recentActivity" } }`.

Counts come from database records. Empty sections should show zero counts. The schema has no timetable or structured equipment table, so those filters/conflicts are not represented.

## 9. Admin user operations

These operations need an `ADMIN` token. Use the disposable student created in section 4; do not modify a real person's role for testing.

### List and retrieve users

- `GET {{baseUrl}}/users?limit=10&offset=0` — expected `200` and `{ "users": [...] }`.
- `GET {{baseUrl}}/users/{{studentId}}` — expected `200` and `{ "user": { ... } }`.

Use Bearer Token → `{{staffToken}}` only if the logged-in staff account is `ADMIN`.

### Update the disposable user

- Method: `PUT`
- URL: `{{baseUrl}}/users/{{studentId}}`
- Auth: Admin Bearer Token
- Body:

```json
{ "name": "Postman Tutorial Student Updated", "role": "FACULTY" }
```

Expected: `200 OK`. The user role is changed in the database; use only the disposable account.

### Deactivate the disposable user

- Method: `DELETE`
- URL: `{{baseUrl}}/users/{{studentId}}`
- Auth: Admin Bearer Token
- Expected: `200 OK`; this sets `is_active = 0`, it does not physically delete the row. The last active admin is protected.

## 10. Admin room CRUD

Room CRUD also requires an `ADMIN` token. Creating and archiving rooms writes persistent rows, so run only in an isolated database.

### Create a disposable room

- Method: `POST`
- URL: `{{baseUrl}}/rooms`
- Auth: Admin Bearer Token
- Body:

```json
{
  "name": "Postman Tutorial Room",
  "capacity": 12,
  "location": "Test Building",
  "description": "Disposable Postman test resource",
  "status": "AVAILABLE"
}
```

Save `room.id` from the response as `testRoomId`.

### Update it

- Method: `PUT`
- URL: `{{baseUrl}}/rooms/{{testRoomId}}`
- Auth: Admin Bearer Token
- Body:

```json
{ "capacity": 14, "description": "Updated disposable Postman test resource" }
```

Expected: `200 OK` and `{ "room": { ... } }`.

### Archive it

- Method: `DELETE`
- URL: `{{baseUrl}}/rooms/{{testRoomId}}`
- Auth: Admin Bearer Token
- Expected: `200 OK`. The room is soft-deleted (`is_active = 0`); it remains in the database.

## 11. Change password (optional)

Use only the disposable student account. This changes its password in the database. Run this before deactivating the account in section 9.

- Method: `PUT`
- URL: `{{baseUrl}}/auth/change-password`
- Auth: Bearer Token → `{{studentToken}}`
- Body:

```json
{
  "currentPassword": "{{studentPassword}}",
  "newPassword": "Tutorial-Pass-2026-Changed"
}
```

Expected: `200 OK`. Update `studentPassword` in the environment before logging in again.

## 12. Expected failure checks

| Request/check | Expected status |
|---|---:|
| Protected endpoint with no token, malformed/expired token, or inactive account | `401` |
| Student on Admin-only user/room route or review route | `403` |
| Invalid JSON, invalid ID/filter, invalid date range, or past booking | `400` |
| Unknown room, booking, or user ID | `404` |
| Duplicate email, approved-time overlap, invalid status transition, or invalid cancellation | `409` |
| MySQL unavailable at `/health` | `503` |
| Unknown API path | `404` |

Errors use JSON such as `{ "message": "..." }`; server stack traces and SQL credentials should not appear in responses.

## 13. How to enter booking start and end times in Postman

The booking API needs a complete future date and time for both fields. Use this format:

```text
YYYY-MM-DDTHH:mm:ss
```

For example, `2030-05-14T09:00:00` means May 14, 2030 at 9:00 AM in the server's local timezone. Use a date that is still in the future when you run the request. The end must be later than the start.

### Availability request: enter times in the Params tab

1. Open the `GET {{baseUrl}}/rooms/available` request.
2. Select **Params**.
3. Add `startTime` and `endTime` as separate query parameter keys.
4. Enter values such as `2030-05-14T09:00:00` and `2030-05-14T10:00:00` (choose a future date for your run).
5. Optionally add `minCapacity`, then click **Send**.

Alternatively, use the pre-request script in section 3. That script generates `testStart` and `testEnd` automatically, and the URL uses `{{testStart}}` and `{{testEnd}}`.

### Booking request: enter times in the JSON body

1. Open `POST {{baseUrl}}/bookings`.
2. Select **Body → raw → JSON**.
3. Enter `startTime` and `endTime` as quoted strings in the same format. For example:

```json
{
  "roomId": 1,
  "startTime": "2030-05-14T09:00:00",
  "endTime": "2030-05-14T10:00:00",
  "purpose": "Postman time-entry test"
}
```

Replace `roomId` with an active room ID and choose a future date. If you used the script, use `"{{testStart}}"` and `"{{testEnd}}"` instead. Do not enter only `09:00`, a date without a time, or an end time that is equal to or earlier than the start.

## 14. Complete workflows by user role

Follow each workflow in order. For the examples that create/update data, keep using an isolated test database.
If that database has no active rooms, run the Admin room-creation steps first, then copy `testRoomId` into `roomId` before starting the Student booking workflow.

### Student: register through booking and cancellation

1. Run **POST `/auth/register`** from section 4. The post-response script saves `studentToken` and `studentId`.
2. Run **GET `/auth/me`** with Bearer `{{studentToken}}` to confirm the session.
3. Run **GET `/rooms`** and choose a room ID, or run **GET `/rooms/available`** using the start/end steps from section 13. Save the selected ID as `roomId`.
4. Run **POST `/bookings`** with `roomId`, future `startTime`, future `endTime`, and `purpose` in **Body → raw → JSON**. Save the response ID as `bookingId` using the script in section 6.
5. Run **GET `/bookings/my`**, then **GET `/bookings/{{bookingId}}`**, both with Bearer `{{studentToken}}`.
6. To test owner cancellation without affecting the Faculty workflow, run **POST `/bookings/{{bookingId}}/cancel`** with the student token and confirm `200` / `CANCELLED`.
7. To test the student permission boundary, run **GET `/auth/admin-only`** and **GET `/users`** with the student token. Expected result: `403`.

Students can create and cancel their own requests. They cannot approve/reject requests or use room/user administration. Registration cannot create Faculty or Admin accounts.

### Faculty: sign in, review, and cancel requests

1. Sign in with an existing active Faculty account using **POST `/auth/login`** from section 5. Save its token as `staffToken`. Do not try to register a Faculty account; public registration always creates students.
2. If `bookingId` was cancelled in the Student workflow, create another booking as the student using **POST `/bookings`** and save its new ID as `bookingId`. It must be pending for review.
3. Run **GET `/bookings?status=PENDING&limit=10&offset=0`** with Bearer `{{staffToken}}`. Faculty can view requests campus-wide.
4. Copy a pending booking ID into `bookingId`, then run **GET `/bookings/{{bookingId}}`** to inspect it.
5. To approve it, run **PUT `/bookings/{{bookingId}}/status`** with:

   ```json
   { "status": "APPROVED" }
   ```

   The API checks availability while serializing approvals for the same resource. An overlapping approved reservation returns `409`.
6. For a different pending request, use the same route with:

   ```json
   { "status": "REJECTED", "rejection_reason": "Postman review test" }
   ```

7. Faculty may cancel a pending or approved request using **POST `/bookings/{{bookingId}}/cancel`** with the staff token. Do this after any tests that need the request to remain approved.
8. Run **GET `/dashboard/stats`** to check the authenticated dashboard response.

Faculty can review requests, but cannot access `/users` or create/update/archive rooms; those operations require Admin.

### Admin: sign in, create rooms, manage users, and finish a booking

1. Sign in with an existing active Admin account using **POST `/auth/login`** and save the token as `staffToken`. Verify **GET `/auth/admin-only`** returns `200` before continuing. `/users` and room CRUD require the database role to be `ADMIN`.
2. In Postman, choose **New → HTTP Request**. Set method **POST** and URL `{{baseUrl}}/rooms`.
3. Open **Authorization → Bearer Token** and enter `{{staffToken}}`.
4. Open **Headers** and ensure `Content-Type` is `application/json` (choosing Body → raw → JSON usually adds it automatically).
5. Open **Body → raw → JSON** and enter:

   ```json
   {
     "name": "Postman Tutorial Room",
     "capacity": 12,
     "location": "Test Building",
     "description": "Disposable Postman test resource",
     "status": "AVAILABLE"
   }
   ```

6. Click **Send**. Expected: `201 Created` with `{ "message": "...", "room": { ... } }`. Save `room.id` from the response as `testRoomId`. This creates a real database row.
7. Test **GET `/rooms/{{testRoomId}}`**; then **PUT `/rooms/{{testRoomId}}`** with **Body → raw → JSON**:

   ```json
   { "capacity": 14, "description": "Updated disposable Postman test resource" }
   ```

   Expected: `200 OK` and the updated room.
8. To finish the room CRUD test, run **DELETE `/rooms/{{testRoomId}}`**. It archives the room (`is_active = 0`); the row remains in MySQL.
9. Run **GET `/users?limit=10&offset=0`** with the Admin token. Use the disposable student from the Student workflow for **GET `/users/{{studentId}}`**, **PUT `/users/{{studentId}}`**, and **DELETE `/users/{{studentId}}`**. Never change or deactivate a real person's account. User `DELETE` deactivates; it does not erase the row.
10. An Admin can also follow the Faculty booking review steps, including approving/rejecting and cancelling. Finish by checking **GET `/dashboard/stats`**.

If you create a room to test bookings, copy `testRoomId` into `roomId` and choose an interval in the future using section 13. Use the test DB only; archiving a room and deactivating a user are persistent state changes.

## 15. Run the automated suite

The repository's automated backend tests use mocked repositories/transactions and do not need Postman or test writes to MySQL:

```powershell
Set-Location E:\Smartly\backend
npm test
```

## Route checklist

| Method | Path | Access |
|---|---|---|
| `GET` | `/api/health` | Public |
| `POST` | `/api/auth/register`, `/api/auth/login` | Public |
| `GET`, `PUT` | `/api/auth/me`, `/api/auth/change-password` | Authenticated |
| `GET` | `/api/auth/admin-only` | Admin |
| `GET` | `/api/rooms`, `/api/rooms/available`, `/api/rooms/:id` | Public |
| `POST`, `PUT`, `DELETE` | `/api/rooms`, `/api/rooms/:id` | Admin |
| `GET` | `/api/bookings`, `/api/bookings/my`, `/api/bookings/:id` | Authenticated; student results owner-scoped |
| `POST` | `/api/bookings`, `/api/bookings/:id/cancel` | Authenticated; cancel by owner or staff |
| `PUT` | `/api/bookings/:id/status` | Admin or Faculty |
| `GET`, `PUT`, `DELETE` | `/api/users`, `/api/users/:id` | Admin |
| `GET` | `/api/dashboard/stats` | Authenticated |
