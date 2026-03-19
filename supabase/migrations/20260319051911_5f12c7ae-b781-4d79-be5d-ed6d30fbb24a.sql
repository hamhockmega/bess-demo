
CREATE POLICY "public can delete strategy_snapshots"
ON public.strategy_snapshots
FOR DELETE
TO anon
USING (true);
