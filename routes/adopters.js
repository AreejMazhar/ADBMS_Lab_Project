// Import Express library to create routes
const express = require('express');
// Create a router object to define modular routes for adopters
const router = express.Router();

// Import Adopter model to interact with MongoDB adopters collection
const Adopter = require('../models/Adopter');

// Helper function to generate the next Adopter ID (A001, A002...)
async function getNextAdopterId() {
    // Find the last added adopter sorted by adopter_id descending
    const lastAdopter = await Adopter.findOne().sort({ adopter_id: -1 });
    // If no adopter exists yet, start with "A001"
    if (!lastAdopter) return "A001";
    // Extract numeric part, increment by 1, and pad with zeros
    const num = parseInt(lastAdopter.adopter_id.slice(1)) + 1;
    return `A${num.toString().padStart(3, "0")}`;
}

// Route: List all adopters
router.get('/', async (req, res) => {
    // Fetch all adopters from database
    const adopters = await Adopter.find();
    // Render 'adopters' template with the adopters array
    res.render('adopters', {
        page: 'adopters',
        adopters,
        error: req.query.error || null  // Show error message if any
    });
});

// Route: Show Add Adopter Form
router.get('/add', async (req, res) => {
    // Generate the next available adopter ID
    const nextId = await getNextAdopterId();
    // Render 'adopter-form' template with empty data
    res.render('adopter-form', { 
        page: 'adopters', 
        adopter: null,
        nextId,
        error: req.query.error || null
    });
});

// Route: Handle Add Adopter Form Submission
router.post('/add', async (req, res) => {
    try {
        const { adopter_id, name, phone, email, notes } = req.body;

        // Check if phone already exists in database
        const phoneExists = await Adopter.findOne({ phone });
        if (phoneExists) {
            return res.redirect(`/adopters/add?error=${encodeURIComponent('Phone number already exists')}`);
        }

        // Check email uniqueness if provided
        if (email) {
            const emailExists = await Adopter.findOne({ email });
            if (emailExists) {
                return res.redirect(`/adopters/add?error=${encodeURIComponent('Email already exists')}`);
            }
        }

        // Create new adopter document in MongoDB
        await Adopter.create({
            adopter_id,
            name,
            phone,
            email: email || "",           // Default to empty string if not provided
            adopted_pet_count: 0,         // New adopter starts with 0 pets
            notes: notes || ""            // Optional notes
        });

        // Redirect to adopters list after successful addition
        res.redirect('/adopters');
    } catch (err) {
        console.error(err);
        res.redirect(`/adopters/add?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Route: Show Edit Adopter Form
router.get('/edit/:id', async (req, res) => {
    // Find adopter by MongoDB _id
    const adopter = await Adopter.findById(req.params.id);
    // Render 'adopter-form' with existing adopter data
    res.render('adopter-form', { 
        page: 'adopters', 
        adopter,
        nextId: null,  // No new ID needed when editing
        error: req.query.error || null
    });
});

// Route: Handle Edit Adopter Form Submission
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, phone, email, notes } = req.body;
        const adopterId = req.params.id;  // MongoDB _id of the adopter

        // Validate phone uniqueness excluding current adopter
        const phoneExists = await Adopter.findOne({ phone, _id: { $ne: adopterId } });
        if (phoneExists) {
            return res.redirect(`/adopters/edit/${adopterId}?error=${encodeURIComponent('Phone number already exists')}`);
        }

        // Validate email uniqueness if provided, excluding current adopter
        if (email) {
            const emailExists = await Adopter.findOne({ email, _id: { $ne: adopterId } });
            if (emailExists) {
                return res.redirect(`/adopters/edit/${adopterId}?error=${encodeURIComponent('Email already exists')}`);
            }
        }

        // Update adopter document in MongoDB
        await Adopter.findByIdAndUpdate(adopterId, {
            name,
            phone,
            email: email || "",
            notes: notes || ""
        });

        // Redirect to adopters list after update
        res.redirect('/adopters');
    } catch (err) {
        console.error(err);
        res.redirect(`/adopters/edit/${req.params.id}?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Route: Delete Adopter
// Import Adoption model to check if adopter has adoption records
const Adoption = require('../models/AdoptionRecord');

router.post('/delete/:id', async (req, res) => {
    // Find adopter by MongoDB _id
    const adopter = await Adopter.findById(req.params.id);
    if (!adopter) return res.redirect('/adopters'); // Redirect if not found

    // Check if adopter has any adoption records
    const hasAdoptions = await Adoption.findOne({ adopter_id: adopter.adopter_id });
    if (hasAdoptions) {
        return res.redirect('/adopters?error=Adopter has adoption records and cannot be deleted');
    }

    // Delete adopter document from MongoDB
    await Adopter.findByIdAndDelete(req.params.id);
    // Redirect to adopters list
    res.redirect('/adopters');
});

// Export router to use in server.js
module.exports = router;