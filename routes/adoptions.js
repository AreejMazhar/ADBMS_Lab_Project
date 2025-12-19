// Import Express to create routes
const express = require('express');
// Create a router object
const router = express.Router();

// Import models for CRUD operations
const Adoption = require('../models/AdoptionRecord');
const Pet = require('../models/Pet');
const Adopter = require('../models/Adopter');

// Helper: generate next adoption record ID (R001, R002...)
async function getNextRecordId() {
    // Find the last adoption record, sorted by record_id descending
    const lastRecord = await Adoption.findOne().sort({ record_id: -1 });
    if (!lastRecord) return "R001"; // Start from R001 if no record exists
    // Increment numeric part and pad with zeros
    const num = parseInt(lastRecord.record_id.slice(1)) + 1;
    return `R${num.toString().padStart(3, "0")}`;
}

// Route: List all adoptions
router.get('/', async (req, res) => {
    const adoptions = await Adoption.find();

    // Populate pet_name and adopter_name for display
    const populated = await Promise.all(adoptions.map(async record => {
        const pet = await Pet.findOne({ pet_id: record.pet_id });
        const adopter = await Adopter.findOne({ adopter_id: record.adopter_id });
        return {
            _id: record._id,
            record_id: record.record_id,
            pet_name: pet ? pet.name : "-",
            adopter_name: adopter ? adopter.name : "-",
            adoption_date: record.adoption_date,
            comments: record.comments || "-"
        };
    }));

    res.render('adoptions', {
        page: 'adoptions',
        adoptions: populated,
        error: req.query.error || null
    });
});

// Route: Show Add Adoption Form
router.get('/add', async (req, res) => {
    const pets = await Pet.find({ available: true }).lean(); // Only available pets
    const adopters = await Adopter.find().lean();
    const nextId = await getNextRecordId();

    // If no available pets, show adoptions list with error
    if (pets.length === 0) {
        const adoptions = await Adoption.find();
        const populated = await Promise.all(adoptions.map(async record => {
            const pet = await Pet.findOne({ pet_id: record.pet_id });
            const adopter = await Adopter.findOne({ adopter_id: record.adopter_id });
            return {
                _id: record._id,
                record_id: record.record_id,
                pet_name: pet ? pet.name : "-",
                adopter_name: adopter ? adopter.name : "-",
                adoption_date: record.adoption_date,
                comments: record.comments || "-"
            };
        }));

        return res.render('adoptions', {
            page: 'adoptions',
            adoptions: populated,
            error: 'No available pets. Please add pets or mark one as available first.'
        });
    }

    // Normal case: show add form
    res.render('adoption-form', { page: 'adoptions', adoption: null, pets, adopters, nextId });
});

// Route: Handle Add Adoption POST
router.post('/add', async (req, res) => {
    const { record_id, pet_id, adopter_id, adoption_date, comments } = req.body;

    // Mark selected pet as unavailable
    await Pet.findOneAndUpdate({ pet_id }, { available: false });

    // Create new adoption record
    await Adoption.create({
        record_id,
        pet_id,
        adopter_id,
        adoption_date,
        comments: comments || ""
    });

    // Increment adopter's adopted_pet_count
    await Adopter.findOneAndUpdate(
        { adopter_id },
        { $inc: { adopted_pet_count: 1 } }
    );

    res.redirect('/adoptions');
});

// Route: Show Edit Adoption Form
router.get('/edit/:id', async (req, res) => {
    const adoption = await Adoption.findById(req.params.id);

    // Fetch available pets plus current pet (even if unavailable)
    const availablePets = await Pet.find({ available: true }).lean();
    const currentPet = await Pet.find({ pet_id: adoption.pet_id }).lean();
    const pets = [...availablePets, ...currentPet.filter(p => !availablePets.some(ap => ap.pet_id === p.pet_id))];

    const adopters = await Adopter.find().lean();

    res.render('adoption-form', { page: 'adoptions', adoption, pets, adopters, nextId: null });
});

// Route: Handle Edit Adoption POST
router.post('/edit/:id', async (req, res) => {
    const { pet_id, adopter_id, adoption_date, comments } = req.body;
    const adoption = await Adoption.findById(req.params.id);

    // Update pet availability if pet changed
    if (adoption.pet_id !== pet_id) {
        await Pet.findOneAndUpdate({ pet_id: adoption.pet_id }, { available: true }); // old pet available
        await Pet.findOneAndUpdate({ pet_id }, { available: false }); // new pet unavailable
    }

    // Update adopter counts if adopter changed
    if (adoption.adopter_id !== adopter_id) {
        await Adopter.findOneAndUpdate(
            { adopter_id: adoption.adopter_id },
            { $inc: { adopted_pet_count: -1 } } // decrement old adopter
        );
        await Adopter.findOneAndUpdate(
            { adopter_id },
            { $inc: { adopted_pet_count: 1 } } // increment new adopter
        );
    }

    // Update adoption record in database
    await Adoption.findByIdAndUpdate(req.params.id, {
        pet_id,
        adopter_id,
        adoption_date,
        comments: comments || ""
    });

    res.redirect('/adoptions');
});

// Route: Delete Adoption
router.post('/delete/:id', async (req, res) => {
    const adoption = await Adoption.findById(req.params.id);
    if (adoption) {
        // Make pet available again
        await Pet.findOneAndUpdate({ pet_id: adoption.pet_id }, { available: true });
        // Decrement adopter's adopted_pet_count
        await Adopter.findOneAndUpdate(
            { adopter_id: adoption.adopter_id },
            { $inc: { adopted_pet_count: -1 } }
        );
    }
    // Delete adoption record
    await Adoption.findByIdAndDelete(req.params.id);
    res.redirect('/adoptions');
});

// Export router to use in server.js
module.exports = router;
