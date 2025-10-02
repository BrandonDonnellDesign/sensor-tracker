-- Add admin policies for sensor models management

-- Allow admin users to insert new sensor models
CREATE POLICY "Admins can insert sensor models"
ON public.sensor_models
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admin users to update sensor models
CREATE POLICY "Admins can update sensor models"
ON public.sensor_models
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admin users to delete sensor models
CREATE POLICY "Admins can delete sensor models"
ON public.sensor_models
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);