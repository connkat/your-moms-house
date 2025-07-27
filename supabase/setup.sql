-- Drop tables in correct order
DROP TABLE IF EXISTS users_items;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trigger function with elevated privileges
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(name)
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  description text,
  total_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create categories_items join table
CREATE TABLE IF NOT EXISTS categories_items (
  category_id integer REFERENCES categories(id) ON DELETE CASCADE,
  item_id integer REFERENCES items(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (category_id, item_id)
);

-- Add description column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='description') THEN
    ALTER TABLE items ADD COLUMN description text;
  END IF;
END $$;

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on categories_items table
ALTER TABLE categories_items ENABLE ROW LEVEL SECURITY;

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  description text,
  event_name text NOT NULL,
  shift_start timestamp NOT NULL,
  shift_end timestamp NOT NULL,
  count integer DEFAULT 0,
  max_count integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('pacific'::text, now()) NOT NULL,
  CONSTRAINT valid_count_range CHECK (count <= max_count)
);

-- Create users_shifts join table
CREATE TABLE IF NOT EXISTS users_shifts (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id integer REFERENCES shifts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('pacific'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, shift_id)
);

-- Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users_shifts table
ALTER TABLE users_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for shifts table
CREATE POLICY "Users can read all shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for users_shifts table
CREATE POLICY "Users can read all shift signups"
  ON users_shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can sign up for shifts"
  ON users_shifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their shift signups"
  ON users_shifts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create users_items table for tracking user commitments
CREATE TABLE IF NOT EXISTS users_items (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read all categories" ON categories;
DROP POLICY IF EXISTS "Users can manage categories" ON categories;
DROP POLICY IF EXISTS "Users can read all categories_items" ON categories_items;
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

-- Create policies for profiles
DROP POLICY IF EXISTS "Enable read access for all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Enable update own profile" ON profiles;
DROP POLICY IF EXISTS "Trigger can create profile" ON profiles;

CREATE POLICY "Enable read access for all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for service role"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Trigger can create profile"
  ON profiles FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_items ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT ON items TO authenticated;
GRANT SELECT ON users_items TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON categories TO authenticated;
GRANT SELECT ON categories_items TO authenticated;
GRANT INSERT, UPDATE ON users_items TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Create policies for categories
DROP POLICY IF EXISTS "Users can read all categories" ON categories;
CREATE POLICY "Users can read all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for categories_items
DROP POLICY IF EXISTS "Users can read all categories_items" ON categories_items;
CREATE POLICY "Users can read all categories_items"
  ON categories_items FOR SELECT
  TO authenticated
  USING (true);

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
