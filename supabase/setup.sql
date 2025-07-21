-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
DROP POLICY IF EXISTS "Enable read access for all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert own profile" ON profiles;

-- Policy for reading profiles (all authenticated users can read)
CREATE POLICY "Enable read access for all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy for inserting profiles (users can only insert their own)
CREATE POLICY "Enable insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy for updating profiles (users can only update their own)
CREATE POLICY "Enable update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  description text,
  total_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add description column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='description') THEN
    ALTER TABLE items ADD COLUMN description text;
  END IF;
END $$;

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create users_items table for tracking user commitments
CREATE TABLE IF NOT EXISTS users_items (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  item_id integer REFERENCES items ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

-- Enable RLS for users_items table
ALTER TABLE users_items ENABLE ROW LEVEL SECURITY;

-- Create stored procedure for updating total counts
CREATE OR REPLACE FUNCTION update_total_count(p_item_id bigint, p_count int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_total int;
BEGIN
  -- Get current total
  SELECT total_count INTO v_current_total
  FROM items
  WHERE id = p_item_id;

  -- Update the total
  UPDATE items
  SET total_count = v_current_total + p_count
  WHERE id = p_item_id;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON items;
DROP POLICY IF EXISTS "Enable read access for own items" ON users_items;
DROP POLICY IF EXISTS "Enable insert access for own items" ON users_items;
DROP POLICY IF EXISTS "Enable update access for own items" ON users_items;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read all commitments" ON users_items;
DROP POLICY IF EXISTS "Users can read all items" ON items;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read all user items" ON users_items;
DROP POLICY IF EXISTS "Users can manage own items" ON users_items;

-- Create RLS policies
-- Items table policies
CREATE POLICY "Users can read all items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

-- Users_items table policies
CREATE POLICY "Users can read all user items"
  ON users_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own items"
  ON users_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profiles table policies
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT ON items TO authenticated;
GRANT SELECT ON users_items TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT, UPDATE ON users_items TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Insert sample items (only if they don't exist)
INSERT INTO items (name)
SELECT unnest(ARRAY[
  'Chips',
  'Salsa',
  'Guacamole',
  'Beer',
  'Wine',
  'Soda',
  'Ice',
  'Paper plates',
  'Plastic cups',
  'Napkins'
])
WHERE NOT EXISTS (SELECT 1 FROM items LIMIT 1);
