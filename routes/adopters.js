const express = require('express');
const router = express.Router();
const Adopter = require('../models/Adopter');

// List all adopters
router.get('/', async (req, res) => {
    const adopters = await Adopter.find();
    res.render('adopters', { adopters });
});

// Show Add Adopter Form
router.get('/add', (req, res) => {
    res.render('adopter-form', { adopter: null });
});

// Handle Add Adopter POST
router.post('/add', async (req, res) => {
    const { adopter_id, name, contact, adopted_pet_count, notes } = req.body;

    await Adopter.create({
        adopter_id,
        name,
        contact: contact || "",
        adopted_pet_count: adopted_pet_count || 0,
        notes: notes || ""
    });

    res.redirect('/adopters');
});

// Show Edit Adopter Form
router.get('/edit/:id', async (req, res) => {
    const adopter = await Adopter.findById(req.params.id);
    res.render('adopter-form', { adopter });
});

// Handle Edit Adopter POST
router.post('/edit/:id', async (req, res) => {
    const { adopter_id, name, contact, adopted_pet_count, notes } = req.body;

    await Adopter.findByIdAndUpdate(req.params.id, {
        adopter_id,
        name,
        contact: contact || "",
        adopted_pet_count: adopted_pet_count || 0,
        notes: notes || ""
    });

    res.redirect('/adopters');
});

// Delete Adopter
router.post('/delete/:id', async (req, res) => {
    await Adopter.findByIdAndDelete(req.params.id);
    res.redirect('/adopters');
});

module.exports = router;
