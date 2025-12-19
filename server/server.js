// Load environment variables from .env file (e.g., MONGO_URI, PORT)
require('dotenv').config();

// Import required libraries
const express = require('express');  // Web framework for handling HTTP requests/responses
const mongoose = require('mongoose'); // MongoDB object modeling for Node.js
const path = require('path');        // Node.js module to handle file paths

const app = express(); // Initialize the Express app

// =====================
// Middleware
// =====================

// Parse URL-encoded form data (from HTML forms) and populate req.body
app.use(express.urlencoded({ extended: true }));

// Parse JSON payloads from requests and populate req.body
app.use(express.json());

// Set EJS as the template engine to render HTML views
app.set('view engine', 'ejs');

// Set the folder where EJS templates are located
app.set('views', path.join(__dirname, '../views'));

// Serve static files (CSS, JS, images) from the "public" directory
app.use(express.static('public'));

// =====================
// MongoDB Connection
// =====================

// Connect to MongoDB Atlas using the connection string from .env
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas')) // On success
    .catch(err => console.error('MongoDB connection error:', err)); // On failure

// =====================
// Import Route Files
// =====================

const petRoutes = require('../routes/pets');
const adopterRoutes = require('../routes/adopters');
const adoptionRoutes = require('../routes/adoptions');
const reportRoutes = require('../routes/reports');
const medicalRecordRoutes = require('../routes/medicalrecords');

// =====================
// Use Routes
// =====================

// Routes starting with /pets will be handled by petRoutes
app.use('/pets', petRoutes);

// Routes starting with /adopters will be handled by adopterRoutes
app.use('/adopters', adopterRoutes);

// Routes starting with /adoptions will be handled by adoptionRoutes
app.use('/adoptions', adoptionRoutes);

// Routes starting with /reports will be handled by reportRoutes
app.use('/reports', reportRoutes);

// Routes starting with /medicalrecords will be handled by medicalRecordRoutes
app.use('/medicalrecords', medicalRecordRoutes);

// =====================
// Home Route
// =====================

// Render the homepage (index.ejs) when visiting "/"
app.get('/', (req, res) => {
    res.render('index', { page: 'home' });
});

// =====================
// Start Server
// =====================

// Get PORT from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Start listening for incoming requests
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
