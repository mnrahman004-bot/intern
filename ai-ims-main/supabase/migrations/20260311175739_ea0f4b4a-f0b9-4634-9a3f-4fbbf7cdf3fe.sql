
CREATE TABLE public.prediction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  current_stock integer NOT NULL,
  predicted_demand integer NOT NULL,
  reorder_quantity integer NOT NULL,
  risk_level text NOT NULL,
  reasoning text,
  prediction_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own predictions" ON public.prediction_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions" ON public.prediction_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions" ON public.prediction_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
