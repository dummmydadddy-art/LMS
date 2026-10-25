import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cjhfnaubbfqhwveuhslh.supabase.co';
const supabaseAnonKey = 'sb_publishable_nKnJWB2nMK1c_EORxrhr_w_PPvsvPSJ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
