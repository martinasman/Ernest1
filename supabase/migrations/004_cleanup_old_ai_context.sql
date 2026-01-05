-- Cleanup migration: Remove deprecated ai_context fields
-- This cleans up old data that's no longer used after the website generation rewrite

-- The old system stored:
-- - ai_context.website (old JSON website structure with sections)
-- - ai_context.brand (deprecated - brand data now in brands table)
-- - ai_context.flow, ai_context.flowReactFlow (already cleaned by plan generation)

-- This migration removes old 'website' and 'brand' keys from ai_context
-- keeping only: businessPlan, websiteFiles, and any other new keys

-- Update all workspaces to remove deprecated keys
UPDATE workspaces
SET ai_context = ai_context - 'website' - 'brand'
WHERE ai_context IS NOT NULL
  AND (ai_context ? 'website' OR ai_context ? 'brand');

-- Add comment documenting current ai_context structure
COMMENT ON COLUMN workspaces.ai_context IS 'AI-generated context. Current keys: businessPlan (BusinessPlan object), websiteFiles (Record<string, string> of generated code files)';
