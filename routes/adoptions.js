const express = require('express');
const router = express.Router();
const Adoption = require('../models/AdoptionRecord');
const Pet = require('../models/Pet');
const Adopter = require('../models/Adopter');

// Helper: generate next Record ID (R001, R002...)
async function getNextRecordId() {
    const lastRecord = await Adoption.findOne().sort({ record_id: -1 });
    if (!lastRecord) return "R001";
    const num = parseInt(lastRecord.record_id.slice(1)) + 1;
    return `R${num.toString().padStart(3, "0")}`;
}

// List all adoptions
router.get('/', async (req, res) => {
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
    res.render('adoptions', { adoptions: populated });
});

// Show Add Adoption Form
router.get('/add', async (req, res) => {
    const pets = await Pet.find({ available: true }).lean();

    // If no pets are available, show alert and redirect
    if (pets.length === 0) {
        return res.send('<script>alert("No pets are available for adoption!"); window.location.href="/adoptions";</script>');
    }

    const adopters = await Adopter.find().lean();
    const nextId = await getNextRecordId();
    res.render('adoption-form', { adoption: null, pets, adopters, nextId });
});

// Handle Add Adoption POST
router.post('/add', async (req, res) => {
    const { record_id, pet_id, adopter_id, adoption_date, comments } = req.body;

    // Mark selected pet as unavailable
    await Pet.findOneAndUpdate({ pet_id }, { available: false });

    // Create adoption record
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

// Show Edit Adoption Form
router.get('/edit/:id', async (req, res) => {
    const adoption = await Adoption.findById(req.params.id);

    // Fetch available pets and the current pet (to keep it selectable)
    const availablePets = await Pet.find({ available: true }).lean();
    const currentPet = await Pet.find({ pet_id: adoption.pet_id }).lean();
    const pets = [...availablePets, ...currentPet.filter(p => !availablePets.some(ap => ap.pet_id === p.pet_id))];

    const adopters = await Adopter.find().lean();
    res.render('adoption-form', { adoption, pets, adopters, nextId: null });
});

// Handle Edit Adoption POST
router.post('/edit/:id', async (req, res) => {
    const { pet_id, adopter_id, adoption_date, comments } = req.body;
    const adoption = await Adoption.findById(req.params.id);

    // Update pet availability if changed
    if (adoption.pet_id !== pet_id) {
        await Pet.findOneAndUpdate({ pet_id: adoption.pet_id }, { available: true });
        await Pet.findOneAndUpdate({ pet_id }, { available: false });
    }

    // Update adopter counts if changed
    if (adoption.adopter_id !== adopter_id) {
        // Decrement old adopter
        await Adopter.findOneAndUpdate(
            { adopter_id: adoption.adopter_id },
            { $inc: { adopted_pet_count: -1 } }
        );
        // Increment new adopter
        await Adopter.findOneAndUpdate(
            { adopter_id },
            { $inc: { adopted_pet_count: 1 } }
        );
    }

    // Update adoption record
    await Adoption.findByIdAndUpdate(req.params.id, {
        pet_id,
        adopter_id,
        adoption_date,
        comments: comments || ""
    });

    res.redirect('/adoptions');
});

// Delete Adoption
router.post('/delete/:id', async (req, res) => {
    const adoption = await Adoption.findById(req.params.id);
    if (adoption) {
        // Make the pet available again
        await Pet.findOneAndUpdate({ pet_id: adoption.pet_id }, { available: true });
        // Decrement adopter's adopted_pet_count
        await Adopter.findOneAndUpdate(
            { adopter_id: adoption.adopter_id },
            { $inc: { adopted_pet_count: -1 } }
        );
    }
    await Adoption.findByIdAndDelete(req.params.id);
    res.redirect('/adoptions');
});

module.exports = router;