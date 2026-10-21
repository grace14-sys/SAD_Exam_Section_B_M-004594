# Scholarship Monitoring System — Starter Frontend

## Included
- `index.html` — sign-in and role-aware starter interface
- `style.css` — responsive styling
- `app.js` — Supabase sign-in, profile role lookup, and staff-only blank-return-reason RPC test

## Setup
1. Extract the ZIP and open the `ScholarshipMonitoringSystem` folder in VS Code.
2. Open `app.js`.
3. Replace:
   - `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
   - `PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE`
   with your project's Project URL and publishable key (or legacy anon public key).
4. Never paste a `service_role` key or secret key into frontend code.
5. Run `index.html` using the VS Code Live Server extension, or serve the folder from a local web server.
6. Sign in using the staff account you created in Supabase Authentication.
7. In Supabase SQL Editor, find an existing pending submission UUID, then paste it into the staff test panel and click **Test return without reason**.

## Important notes
- This is a starter/test frontend, not the complete exam system.
- There is deliberately no public signup form in this starter.
- Staff role assignment should be done only by a trusted project owner through a secure administrative process.
- The RPC test expects the backend `verify_submission` function to reject a blank return reason.
- The frontend hides staff controls for scholars, but this is not the security boundary. RLS and backend function authorization must enforce permissions.
- Do not use a service-role/secret key in the browser.
