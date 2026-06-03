-- Make slack-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'slack-screenshots';