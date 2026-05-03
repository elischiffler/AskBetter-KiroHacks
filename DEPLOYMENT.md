# Deploying AskBetter to Vercel

## Prerequisites

- GitHub account with the AskBetter repository
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project with the database migration applied

## Step-by-Step Deployment

### 1. Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `AskBetter-KiroHacks` repository
4. Click "Import"

### 2. Configure Build Settings

In the project configuration screen:

- **Framework Preset**: Vite
- **Root Directory**: `askbetter` (click "Edit" to change)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables

Click on "Environment Variables" and add:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_PROXY_URL=https://your-app-name.vercel.app/api
```

**Where to find these values:**

- **VITE_SUPABASE_URL**: Supabase Dashboard → Project Settings → API → Project URL
- **VITE_SUPABASE_PUBLISHABLE_KEY**: Supabase Dashboard → Project Settings → API → anon/public key
- **VITE_PROXY_URL**: Will be `https://your-app-name.vercel.app/api` (you'll know the URL after first deploy)

### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete (2-3 minutes)
3. Once deployed, copy your deployment URL (e.g., `https://askbetter-kirohacks.vercel.app`)

### 5. Update Environment Variable

1. Go back to Project Settings → Environment Variables
2. Update `VITE_PROXY_URL` to `https://your-actual-url.vercel.app/api`
3. Redeploy the project (Deployments → ⋯ → Redeploy)

## Vercel Serverless Function

The ChatGPT share link proxy has been converted to a Vercel serverless function at `askbetter/api/fetch-share.js`. This replaces the Express server and runs automatically on Vercel.

## Database Setup

Make sure you've run the database migration in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `askbetter/supabase-migration.sql`
3. Verify the `analysis_history` table exists

## Testing the Deployment

1. Visit your Vercel URL
2. Sign up for an account
3. Paste a conversation or use a sample
4. Click "Analyze"
5. Check the results page
6. Navigate to Dashboard to see your history

## Automatic Deployments

Vercel automatically deploys:

- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches and pull requests

## Troubleshooting

### Build Fails

- Check that `Root Directory` is set to `askbetter`
- Verify all environment variables are set
- Check build logs for specific errors

### API Errors

- Verify `VITE_PROXY_URL` matches your deployment URL
- Check Supabase credentials are correct
- Ensure database migration was run

### Authentication Issues

- Verify Supabase URL and key are correct
- Check that Supabase project is active
- Ensure RLS policies are enabled

### Dashboard Not Loading

- Verify database migration created `analysis_history` table
- Check browser console for errors
- Ensure user is authenticated

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `VITE_PROXY_URL` to use your custom domain

## Environment Variables Reference

| Variable                        | Description                | Example                            |
| ------------------------------- | -------------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL  | `https://abc123.supabase.co`       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key   | `eyJhbGc...`                       |
| `VITE_PROXY_URL`                | Base URL for API endpoints | `https://askbetter.vercel.app/api` |

## Monitoring

- **Analytics**: Vercel Dashboard → Analytics
- **Logs**: Vercel Dashboard → Deployments → [deployment] → Logs
- **Performance**: Vercel Dashboard → Speed Insights

## Costs

- **Vercel**: Free tier includes:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Serverless function executions
- **Supabase**: Free tier includes:
  - 500MB database
  - 1GB file storage
  - 50,000 monthly active users

Both are sufficient for development and small-scale production use.
