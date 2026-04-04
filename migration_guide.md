# EasyKavach Vercel Deployment & Migration Guide

Follow these steps to deploy and synchronize your data on Vercel.

## 1. Vercel Project Setup

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **"New Project"**.
2. Link your GitHub repository.
3. **Framework Preset**: Vercel should auto-detect Vite for the frontend.
4. **Root Directory**: Leave as `./` (the root containing `vercel.json`).

## 2. Environment Variables

Configure these in **Project Settings > Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Your Vercel Postgres URI |
| `OWM_API_KEY` | `YOUR_KEY` | OpenWeatherMap API Key |
| `SECRET_KEY` | `YOUR_SECRET` | A random 32-char string |
| `DEBUG` | `False` | Set to False for production |

## 3. Database Migration (Postgres)

Since we are moving from SQLite to Postgres, you'll need to seed the remote database:

1. **Enable Vercel Postgres**: In your Vercel project, go to the **Storage** tab and create a new **Postgres** database.
2. **Local Seeding**:
   Run the following command from your local `backend` directory (with your `.venv` active):
   ```bash
   # Extract the URL from Vercel dashboard and set it locally temp
   export DATABASE_URL="your-vercel-postgres-url"
   python -c "from app.seed.seed_data import seed_db; seed_db()"
   ```

## 4. Trigger Scheduling (Cron Jobs)

Vercel functions are serverless. To keep checking for risk triggers, add this to your `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/v1/triggers/check",
    "schedule": "*/5 * * * *"
  }]
}
```

*Note: Ensure you have an endpoint `GET /api/v1/triggers/check` that calls the logic in `trigger_scheduler.py`.*
