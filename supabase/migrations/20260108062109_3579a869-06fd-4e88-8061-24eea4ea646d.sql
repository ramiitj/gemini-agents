-- Create test organization
INSERT INTO organizations (id, name, slug, created_by)
VALUES (
  gen_random_uuid(),
  'Test Organization',
  'test-org',
  'f096d03a-3efc-46e2-956f-f9c36ca292a5'
);

-- Create user role (owner) for the organization
INSERT INTO user_roles (organization_id, user_id, role)
SELECT id, 'f096d03a-3efc-46e2-956f-f9c36ca292a5'::uuid, 'owner'
FROM organizations WHERE slug = 'test-org';

-- Create project with NyaySaathi GitHub repo
INSERT INTO projects (name, organization_id, github_repo, created_by)
SELECT 
  'NyaySaathi',
  id,
  'https://github.com/ramiitj/nyaysaathi',
  'f096d03a-3efc-46e2-956f-f9c36ca292a5'::uuid
FROM organizations WHERE slug = 'test-org';