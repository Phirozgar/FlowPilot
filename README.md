▶️ Final exact startup flow
1) Open terminal A for backend
cd "C:\Users\Admin\OneDrive\Desktop\Projects\FlowPilot-WEB"
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt    # one-time if required
cd backend
python manage.py migrate
python manage.py runserver

Then verify:

http://127.0.0.1:8000/api/tasks/
http://127.0.0.1:8000/api/users/login/ (post)



------------------------------------------------------------------------------
2) Open terminal B for frontend
cd "C:\Users\Admin\OneDrive\Desktop\Projects\FlowPilot-WEB\frontend"
npm install                # one-time
npm run build              # verify
npm start

Then verify:

http://localhost:3000 (React SPA)
login/register works and calls http://localhost:8000/api/users/*