const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');

// List all pets
router.get('/', async (req, res) => {
    const pets = await Pet.find();
    res.render('pets', { pets });
});

// Show Add Pet Form
router.get('/add', (req, res) => {
    res.render('pet-form', { pet: null });
});

// Handle Add Pet POST
router.post('/add', async (req, res) => {
    const { pet_id, name, species, breed, age, available, vaccinations, medical_notes, microchip } = req.body;

    await Pet.create({
        pet_id,
        name,
        species: species || "",
        breed: breed || "",
        age: age || null,
        available: available === 'on',
        vaccinations: vaccinations ? vaccinations.split(',').map(v => v.trim()) : [],
        medical_notes: medical_notes || "",
        microchip: microchip || ""
    });

    res.redirect('/pets');
});

// Show Edit Pet Form
router.get('/edit/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    res.render('pet-form', { pet });
});

// Handle Edit Pet POST
router.post('/edit/:id', async (req, res) => {
    const { pet_id, name, species, breed, age, available, vaccinations, medical_notes, microchip } = req.body;

    await Pet.findByIdAndUpdate(req.params.id, {
        pet_id,
        name,
        species: species || "",
        breed: breed || "",
        age: age || null,
        available: available === 'on',
        vaccinations: vaccinations ? vaccinations.split(',').map(v => v.trim()) : [],
        medical_notes: medical_notes || "",
        microchip: microchip || ""
    });

    res.redirect('/pets');
});

// Delete Pet
router.post('/delete/:id', async (req, res) => {
    await Pet.findByIdAndDelete(req.params.id);
    res.redirect('/pets');
});

module.exports = router;