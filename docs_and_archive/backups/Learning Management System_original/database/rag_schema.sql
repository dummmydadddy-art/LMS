-- ==========================================================
-- EduConnect LMS - True RAG Database Schema (pgvector)
-- ==========================================================
-- Run this script in the Supabase SQL Editor to enable
-- native vector storage and semantic similarity search.

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing objects if recreating
DROP TABLE IF EXISTS material_chunks CASCADE;
DROP FUNCTION IF EXISTS match_material_chunks CASCADE;

-- 3. Create material_chunks table
-- Stores chunked passages of course materials along with 768-dim embeddings
CREATE TABLE material_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_material_chunks_course_id ON material_chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_material_chunks_batch_id ON material_chunks(batch_id);
CREATE INDEX IF NOT EXISTS idx_material_chunks_material_id ON material_chunks(material_id);

-- Optional HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_material_chunks_embedding 
ON material_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Semantic Similarity Search Function (RPC)
-- Called from PHP backend or n8n via: POST /rest/v1/rpc/match_material_chunks
CREATE OR REPLACE FUNCTION match_material_chunks(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.4,
    match_count int DEFAULT 5,
    filter_course_id uuid DEFAULT NULL,
    filter_batch_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    material_id uuid,
    course_id uuid,
    batch_id uuid,
    chunk_index int,
    title varchar,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mc.id,
        mc.material_id,
        mc.course_id,
        mc.batch_id,
        mc.chunk_index,
        mc.title,
        mc.content,
        mc.metadata,
        (1 - (mc.embedding <=> query_embedding))::float AS similarity
    FROM material_chunks mc
    WHERE
        (filter_course_id IS NULL OR mc.course_id = filter_course_id)
        AND (filter_batch_id IS NULL OR mc.batch_id = filter_batch_id)
        AND (1 - (mc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY mc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
