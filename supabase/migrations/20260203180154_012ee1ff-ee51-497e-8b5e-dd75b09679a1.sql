-- Add business_hours and notification_preferences columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN business_hours JSONB DEFAULT '{
  "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
  "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
}'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "email_notifications": true,
  "sms_notifications": false
}'::jsonb;

-- Add after_hours_settings column for schedule page
ALTER TABLE public.profiles
ADD COLUMN after_hours_settings JSONB DEFAULT '{
  "take_messages": true,
  "emergency_escalation": false,
  "holiday_coverage": true
}'::jsonb;