const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  const email = 'admin@example.com'; // Replace with a real email
  const password = 'admin123'; // Replace with a secure password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existing = await knex('users').where({ email }).first();
  if (existing) return console.log('Admin already exists');

  await knex('users').insert({
    email,
    password: hashedPassword,
    is_admin: true, // Mark as admin
  });

  console.log('✅ First admin user created!');
};
