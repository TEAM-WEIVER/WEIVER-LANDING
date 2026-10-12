-- Apply before deploying the stage-1 API. Existing reservations stay unclassified.
alter table public.reservations
  add column job_family text,
  add column applicant_type text,
  add column primary_role text;

alter table public.reservations add constraint reservations_survey_selection_check check (
  (job_family is null and applicant_type is null and primary_role is null)
  or (
    job_family is not null and applicant_type is not null and primary_role is not null
    and applicant_type in ('student', 'entry_level', 'experienced', 'employed_no_change', 'other')
    and (
      (job_family = 'FE' and primary_role in ('web_frontend', 'mobile_cross_platform', 'design_system', 'performance_platform', 'interactive_graphics', 'undecided', 'other'))
      or (job_family = 'BE' and primary_role in ('server_api', 'distributed_systems', 'data_engineering', 'devops_sre', 'undecided', 'other'))
      or (job_family = 'AI' and primary_role in ('llm_genai', 'cv_multimodal', 'nlp_speech', 'recommendation_search', 'mlops_platform', 'robotics_edge', 'ml_engineer', 'research_engineer', 'undecided', 'other'))
    )
  )
);

create table public.survey_responses (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  survey_version text not null default 'v1',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  access_token_hash text not null unique check (access_token_hash ~ '^[0-9a-f]{64}$'),
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on public.survey_responses from anon, authenticated;

-- Prepare server-only stage-2 events; stage 1 does not emit these names.
alter table public.tracking_events drop constraint tracking_events_event_name_check;
alter table public.tracking_events add constraint tracking_events_event_name_check check (
  event_name in ('page_view', 'reserve_opened', 'reservation_completed', 'section_view',
    'cta_clicked', 'survey_started', 'survey_skipped', 'survey_completed')
);
alter table public.tracking_events add constraint tracking_events_survey_identity_check check (
  event_name not in ('survey_started', 'survey_skipped', 'survey_completed')
  or (properties ? 'reservationId' and properties ? 'surveyVersion'
    and jsonb_typeof(properties->'reservationId') = 'string'
    and jsonb_typeof(properties->'surveyVersion') = 'string')
);
create unique index tracking_events_one_survey_event_per_reservation_idx
  on public.tracking_events ((properties->>'reservationId'), event_name)
  where event_name in ('survey_started', 'survey_skipped', 'survey_completed');
