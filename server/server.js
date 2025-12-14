// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import Routes
const petRoutes = require('../routes/pets');
const adopterRoutes = require('../routes/adopters');
const adoptionRoutes = require('../routes/adoptions');
const reportRoutes = require('../routes/reports');

// Use Routes
app.use('/pets', petRoutes);
app.use('/adopters', adopterRoutes);
app.use('/adoptions', adoptionRoutes);
app.use('/reports', reportRoutes);

// Home Route
app.get('/', (req, res) => {
    res.render('index');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
