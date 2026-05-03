-- Create analysis_history table to store user analysis results over time
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scores JSONB NOT NULL,
  prompt_count INTEGER NOT NULL,
  passive_count INTEGER NOT NULL,
  active_count INTEGER NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at);

-- Enable Row Level Security
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own analysis history
CREATE POLICY "Users can view their own analysis history"
  ON analysis_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own analysis history
CREATE POLICY "Users can insert their own analysis history"
  ON analysis_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own analysis history
CREATE POLICY "Users can update their own analysis history"
  ON analysis_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can only delete their own analysis history
CREATE POLICY "Users can delete their own analysis history"
  ON analysis_history
  FOR DELETE
  USING (auth.uid() = user_id);
