# Dashboard Launch Status

- DB1 stale production bundle → requires Lovable republish
- DB2 ticket_replies RLS → fixed (migration in this session)
- DB3 edge-function URL leaks → fixed (commit 60d8368)
- DB4 affiliate / PDF URL leaks → fixed (commit 60d8368)
- DH7 signup redirect → fixed (this session, AuthContext.tsx)

All admin and staff routes referenced in the audit are present in source.
Stale production = Lovable Publish needed.
