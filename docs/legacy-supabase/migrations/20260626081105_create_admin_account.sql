/*
# Create admin account

Creates the admin user (admin@gmail.com / Qwertyuiop09) directly in auth.users
and registers them in admin_users.

Also creates the corresponding auth.identities record required by Supabase Auth
for email/password login to function correctly.
*/

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Skip if already exists
  SELECT id INTO v_uid FROM auth.users WHERE email = 'admin@gmail.com';

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@gmail.com',
      crypt('Qwertyuiop09', gen_salt('bf')),
      NOW(),
      '{"full_name":"Admin","role":"admin"}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      false,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Required identity record for Supabase Auth email/password
    INSERT INTO auth.identities (
      id,
      user_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at,
      provider_id
    ) VALUES (
      v_uid,
      v_uid,
      'email',
      jsonb_build_object('sub', v_uid::text, 'email', 'admin@gmail.com', 'email_verified', true),
      NOW(),
      NOW(),
      NOW(),
      'admin@gmail.com'
    );
  END IF;

  -- Ensure admin_users record exists
  INSERT INTO admin_users (id, email)
  VALUES (v_uid, 'admin@gmail.com')
  ON CONFLICT (id) DO NOTHING;
END $$;
