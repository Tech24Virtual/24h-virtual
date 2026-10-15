/**
 * supabase.functions.invoke() reports any non-2xx as a FunctionsHttpError whose
 * message is the generic "Edge Function returned a non-2xx status code". The
 * function's own `{ error }` body is on error.context — surface that instead.
 */
export async function functionError(error: unknown): Promise<Error> {
  const fallback = error instanceof Error ? error.message : 'Request failed';
  try {
    const body = await (error as { context?: Response }).context?.json?.();
    const message = body?.error ?? body?.message;
    return new Error(typeof message === 'string' && message ? message : fallback);
  } catch {
    return new Error(fallback);
  }
}
