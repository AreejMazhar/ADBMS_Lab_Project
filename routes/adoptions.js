const express = require('express');
const router = express.Router();
const Adoption = require('../models/AdoptionRecord');
const Pet = require('../models/Pet');
const Adopter = require('../models/Adopter');

// List all adoptions
router.get('/', async (req, res) => {
    const adoptions = await Adoption.find();
    const populated = await Promise.all(adoptions.map(async record => {
        const pet = await Pet.findById(record.pet_id);
        const adopter = await Adopter.findById(record.adopter_id);
        return {
            _id: record._id,
            record_id: record.record_id,
            pet_name: pet ? pet.name : "Unknown",
            adopter_name: adopter ? adopter.name : "Unknown",
            adoption_date: record.adoption_date,
            comments: record.comments || ""
        };
    }));
    res.render('adoptions', { adoptions: populated });
});

// Show Add Adoption Form
router.get('/add', async (req, res) => {
    const pets = await Pet.find({ available: true });
    const adopters = await Adopter.find();
    res.render('adoption-form', { adoption: null, pets, adopters });
});

// Handle Add Adoption POST
router.post('/add', async (req, res) => {
    const { record_id, pet_id, adopter_id, adoption_date, comments } = req.body;

    await Adoption.create({
        record_id,
        pet_id,
        adopter_id,
        adoption_date,
        comments: comments || ""
    });

    await Pet.findByIdAndUpdate(pet_id, { available: false });

    res.redirect('/adoptions');
});

// Show Edit Adoption Form
router.get('/edit/:id', async (req, res) => {
    const adoption = await Adoption.findById(req.params.id);
    const pets = await Pet.find({ available: true });
    const adopters = await Adopter.find();
    res.render('adoption-form', { adoption, pets, adopters });
});

// Handle Edit Adoption POST
router.post('/edit/:id', async (req, res) => {
    const { record_id, pet_id, adopter_id, adoption_date, comments } = req.body;

    await Adoption.findByIdAndUpdate(req.params.id, {
        record_id,
        pet_id,
        adopter_id,
        adoption_date,
        comments: comments || ""
    });

    res.redirect('/adoptions');
});

// Delete Adoption
router.post('/delete/:id', async (req, res) => {
    await Adoption.findByIdAndDelete(req.params.id);
    res.redirect('/adoptions');
});

module.exports = router;
