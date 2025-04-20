// Import required packages
const express = require('express');
const path = require('path');
// const bodyParser = require('body-parser'); // No longer needed for urlencoded
const session = require('express-session');

// Create the app
const app = express();

// --- Middleware ---

// Serve static files (CSS, JS, images) from the 'public' directory
// This line handles serving your styles.css if it's in public/css/styles.css
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from the 'uploads' directory under the /uploads path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parse JSON request bodies (good practice)
app.use(express.json());
// Parse URL-encoded request bodies (using the built-in Express middleware)
app.use(express.urlencoded({ extended: true }));

// Session configuration (MUST come before custom message middleware)
app.use(session({
  secret: 'your-secret-key', // Replace this with a secure key in production
  resave: false,
  saveUninitialized: false,
  // Consider adding cookie settings for security in production:
  // cookie: { secure: false, httpOnly: true } // Set secure: true if using HTTPS
}));

// --- View Engine Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Global Variables for Views ---
// Custom middleware to handle session messages and make session available
app.use((req, res, next) => {
  // Make session object available
  res.locals.session = req.session;

  // Check for success message in session
  if (req.session.success_msg) {
    res.locals.success_msg = req.session.success_msg; // Move to locals
    delete req.session.success_msg; // Delete from session so it only shows once
  }

  // Check for error message in session (optional)
  if (req.session.error_msg) {
    res.locals.error_msg = req.session.error_msg; // Move to locals
    delete req.session.error_msg; // Delete from session so it only shows once
  }

  next();
});


// --- Route Imports ---
const jobsRouter = require('./routes/jobs');
const authRouter = require('./routes/auth');

// --- Use Routes ---
app.use('/', jobsRouter);
app.use('/', authRouter);

// --- Server Start ---
const PORT = 3000; // Port is hardcoded here
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// --- Basic Error Handling ---
// Add a simple error handler at the end
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Optional: Set error message in session before redirecting
  req.session.error_msg = 'Something went wrong!';
  res.status(500).redirect('back'); // Redirect back or send a generic error
});
