-- ==============================================================================
-- Kynetra Platform — Supabase Schema & Seed Migration (001_initial_schema_and_seed.sql)
-- Safe, Idempotent, and fully compatible with Supabase PostgreSQL 16
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Districts Table
CREATE TABLE IF NOT EXISTS public.districts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    theme VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    coord_x INTEGER DEFAULT 0 NOT NULL,
    coord_y INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    active_users INTEGER DEFAULT 0 NOT NULL,
    key_landmark VARCHAR(100) NOT NULL
);

-- 3. Create Buildings Table
CREATE TABLE IF NOT EXISTS public.buildings (
    id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
    campus_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    total_floors INTEGER DEFAULT 1 NOT NULL
);

-- 4. Create Floors Table
CREATE TABLE IF NOT EXISTS public.floors (
    id VARCHAR(50) PRIMARY KEY,
    building_id VARCHAR(50) NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    capacity INTEGER DEFAULT 100 NOT NULL,
    current_occupancy INTEGER DEFAULT 0 NOT NULL
);

-- 5. Create Interactive Nodes Table
CREATE TABLE IF NOT EXISTS public.interactive_nodes (
    id VARCHAR(50) PRIMARY KEY,
    floor_id VARCHAR(50) NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    node_type VARCHAR(30) NOT NULL,
    pos_x DOUBLE PRECISION DEFAULT 0 NOT NULL,
    pos_y DOUBLE PRECISION DEFAULT 0 NOT NULL,
    pos_z DOUBLE PRECISION DEFAULT 0 NOT NULL,
    description TEXT NOT NULL,
    active_session_count INTEGER DEFAULT 0 NOT NULL
);

-- 6. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(255),
    subscription_tier VARCHAR(20) DEFAULT 'free' NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    handle VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(60) NOT NULL,
    role VARCHAR(20) DEFAULT 'employee' NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL,
    current_district_id VARCHAR(50) DEFAULT 'kynetra-central' NOT NULL,
    status_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Tenant Memberships Table
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Row Level Security (RLS) Policies for Supabase Client Access
-- ==============================================================================
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Districts" ON public.districts;
CREATE POLICY "Public Read Districts" ON public.districts FOR SELECT USING (true);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Buildings" ON public.buildings;
CREATE POLICY "Public Read Buildings" ON public.buildings FOR SELECT USING (true);

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Floors" ON public.floors;
CREATE POLICY "Public Read Floors" ON public.floors FOR SELECT USING (true);

