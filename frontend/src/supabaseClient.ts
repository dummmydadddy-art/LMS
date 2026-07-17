import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ljwjyxzkwxyxksfqsgzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqd2p5eHprd3h5eGtzZnFzZ3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTExOTcsImV4cCI6MjA5NzI4NzE5N30.XlziLN6kvAMbs4rO2hfxF-APVApP5ODCzIoqhRLII_Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
