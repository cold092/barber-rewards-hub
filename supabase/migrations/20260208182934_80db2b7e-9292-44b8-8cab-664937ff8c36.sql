-- Create enum for history event types
CREATE TYPE public.lead_event_type AS ENUM (
  'status_change',
  'tag_change',
  'qualification_change',
  'note_added',
  'whatsapp_contact',
  'conversion',
  'created'
);

-- Create lead_history table for timeline
CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  event_type lead_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_by_id UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by referral
CREATE INDEX idx_lead_history_referral_id ON public.lead_history(referral_id);
CREATE INDEX idx_lead_history_created_at ON public.lead_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_history
CREATE POLICY "Admin and Barbers can view lead history"
ON public.lead_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'barber'::app_role));

CREATE POLICY "Admin and Barbers can insert lead history"
ON public.lead_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'barber'::app_role));

-- Add notes column to referrals table for internal observations
ALTER TABLE public.referrals ADD COLUMN notes TEXT;

-- Add is_qualified column to referrals table
ALTER TABLE public.referrals ADD COLUMN is_qualified BOOLEAN DEFAULT NULL;

-- Enable realtime for lead_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_history;