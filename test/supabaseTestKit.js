const { createClient } = require('@supabase/supabase-js');

const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

function serviceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
}

function anonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, CLIENT_OPTIONS);
}

async function newPlayer() {
  const client = anonClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return { client, userId: data.user.id, accessToken: data.session.access_token };
}

module.exports = { serviceClient, anonClient, newPlayer };
