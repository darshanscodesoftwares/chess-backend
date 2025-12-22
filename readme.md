# Chess Results Automation – Context & Fix Scope

## Project Overview
This project automates fetching chess tournament data from chess-results.com using scraping,
displays round pairings, allows result entry via dropdowns, and generates Swiss-Manager–compatible XML.

Frontend and Backend are in **separate folders**:
- Frontend runs on Vite (localhost:5173 / 5174)
- Backend runs on Express (localhost:5000)

## Current Working State
✅ Scraping DB Key and SID Key works  
✅ Pairings and dropdowns render correctly  
✅ Result normalization works  
✅ XML generation works  
✅ MongoDB integration is in progress  
✅ Admin login UI exists in frontend  
❌ Admin login API call is failing due to CORS / connection issue  

## Current Blocking Issue (ONLY FIX THIS)
Frontend fails to call backend admin login API.

### Errors Seen
- CORS error:
  Access-Control-Allow-Origin mismatch
- net::ERR_FAILED
- net::ERR_CONNECTION_REFUSED

### API Endpoint Involved
POST /api/admin/login

Frontend Origin:
- http://localhost:5173 or http://localhost:5174

Backend:
- http://localhost:5000

## Fix Requirements (VERY IMPORTANT)
- Fix ONLY the admin login API connectivity issue
- Correct CORS configuration so frontend can call backend
- Ensure backend server is reachable
- Do NOT refactor existing logic
- Do NOT remove dropdowns or scraping logic
- Do NOT redesign UI
- Change code ONLY where required to fix this issue

## Expected Result
- Admin login POST request succeeds
- No CORS errors
- No connection refused errors
- Frontend can authenticate admin successfully

## Notes
- MongoDB Atlas is being used (not localhost MongoDB)
- Admin login is simple (hardcoded or minimal auth for now)
- More features will be added later, but NOT in this fix
