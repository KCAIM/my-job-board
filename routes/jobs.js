const express = require('express');
const router = express.Router();
const knex = require('knex')(require('../knexfile').development);
const multer = require('multer');
const path = require('path');

// ----------------- Admin Middleware -----------------
function isAdmin(req, res, next) {
  // Check if session exists and user is logged in and is an admin
  if (req.session && req.session.userId && req.session.is_admin) {
    return next(); // User is admin, proceed
  }
  // If not admin, set an error message and redirect (optional, but user-friendly)
  // req.session.error_msg = 'You must be an admin to access this page.';
  res.redirect('/'); // Redirect non-admins to the homepage
}

// ----------------- Multer Config -----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the uploads directory exists
    const uploadPath = path.join(__dirname, '..', 'uploads');
    // Consider adding fs.mkdirSync(uploadPath, { recursive: true }); here if needed
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
// Add file filter for security (optional but recommended)
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype === 'application/pdf' || file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
//   }
// };
const upload = multer({
  storage: storage,
  // fileFilter: fileFilter, // Uncomment to enable file filter
  // limits: { fileSize: 5 * 1024 * 1024 } // Example: Limit file size to 5MB
});

// ----------------- Job Listings -----------------

// GET / - Display all job listings (Homepage)
router.get('/', async (req, res, next) => { // Added next for error handling
  try {
    const jobs = await knex('jobs').select('*').orderBy('created_at', 'desc'); // Fetch jobs, maybe order them
    // Pass necessary locals from app.js middleware automatically
    res.render('index', { jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    next(error); // Pass error to the global error handler
  }
});

// GET /post - Display the form to post a new job
router.get('/post', (req, res) => {
  // Check if user is logged in (optional, depends on requirements)
  // if (!req.session.userId) {
  //   req.session.error_msg = 'You must be logged in to post a job.';
  //   return res.redirect('/login');
  // }
  res.render('post'); // Pass necessary locals automatically
});

// POST /post - Handle submission of a new job posting
router.post('/post', async (req, res, next) => { // Added next
  // Add input validation here (e.g., using express-validator)
  const { title, company, location, salary, requirements } = req.body;
  // Basic check for required fields
  if (!title || !company || !location) {
      req.session.error_msg = 'Title, Company, and Location are required.';
      return res.redirect('/post'); // Redirect back to the form
  }
  try {
    await knex('jobs').insert({ title, company, location, salary, requirements });
    req.session.success_msg = 'Job posted successfully!'; // Success message
    res.redirect('/');
  } catch (error) {
    console.error("Error posting job:", error);
    next(error); // Pass error to the global error handler
  }
});

// GET /jobs/:id - Display details for a specific job
router.get('/jobs/:id', async (req, res, next) => { // Added next
  try {
    const job = await knex('jobs').where('id', req.params.id).first();
    if (!job) {
      // If job not found, maybe show a 404 page or redirect with message
      req.session.error_msg = 'Job not found.';
      return res.redirect('/');
    }
    res.render('job', { job }); // Pass necessary locals automatically
  } catch (error) {
    console.error("Error fetching job details:", error);
    next(error); // Pass error to the global error handler
  }
});

// GET /jobs/:id/edit - Show form to edit a job (Consider adding auth/admin check)
router.get('/jobs/:id/edit', async (req, res, next) => { // Added next
  // Add authorization check: is user allowed to edit this job?
  try {
    const job = await knex('jobs').where('id', req.params.id).first();
    if (!job) {
      req.session.error_msg = 'Job not found.';
      return res.redirect('/');
    }
    res.render('edit', { job }); // Pass necessary locals automatically
  } catch (error) {
    console.error("Error fetching job for edit:", error);
    next(error); // Pass error to the global error handler
  }
});

// POST /jobs/:id/edit - Handle submission of job edits (Consider adding auth/admin check)
router.post('/jobs/:id/edit', async (req, res, next) => { // Added next
  // Add authorization check
  // Add input validation
  const { title, company, location, salary, requirements } = req.body; // Include all editable fields
  if (!title || !company || !location) {
      req.session.error_msg = 'Title, Company, and Location are required.';
      // Fetch job again to pass to render or redirect back
      return res.redirect(`/jobs/${req.params.id}/edit`);
  }
  try {
    const updatedCount = await knex('jobs')
      .where('id', req.params.id)
      .update({ title, company, location, salary, requirements }); // Update all fields

    if (updatedCount === 0) {
        req.session.error_msg = 'Job not found or could not be updated.';
        return res.redirect('/');
    }
    req.session.success_msg = 'Job updated successfully!';
    res.redirect(`/jobs/${req.params.id}`);
  } catch (error) {
    console.error("Error updating job:", error);
    next(error); // Pass error to the global error handler
  }
});

// POST /jobs/:id/delete - Handle job deletion (Consider adding auth/admin check)
router.post('/jobs/:id/delete', async (req, res, next) => { // Added next
  // Add authorization check
  try {
    const deletedCount = await knex('jobs').where('id', req.params.id).del();
     if (deletedCount === 0) {
        req.session.error_msg = 'Job not found or could not be deleted.';
        return res.redirect('/');
    }
    // Also consider deleting related applications:
    // await knex('job_applications').where('job_id', req.params.id).del();
    req.session.success_msg = 'Job deleted successfully!';
    res.redirect('/');
  } catch (error) {
    console.error("Error deleting job:", error);
    next(error); // Pass error to the global error handler
  }
});

// ----------------- Admin-only Job & App Deletion -----------------
// These seem okay, but ensure they are correctly placed if admin routes are separate

router.post('/admin/jobs/:id/delete', isAdmin, async (req, res, next) => { // Added next
  try {
    const deletedCount = await knex('jobs').where('id', req.params.id).del();
    if (deletedCount === 0) {
        req.session.error_msg = 'Job not found.';
        return res.redirect('/admin'); // Redirect back to admin page
    }
     // Also consider deleting related applications:
    // await knex('job_applications').where('job_id', req.params.id).del();
    req.session.success_msg = 'Job deleted successfully by admin.';
    res.redirect('/admin');
  } catch (err) {
    console.error('Error deleting job by admin:', err);
    // Use session for error message
    req.session.error_msg = 'Failed to delete job.';
    res.redirect('/admin'); // Redirect back to admin page
    // Or pass to global error handler: next(err);
  }
});

router.post('/admin/applications/:id/delete', isAdmin, async (req, res, next) => { // Added next
  try {
    // Optional: Delete associated resume file from 'uploads' folder first
    // const appToDelete = await knex('job_applications').where('id', req.params.id).first();
    // if (appToDelete && appToDelete.resume_path) {
    //   const filePath = path.join(__dirname, '..', 'uploads', appToDelete.resume_path);
    //   fs.unlink(filePath, (err) => { if (err) console.error("Error deleting resume file:", err); });
    // }

    const deletedCount = await knex('job_applications').where('id', req.params.id).del();
     if (deletedCount === 0) {
        req.session.error_msg = 'Application not found.';
        return res.redirect('/admin'); // Redirect back to admin page
    }
    req.session.success_msg = 'Application deleted successfully by admin.';
    res.redirect('/admin');
  } catch (err) {
    console.error('Error deleting application by admin:', err);
    req.session.error_msg = 'Failed to delete application.';
    res.redirect('/admin'); // Redirect back to admin page
    // Or pass to global error handler: next(err);
  }
});

// ----------------- Job Applications -----------------

// GET /jobs/:id/apply - Display the application form for a specific job
router.get('/jobs/:id/apply', async (req, res, next) => { // Added next
  try {
    const job = await knex('jobs').where('id', req.params.id).first();
     if (!job) {
      req.session.error_msg = 'Job not found.';
      return res.redirect('/');
    }
    res.render('apply', { job }); // Pass necessary locals automatically
  } catch (error) {
    console.error("Error fetching job for application:", error);
    next(error); // Pass error to the global error handler
  }
});

// POST /jobs/:id/apply - Handle submission of a job application
router.post('/jobs/:id/apply', upload.single('resume'), async (req, res, next) => { // Added next
  const jobId = req.params.id;
  const { name, email, message } = req.body;
  // Add input validation (name, email format, message length etc.)
  if (!name || !email) {
      req.session.error_msg = 'Name and Email are required.';
      // Need to fetch job again if redirecting back to apply form
      return res.redirect(`/jobs/${jobId}/apply`);
  }

  const resume = req.file; // File object from Multer
  const resumePath = resume ? resume.filename : null; // Use the unique filename saved by Multer

  try {
    // Check if job exists before inserting application
    const jobExists = await knex('jobs').where('id', jobId).first();
    if (!jobExists) {
        req.session.error_msg = 'Job does not exist.';
        return res.redirect('/'); // Redirect to homepage if job is gone
    }

    await knex('job_applications').insert({
      job_id: jobId,
      name,
      email,
      message: message || '', // Ensure message is not null if optional
      resume_path: resumePath,
    });

    // *** Set success message in session and redirect ***
    req.session.success_msg = 'Application submitted successfully!';
    res.redirect('/'); // Redirect to homepage

  } catch (error) {
    console.error('Error saving application:', error);
    // *** Set error message in session and redirect back ***
    req.session.error_msg = 'Failed to submit application. Please try again.';
    res.redirect('back'); // Redirect to the previous page (the apply form)
    // Alternatively, pass to global error handler: next(error);
  }
});

// ----------------- Admin Dashboard -----------------
// This route might be better placed in admin.js if you have one

router.get('/admin', isAdmin, async (req, res, next) => { // Added next
  try {
    const jobs = await knex('jobs').select('*').orderBy('created_at', 'desc');
    const applications = await knex('job_applications')
                            .select('job_applications.*', 'jobs.title as job_title') // Select app fields + job title
                            .leftJoin('jobs', 'job_applications.job_id', 'jobs.id') // Join with jobs table
                            .orderBy('job_applications.created_at', 'desc');

    res.render('admin', { jobs, applications }); // Pass necessary locals automatically
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    next(error); // Pass error to the global error handler
  }
});

module.exports = router;
