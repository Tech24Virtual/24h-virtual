-- Allow HR role to read all onboarding records
CREATE POLICY "HR can read all onboarding"
ON public.agent_onboarding FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all banking records
CREATE POLICY "HR can read all banking"
ON public.agent_banking FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all time off requests
CREATE POLICY "HR can read all time off requests"
ON public.time_off_requests FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to update time off requests (approve/deny)
CREATE POLICY "HR can update time off requests"
ON public.time_off_requests FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all job postings
CREATE POLICY "HR can manage job postings"
ON public.job_postings FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all job applications
CREATE POLICY "HR can read all job applications"
ON public.job_applications FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all contracts
CREATE POLICY "HR can read all contracts"
ON public.contracts FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read all profiles
CREATE POLICY "HR can read all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read user_roles
CREATE POLICY "HR can read all user roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Allow HR to read onboarding logs
CREATE POLICY "HR can read onboarding logs"
ON public.agent_onboarding_log FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));