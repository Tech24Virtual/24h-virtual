CREATE OR REPLACE FUNCTION public.increment_break_minutes(shift_id uuid, minutes int)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.agent_shifts
  SET total_break_minutes = COALESCE(total_break_minutes, 0) + minutes
  WHERE id = shift_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_break_minutes(uuid, int) TO authenticated;
