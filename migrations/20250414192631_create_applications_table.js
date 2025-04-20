exports.up = function(knex) {
    return knex.schema.createTable('job_applications', function(table) {
      table.increments('id').primary();
      table.integer('job_id').unsigned().references('id').inTable('jobs').onDelete('CASCADE');
      table.string('name');
      table.string('email');
      table.text('message');
      table.string('resume_path'); // ✅ Include this now
      table.timestamps(true, true);
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('job_applications');
  };
  