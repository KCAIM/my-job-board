const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const knex = require('knex')(require('../knexfile').development);

// ------------------------
// Signup
// ------------------------
router.get('/signup', (req, res) => {
  // Pass locals automatically by middleware in app.js
  res.render('signup');
});

router.post('/signup', async (req, res, next) => { // Added next
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    req.session.error_msg = 'Email and password are required.';
    return res.redirect('/signup');
  }
  // Add more validation (e.g., password complexity, email format)

  try {
    // Check if user already exists
    const existingUser = await knex('users').where({ email }).first();
    if (existingUser) {
      req.session.error_msg = 'User with this email already exists.';
      return res.redirect('/signup');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await knex('users').insert({ email, password: hashedPassword, is_admin: false }); // Default is_admin to false

    req.session.success_msg = 'Signup successful! Please log in.'; // Success message
    res.redirect('/login');

  } catch (err) {
    console.error("Signup Error:", err);
    // Use session for error message
    req.session.error_msg = 'Signup failed due to a server error.';
    res.redirect('/signup'); // Redirect back to signup on error
    // Or pass to global error handler: next(err);
  }
});

// ------------------------
// Login
// ------------------------
router.get('/login', (req, res) => {
  // Pass locals automatically
  res.render('login');
});

router.post('/login', async (req, res, next) => { // Added next
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.error_msg = 'Email and password are required.';
    return res.redirect('/login');
  }

  try {
    const user = await knex('users').where({ email }).first();

    if (user && await bcrypt.compare(password, user.password)) {
      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) return next(err);

        // Store user info in session
        req.session.userId = user.id;
        req.session.is_admin = user.is_admin; // Store admin status

        // Redirect to admin page if admin, otherwise homepage
        res.redirect(user.is_admin ? '/admin' : '/');
      });
    } else {
      req.session.error_msg = 'Invalid email or password.';
      res.redirect('/login');
    }
  } catch (error) {
    console.error("Login Error:", error);
    next(error); // Pass error to global handler
  }
});

// ------------------------
// Logout
// ------------------------
router.get('/logout', (req, res, next) => { // Added next
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return next(err); // Pass error to global handler
    }
    res.redirect('/'); // Redirect to homepage after logout
  });
});

// ------------------------
// Password Reset
// ------------------------

// Show reset form
router.get('/reset-password', (req, res) => {
  // Pass locals automatically
  res.render('reset-password');
});

// Handle reset form submission (Simulated - No actual email sending)
router.post('/reset-password', async (req, res, next) => { // Added next
  const { email } = req.body;

  if (!email) {
    req.session.error_msg = 'Email is required.';
    return res.redirect('/reset-password');
  }

  try {
    const user = await knex('users').where({ email }).first();

    if (!user) {
      // Still show a generic success message to prevent email enumeration
      req.session.success_msg = 'If an account with that email exists, instructions to reset your password have been simulated.';
      return res.redirect('/reset-password');
    }

    // In a real app, you'd generate a token, save it, send an email with a link like /reset-password/:token
    // For simulation, we just go straight to the new password form
    // Pass email to the view (or ideally use a token later)
    res.render('new-password', { email });

  } catch (error) {
    console.error("Reset Password Request Error:", error);
    next(error); // Pass error to global handler
  }
});

// Show new password form (Accessed via simulated link or directly)
// GET route might be needed if using tokens: router.get('/new-password/:token', ...)
// For simulation, we rely on the POST from /reset-password rendering it.

// Handle new password submission
router.post('/new-password/:email', async (req, res, next) => { // Added next
  const { email } = req.params; // Get email from URL (less secure than token)
  const { password } = req.body;

  // Basic validation
  if (!password) {
    req.session.error_msg = 'Password cannot be empty.';
    // Redirect back to the form - need to pass email again or use token
    // For simplicity, redirecting to login might be okay here too
    return res.redirect('/login'); // Or handle more gracefully
  }
  // Add password complexity validation if desired

  try {
    const hashed = await bcrypt.hash(password, 10);
    const updatedCount = await knex('users').where({ email }).update({ password: hashed });

    if (updatedCount === 0) {
      // Handle case where user email might not exist anymore
      req.session.error_msg = 'Could not update password. User not found.';
      return res.redirect('/reset-password'); // Redirect back to initial reset request
    }

    // *** Set success message in session ***
    req.session.success_msg = 'Password updated successfully! Please log in.';

    // *** Redirect to the login page ***
    res.redirect('/login');

  } catch (error) {
    console.error("Error updating password:", error);
    // Set a generic error message
    req.session.error_msg = 'An error occurred while updating your password.';
    // Redirect to login or reset page on error
    res.redirect('/login');
    // Or pass to global error handler: next(error);
  }
});

module.exports = router;
