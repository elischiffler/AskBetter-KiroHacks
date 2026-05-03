# User Dashboard Feature

## Overview

The User Dashboard tracks prompting metrics over time, showing users whether they're improving or declining in their AI interaction skills.

## Features

### 1. **Progress Tracking**

- Stores every analysis result in the database
- Tracks 6 quality dimensions: Autonomy, Curiosity, Critical Thinking, Specificity, Context, Engagement
- Calculates overall quality score

### 2. **Trend Analysis**

- Compares recent analyses (last 3) vs previous analyses
- Shows whether user is improving, declining, or stable
- Displays percentage change in quality

### 3. **Visual Analytics**

- **Line Chart**: Shows score progression over time for all 6 dimensions
- **Comparison Cards**: Displays average vs recent scores with change indicators
- **Key Metrics**: Overall quality, recent score, total analyses count

### 4. **Progress Messages**

- Personalized feedback based on trend direction
- Encouraging messages for improvement
- Constructive guidance for declining trends

## Database Schema

The feature uses a `analysis_history` table with the following structure:

```sql
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP,
  scores JSONB,
  prompt_count INTEGER,
  passive_count INTEGER,
  active_count INTEGER
);
```

### Row Level Security (RLS)

- Users can only access their own analysis history
- Policies enforce user isolation for SELECT, INSERT, UPDATE, DELETE

## Components

### `DashboardPage.tsx`

Main dashboard page that:

- Fetches user's analysis history
- Displays progress indicators and charts
- Shows empty state for new users
- Requires authentication

### `TrendChart.tsx`

Line chart component using Recharts that:

- Displays all 6 quality dimensions over time
- Shows overall quality as a bold line
- Includes tooltips with detailed scores

### `ProgressIndicator.tsx`

Status card that:

- Shows trend direction (improving/declining/stable)
- Displays percentage change
- Provides personalized feedback messages

### `ComparisonCards.tsx`

Grid of score cards that:

- Compare average vs recent scores
- Show change indicators (up/down arrows)
- Highlight improvements in green, declines in red

## Services

### `dashboardService.ts`

Provides functions for:

- `saveAnalysis()` - Save new analysis to database
- `getAnalysisHistory()` - Fetch user's history
- `calculateDashboardStats()` - Compute trends and averages
- `getDashboardStats()` - Combined fetch + calculate

## Integration

### Automatic Saving

When a user completes an analysis on the ResultsPage:

1. If user is authenticated, analysis is automatically saved
2. Scores, prompt counts, and timestamps are stored
3. No user action required

### Navigation

- Dashboard link appears in Header when user is logged in
- Accessible at `/dashboard` route
- Protected route - redirects to auth if not logged in

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in your Supabase project:

```bash
# Copy the contents of supabase-migration.sql
# Run in Supabase SQL Editor
```

Or use Supabase CLI:

```bash
supabase db push
```

### 2. Environment Variables

Ensure these are set in `askbetter/.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### 3. Test the Feature

1. Sign up or log in
2. Complete an analysis
3. Navigate to Dashboard (click Dashboard in header)
4. Complete more analyses to see trends

## Future Enhancements

- [ ] Export analysis history as CSV
- [ ] Set personal goals and track progress
- [ ] Compare with community averages
- [ ] Weekly/monthly email summaries
- [ ] Achievements and badges system
- [ ] Detailed drill-down into specific analyses
- [ ] Filter history by date range
- [ ] Share progress with others
