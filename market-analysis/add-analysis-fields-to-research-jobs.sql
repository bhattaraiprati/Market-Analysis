-- Migration: Add analysis fields to research_jobs table
-- Run this in your PostgreSQL database

-- Add output_results column to store analysis results
ALTER TABLE research_jobs
ADD COLUMN IF NOT EXISTS output_results JSONB;

-- Add analyzed_at column to track when analysis completed
ALTER TABLE research_jobs
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN research_jobs.output_results IS 'Stores the complete analysis results from AnalystAgent including competitor analyses, gaps, recommendations, market position, and executive summary';
COMMENT ON COLUMN research_jobs.analyzed_at IS 'Timestamp when the AnalystAgent completed its analysis';

-- Create index for faster queries on analyzed jobs
CREATE INDEX IF NOT EXISTS idx_research_jobs_analyzed_at ON research_jobs(analyzed_at);

-- Verify the changes
\d research_jobs;
