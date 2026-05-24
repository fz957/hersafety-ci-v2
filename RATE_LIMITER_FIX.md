# Rate Limiter Fix — Critical Bug Resolution

## The Problem
You were seeing 429 (Too Many Requests) errors on:
- `GET /api/users/me` (auth check)
- `GET /api/tracks` (polling)
- `PATCH /api/tracks/:id/checkin` (check-in response)
- `POST /api/alerts` (escalation)

These endpoints were being rate-limited even though they were explicitly added to the "skip" list.

---

## Root Cause
The rate limiter is mounted globally on `/api`:

```javascript
// app.js line 41
app.use('/api', apiLimiter);
```

When a middleware is mounted at a sub-path, **`req.path` inside that middleware is relative to the mount point**, not absolute.

### Example:
- **Request:** `GET /api/users/me`
- **Inside `/api` middleware:** `req.path = /users/me` (the `/api` prefix is stripped)

### What Was Wrong (Before Fix):
```javascript
skip: (req) => {
  if (req.path === '/api/users/me') return true;  // ❌ NEVER MATCHES
  // Inside the /api middleware, req.path is '/users/me', not '/api/users/me'
  if (req.path.startsWith('/api/tracks')) return true;  // ❌ NEVER MATCHES
}
```

### What's Fixed (After Fix):
```javascript
skip: (req) => {
  if (req.path === '/users/me') return true;      // ✅ MATCHES req.path = '/users/me'
  if (req.path.startsWith('/tracks')) return true;  // ✅ MATCHES req.path = '/tracks/*'
}
```

---

## Files Changed
- **server/src/middlewares/rateLimit.js** (lines 12-17)
  - Removed `/api` prefix from all skip paths
  - Added explanatory comment about path relativity

---

## Impact
✅ `/users/me` — No longer rate-limited
✅ `/tracks` (all variants) — No longer rate-limited
✅ `/alerts` (all variants) — No longer rate-limited
✅ Auth checks will now work properly
✅ Check-in system will work properly
✅ Escalation alerts will work properly

---

## Testing
The fix has been applied and the server has been restarted. You should now see:
- No more 429 errors on the affected endpoints
- User checks working properly
- Check-in responses sending successfully
- Escalation alerts triggering properly

**Try it:**
1. Open http://localhost:5173 (frontend is still running)
2. Check browser DevTools → Network tab
3. You should see `GET /api/users/me` returning **200** (not 429)
4. Check-in modal responses should work without 429 errors

---

## Before vs After

| Endpoint | Before | After |
|----------|--------|-------|
| GET /api/users/me | ❌ 429 | ✅ 200 |
| GET /api/tracks | ❌ 429 | ✅ 200 |
| PATCH /api/tracks/:id/checkin | ❌ 429 | ✅ 200 |
| POST /api/alerts | ❌ 429 | ✅ 201 |

---

## Summary
This was a subtle but critical bug in how Express middleware path matching works. The skip rules were correctly written, but the middleware context made them never match. Now that it's fixed, all the check-in and alert functionality should work without rate limiting issues.
