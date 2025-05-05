-- Uncomment if you haven't enabled pgcrypto or uuid-ossp yet.
-- create extension if not exists "pgcrypto";
-- create extension if not exists "uuid-ossp";

-- ******************************************************************************************************************* -- 
-- *********************************************       Profiles Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique,
  display_name  text,
  email         text unique not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ******************************************************************************************************************* -- 
-- *********************************************       Teams Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 
create table if not exists public.teams (
  team_id     uuid primary key default gen_random_uuid(),
  team_name   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ******************************************************************************************************************* -- 
-- *********************************************       UserTeams Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 

create table if not exists public.user_teams (
  user_id    uuid not null,
  team_id    uuid not null,
  role       text,
  joined_at  timestamptz not null default now(),
  primary key (user_id, team_id),
  
  constraint user_teams_user_id_fk
    foreign key (user_id)
    references public.profiles (id)
    on update cascade
    on delete cascade,
    
  constraint user_teams_team_id_fk
    foreign key (team_id)
    references public.teams (team_id)
    on update cascade
    on delete cascade
);

-- ******************************************************************************************************************* -- 
-- *********************************************       Templates Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 


create table if not exists public.templates (
  template_id     uuid primary key default gen_random_uuid(),
  user_id         uuid null,
  team_id         uuid null,
  template_name   text not null,
  description     text,
  content         jsonb,  -- or text if you prefer
  checkpoints     jsonb,  -- list of default checkpoints
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint templates_user_id_fk
    foreign key (user_id)
    references public.profiles (id)
    on update cascade
    on delete set null,

  constraint templates_team_id_fk
    foreign key (team_id)
    references public.teams (team_id)
    on update cascade
    on delete set null
);

-- ******************************************************************************************************************* -- 
-- *********************************************       Meetigs Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 

create table if not exists public.meetings (
  meeting_id    uuid primary key default gen_random_uuid(),
  user_id       uuid null,
  team_id       uuid null,
  template_id   uuid not null,
  meeting_title text not null,
  start_time    timestamptz,
  end_time      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint meetings_user_id_fk
    foreign key (user_id)
    references public.profiles (id)
    on update cascade
    on delete set null,

  constraint meetings_team_id_fk
    foreign key (team_id)
    references public.teams (team_id)
    on update cascade
    on delete set null,

  constraint meetings_template_id_fk
    foreign key (template_id)
    references public.templates (template_id)
    on update cascade
    on delete restrict
);

-- ******************************************************************************************************************* -- 
-- *********************************************       Transcript Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 

create table if not exists public.transcripts (
  transcript_id       uuid primary key default gen_random_uuid(),
  meeting_id          uuid not null,
  transcription_text  text,    -- or jsonb
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint transcripts_meeting_id_fk
    foreign key (meeting_id)
    references public.meetings (meeting_id)
    on update cascade
    on delete cascade
);


-- ******************************************************************************************************************* -- 
-- *********************************************       Checkpoints Table       ********************************************* -- 
-- ******************************************************************************************************************* -- 

create table if not exists public.checkpoints (
  checkpoint_id           uuid primary key default gen_random_uuid(),
  meeting_id              uuid not null,
  template_checkpoint_id  uuid null,     -- or text, if referencing a specific checkpoint from the template
  description             text,
  status                  text,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint checkpoints_meeting_id_fk
    foreign key (meeting_id)
    references public.meetings (meeting_id)
    on update cascade
    on delete cascade
);


