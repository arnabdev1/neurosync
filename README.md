## Devpost: https://devpost.com/software/undecided-iwednr

## 🛠️ Project Setup & Run Guide

Follow the steps below to run the NeuroSync ecosystem locally:

---

### ▶️ Frontend (Next.js)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev

```

### ▶️ Backend (Flask)

```bash
# Navigate to the Flask backend directory
cd backend-flask

# Create and activate the virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the inference engine
python3 app.py

```

### ▶️ Backend (Node.js)

```bash
# Navigate to the Node backend directory 
cd backend-node 

# Install dependencies 
npm install 

# Run the development server with auto-reload
npx nodemon server.js

```