ALTER TABLE public.interactive_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Interactive Nodes" ON public.interactive_nodes;
CREATE POLICY "Public Read Interactive Nodes" ON public.interactive_nodes FOR SELECT USING (true);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
CREATE POLICY "Public Read Organizations" ON public.organizations FOR SELECT USING (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All User Operations" ON public.users;
CREATE POLICY "Allow All User Operations" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Tenant Memberships" ON public.tenant_memberships;
CREATE POLICY "Public Read Tenant Memberships" ON public.tenant_memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Tenant Memberships" ON public.tenant_memberships;
CREATE POLICY "Allow All Tenant Memberships" ON public.tenant_memberships FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Grant Access to Supabase API Roles (anon, authenticated, service_role)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ==============================================================================
-- Canonical Seed Data
-- ==============================================================================

-- 1. Seed Organization
INSERT INTO public.organizations (id, name, slug, domain, subscription_tier, avatar_url)
VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'Kynetra Foundation',
    'kynetra-foundation',
    'kynetra.dev',
    'enterprise',
    'https://assets.kynetra.dev/orgs/foundation.svg'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = now();

-- 2. Seed Administrator User
INSERT INTO public.users (id, email, password_hash, handle, display_name, role, xp, current_district_id, status_message)
VALUES (
    'usr_admin_01',
    'admin@kynetra.dev',
    '$2a$12$e8Yk2uRz0N9b4J1q2w3e4u5i6o7p8a9s0d1f2g3h4j5k6l7z8x9c0',
    'admin',
    'Admin',
    'admin',
    5000,
    'kynetra-central',
    'Root Platform Administrator'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    handle = EXCLUDED.handle,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    xp = EXCLUDED.xp,
    updated_at = now();

-- 3. Seed Tenant Membership
INSERT INTO public.tenant_memberships (id, organization_id, user_id, role)
VALUES (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'usr_admin_01',
    'owner'
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role;

-- 4. Seed Districts
INSERT INTO public.districts (id, name, theme, description, coord_x, coord_y, status, active_users, key_landmark)
VALUES
    ('kynetra-central', 'Kynetra Central', 'Civic & Headquarters', 'The civic core of Kynetra. Features Central Plaza, civic forums, and the Innovation Tower.', 0, 0, 'active', 0, 'Innovation Tower'),
    ('developer-district', 'Developer District', 'Open Source & Tooling', 'Home to collaborative open-source guilds, compiler workshops, and hackathons.', 250, 50, 'active', 0, 'Open Source Guild Hall'),
    ('ai-research-district', 'AI Research District', 'Intelligence & Simulation', 'Neural training clusters, agent laboratories, and synthetic personality testing grounds.', -180, 220, 'active', 0, 'Neural Foundry'),
    ('cybersecurity-district', 'Cybersecurity District', 'Defense & Offense Simulation', 'Red team/blue team battlegrounds, vulnerability ranges, and forensic sandbox chambers.', -300, -150, 'active', 0, 'Zero Trust Citadel')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    theme = EXCLUDED.theme,
    description = EXCLUDED.description,
    coord_x = EXCLUDED.coord_x,
    coord_y = EXCLUDED.coord_y,
    status = EXCLUDED.status,
    key_landmark = EXCLUDED.key_landmark;

-- 5. Seed Buildings
INSERT INTO public.buildings (id, district_id, campus_id, name, code, total_floors)
VALUES
    ('building-innovation-tower', 'kynetra-central', 'campus-hq', 'Innovation Tower', 'INNO', 10),
    ('building-dev-guild', 'developer-district', 'campus-foss', 'Open Source Guild Hall', 'GUILD', 3),
    ('building-ai-foundry', 'ai-research-district', 'campus-neural', 'Neural Foundry', 'NEUR', 4),
    ('building-sec-citadel', 'cybersecurity-district', 'campus-zero-trust', 'Zero Trust Citadel', 'CITL', 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    total_floors = EXCLUDED.total_floors;

-- 6. Seed Floors
INSERT INTO public.floors (id, building_id, floor_number, name, category, description, capacity, current_occupancy)
VALUES
    ('floor-inno-1', 'building-innovation-tower', 1, 'Lobby & Reception', 'lobby', 'Grand reception concourse with AI Receptionist and fast-travel portals.', 250, 0),
    ('floor-inno-4', 'building-innovation-tower', 4, 'Algorithmic Coding Arena', 'coding_arena', 'High-stakes multiplayer coding pods with live test harness evaluation.', 100, 0),
    ('floor-inno-8', 'building-innovation-tower', 8, 'Cloud Infrastructure & SRE Lab', 'cloud_lab', 'Interactive server racks, live telemetry boards, and simulated outages.', 80, 0),
    ('floor-dev-1', 'building-dev-guild', 1, 'Guild Hall Commons', 'workspace', 'Open collaborative hall for distributed project maintainers.', 150, 0),
    ('floor-dev-2', 'building-dev-guild', 2, 'Compiler & Runtime Workshop', 'workspace', 'Low-level benchmarking suites, WebAssembly runtimes, and JIT compilers.', 80, 0),
    ('floor-ai-1', 'building-ai-foundry', 1, 'Neural Foundry Concourse', 'workspace', 'Central AI research forum with model checkpoint evaluation pods.', 120, 0),
    ('floor-sec-1', 'building-sec-citadel', 1, 'Security Operations Center (SOC)', 'workspace', 'Live SIEM threat intelligence boards and intrusion alerts.', 100, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    capacity = EXCLUDED.capacity;

-- 7. Seed Interactive Nodes
INSERT INTO public.interactive_nodes (id, floor_id, name, node_type, pos_x, pos_y, pos_z, description, active_session_count)
VALUES
    ('node-reception-desk', 'floor-inno-1', 'Aria (AI Receptionist)', 'receptionist_npc', 0, 1.5, -5, 'Intelligent concierge guiding developers to floors and arenas.', 0),
    ('node-portal-arena', 'floor-inno-1', 'Arena Fast Portal', 'portal', 10, 1, -2, 'Direct transit to Coding Arena on Floor 4.', 0),
    ('node-arena-pod-1', 'floor-inno-4', 'Battle Pod Alpha', 'coding_pod', -8, 1, 4, 'Competitive dual-terminal coding pod with automated test runner.', 0),
    ('node-arena-pod-2', 'floor-inno-4', 'Battle Pod Beta', 'coding_pod', 8, 1, 4, 'Real-time algorithm competition station with telemetry display.', 0),
    ('node-arena-whiteboard', 'floor-inno-4', 'System Architecture Board', 'whiteboard', 0, 2, 8, 'Collaborative real-time diagramming canvas.', 0),
    ('node-cloud-rack-01', 'floor-inno-8', 'Simulated Kubernetes Cluster Rack', 'cloud_lab_rack', 6, 1.5, 0, 'Physical cluster replica with live circuit breaker controls.', 0),
    ('node-sre-terminal', 'floor-inno-8', 'NOC Incident Response Terminal', 'terminal', -6, 1, 0, 'Real-time observability console and chaos engineering triggers.', 0),
    ('node-dev-collab-1', 'floor-dev-1', 'Git Contributor Workstation', 'terminal', -4, 1, 0, 'Code review hub and monorepo build runner.', 0),
    ('node-dev-registry', 'floor-dev-1', 'Package Registry Mirror', 'cloud_lab_rack', 4, 1, 2, 'Artifact caching node with dependency vulnerability scanner.', 0),
    ('node-compiler-bench', 'floor-dev-2', 'Rust Toolchain Bench', 'terminal', 0, 1, -3, 'High-concurrency compilation runner with micro-benchmarks.', 0),
    ('node-ai-evaluator', 'floor-ai-1', 'Model Benchmark Pod', 'terminal', -5, 1, 2, 'Autonomous LLM evaluation and latency profiler.', 0),
    ('node-vector-cluster', 'floor-ai-1', 'pgvector Index Cluster', 'cloud_lab_rack', 5, 1.5, -2, 'High-dimension vector search engine with RAG telemetry.', 0),
    ('node-soc-console', 'floor-sec-1', 'SOC Threat Defense Console', 'terminal', -4, 1, 0, 'SIEM anomaly detector and firewall rule validator.', 0),
    ('node-honeynet-rack', 'floor-sec-1', 'Honeypot Sandbox Cluster', 'cloud_lab_rack', 4, 1.5, 1, 'Isolated decoy environment capturing simulated cyber attacks.', 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    node_type = EXCLUDED.node_type,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y,
    pos_z = EXCLUDED.pos_z,
    description = EXCLUDED.description;

-- 8. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
