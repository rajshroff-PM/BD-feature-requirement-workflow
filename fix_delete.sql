CREATE POLICY "task_logs deletable by authenticated users" 
ON task_logs FOR DELETE USING (auth.role() = 'authenticated');
