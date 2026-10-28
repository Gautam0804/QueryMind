CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.schema_knowledge (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    embedding VECTOR(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.schema_knowledge
    ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.schema_knowledge
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.schema_knowledge
    ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

ALTER TABLE public.schema_knowledge
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS schema_knowledge_embedding_idx
    ON public.schema_knowledge
    USING hnsw (embedding vector_cosine_ops);