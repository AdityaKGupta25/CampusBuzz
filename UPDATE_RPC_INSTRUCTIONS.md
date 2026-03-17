
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eeomuefujtyquhgpcmft.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Need service key for DDL if possible, but usually we just use the SQL editor.

// Since I cannot run DDL via service key easily without RPC, I'll try to find if there's an existing RPC to run migrations.
// But usually I just tell the user. 
// Wait, I can try to run it via the anon key if I have a super-user RPC? No.

// I'll update the JS code to do a manual update after the RPC as a workaround if I can't update the DB yet.
// OR I'll assume the user will run the SQL.

async function updateRPC() {
    console.log("Please run the following SQL in your Supabase Dashboard to update the assign_event_staff function:");
    console.log(`
CREATE OR REPLACE FUNCTION assign_event_staff(
    p_event_id UUID,
    p_student_id UUID,
    p_role TEXT,
    p_edit_access BOOLEAN,
    p_notif_title TEXT,
    p_notif_message TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    v_ins_id UUID;
BEGIN
    -- Resolve institution_id one time to store it in event_staff
    SELECT institution_id INTO v_ins_id FROM events WHERE id = p_event_id;

    -- 1. Insert/Update staff record
    INSERT INTO event_staff (event_id, student_id, role_name, grant_edit_access, can_edit_event, institution_id)
    VALUES (p_event_id, p_student_id, p_role, p_edit_access, p_edit_access, v_ins_id)
    ON CONFLICT (event_id, student_id) 
    DO UPDATE SET 
        role_name = EXCLUDED.role_name,
        grant_edit_access = EXCLUDED.grant_edit_access,
        can_edit_event = EXCLUDED.can_edit_event;

    -- 1b. Legacy column update (Safely attempting update if role column exists)
    BEGIN
        UPDATE event_staff SET role = p_role WHERE event_id = p_event_id AND student_id = p_student_id;
    EXCEPTION WHEN OTHERS THEN
        -- Column doesn't exist, ignore
    END;

    -- 2. Create notification
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        p_student_id, 
        p_notif_title, 
        p_notif_message, 
        'info', 
        '/faculty/event/' || p_event_id || '/manage'
    );
END;
$$ LANGUAGE plpgsql;
    `);
}
updateRPC();
