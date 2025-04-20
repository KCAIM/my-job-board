/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('jobs', function(table) {
        table.increments('id').primary();
        table.string('title');
        table.string('company');
        table.string('location');
        table.string('salary');
        table.text('requirements');
        table.timestamps(true, true);
      }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('jobs'); 
};
