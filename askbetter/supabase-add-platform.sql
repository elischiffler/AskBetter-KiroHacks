-- Add platform column to chat_histories table
ALTER TABLE public.chat_histories
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'unknown';

