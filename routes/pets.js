const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');

// Helper: generate next Pet ID (P001, P002...)
async function getNextPetId() {
    const lastPet = await Pet.findOne().sort({ pet_id: -1 });
    if (!lastPet) return "P001";
    const num = parseInt(lastPet.pet_id.slice(1)) + 1;
    return `P${num.toString().padStart(3, "0")}`;
}

// List all pets
router.get('/', async (req, res) => {
    const pets = await Pet.find();
    res.render('pets', { pets });
});

// Show Add Pet Form
router.get('/add', async (req, res) => {
    const nextId = await getNextPetId();
    res.render('pet-form', { pet: null, nextId });
});

// Handle Add Pet POST
router.post('/add', async (req, res) => {
    const { pet_id, name, species, breed, age, available, vaccinations, medical_notes, microchip } = req.body;
    await Pet.create({
        pet_id,
        name,
        species,
        breed,
        age,
        available: available === 'on',
        vaccinations: vaccinations ? vaccinations.split(',').map(s => s.trim()) : [],
        medical_notes: medical_notes || "",
        microchip: microchip || ""
    });
    res.redirect('/pets');
});

// Show Edit Pet Form
router.get('/edit/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    res.render('pet-form', { pet, nextId: null });
});

// Handle Edit Pet POST
router.post('/edit/:id', async (req, res) => {
    const { name, species, breed, age, available, vaccinations, medical_notes, microchip } = req.body;
    await Pet.findByIdAndUpdate(req.params.id, {
        name,
        species,
        breed,
        age,
        available: available === 'on',
        vaccinations: vaccinations ? vaccinations.split(',').map(s => s.trim()) : [],
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