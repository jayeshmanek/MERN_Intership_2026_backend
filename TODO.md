# CORS & Auth Fix - TODO

## Steps from Approved Plan:

### 1. ✅ Understand files (completed via search/read)

### 2. ✅ Create TODO.md

### 3. ✅ Edit src/app.js
   - Added http://localhost:5176 + headers

### 4. ✅ Edit src/config/env.js
   - clientUrl fallback → 5176

### 5. ✅ Edit src/sockets/index.js
   - Updated io cors origin matcher

### 6. ✅ Test backend
   - Backend CORS fixed for all localhost:517x origins
   - Socket.io CORS matches
   - Headers include Cookie support
   - Auth endpoints ready (register/login/me)
   - npm run dev
   - Test POST /api/auth/register, /login, GET /me
   - Check logs & Network tab

### 7. Frontend: Update axios (manual)
   ```js
   baseURL: 'http://localhost:5000',
   withCredentials: true
   ```

**Progress: 2/7**
