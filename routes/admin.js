// admin creation route for logged-in admins
router.post('/admin/create', async (req, res) => {
    // Check if logged-in user is admin
    if (!req.session.userId || !req.session.is_admin) {
      return res.status(403).send('Unauthorized');
    }
  
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
  
    try {
      await knex('users').insert({
        email,
        password: hashedPassword,
        is_admin: true, // Mark the new user as an admin
      });
      res.redirect('/admin');
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to create admin');
    }
  });
// Protecting the admin dashboard route
router.get('/admin', isAdmin, async (req, res) => {
    const jobs = await knex('jobs').select('*');
    const applications = await knex('job_applications').select('*');
    res.render('admin', { jobs, applications });
  });
    