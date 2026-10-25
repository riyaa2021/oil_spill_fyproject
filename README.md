# AI SpillGuard — local starter

This starter keeps the trained Keras model on your computer. It includes a FastAPI AI service, an Express API with SQLite history/analytics, and a React + Tailwind UI. The existing Streamlit app and original project files are not modified by this starter.

## 1. Put the model in the project root

Copy your already-working `.keras` model into this folder (next to `.gitignore` and this README), or set its actual path in `ai_service/.env`. Do not commit the model to Git.

## 2. Python AI service

Use the same Python environment/TensorFlow version that currently loads your model if possible. In a terminal at this project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ai_service/requirements.txt
pip install tensorflow
```

If TensorFlow is already installed and works in the environment used by your Streamlit app, use that environment instead of installing another version. Copy `ai_service/.env.example` to `ai_service/.env` and update `SPILLGUARD_MODEL_PATH` if the model filename/location differs.

Run from the project root:

```powershell
uvicorn ai_service.main:app --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/health`, then open `http://127.0.0.1:8000/docs` and test `POST /api/detect` with an image.

## 3. Node/Express backend

Open a second terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Check `http://localhost:5000/api/health`. The response should show the Python service and `model_loaded: true`.

API routes:
- `POST /api/detect` — multipart form field named `file`
- `GET /api/history` — recent SQLite records
- `GET /api/analytics` — summary and risk distribution
- `DELETE /api/history` — clears history

## 4. React frontend

Open a third terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Start order every time

1. Start the Python service (terminal 1).
2. Start the Express backend (terminal 2).
3. Start the React frontend (terminal 3).

Keep all three terminals running while using the app.

## Important prediction note

The existing `prediction.py` inverts the model output (`1 - prediction`). This starter intentionally preserves that behavior to match your current Streamlit app. Validate it against known labelled test images before relying on the results. Risk thresholds in `prediction.py` are inherited from your existing code and should be treated as project heuristics, not validated environmental response thresholds.

## Troubleshooting

- **Model not found:** update `SPILLGUARD_MODEL_PATH` in `ai_service/.env`.
- **TensorFlow/Keras load error:** use the same Python environment and TensorFlow/Keras version that successfully loads the model in your current app.
- **Backend says Python unavailable:** make sure the FastAPI service is running on port 8000.
- **React cannot connect:** ensure Express is running on port 5000 and the frontend `.env` uses `VITE_API_URL=http://localhost:5000/api`.
- **SQLite native install issue:** use a supported current Node.js LTS version and rerun `npm install` in `backend`.
