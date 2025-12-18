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

    // Create unique species list for filter safely
    const speciesList = pets.length
        ? [...new Set(pets.map(p => p.species).filter(Boolean))].sort()
        : [];

    res.render('pets', {
        page: 'pets',
        pets,
        speciesList, // pass it to EJS
        error: req.query.error || null
    });
});

// Show Add Pet Form
router.get('/add', async (req, res) => {
    const nextId = await getNextPetId();
    res.render('pet-form', {
        page: 'pets',
        pet: null,
        nextId
    });
});


// Handle Add Pet POST
router.post('/add', async (req, res) => {
    const { pet_id, name, species, breed, age, available, microchip } = req.body;
    await Pet.create({
        pet_id,
        name,
        species,
        breed,
        age,
        available: available === 'on',
        microchip: microchip || ""
    });
    res.redirect('/pets');
});

// Show Edit Pet Form
router.get('/edit/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    res.render('pet-form', {
        page: 'pets',
        pet,
        nextId: null
    });
});


// Handle Edit Pet POST
router.post('/edit/:id', async (req, res) => {
    const { name, species, breed, age, available, microchip } = req.body;
    await Pet.findByIdAndUpdate(req.params.id, {
        name,
        species,
        breed,
        age,
        available: available === 'on',
        microchip: microchip || ""
    });
    res.redirect('/pets');
});

// Delete Pet
const Adoption = require('../models/AdoptionRecord');

router.post('/delete/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.redirect('/pets');

    // Check if pet is used in any adoption
    const hasAdoptions = await Adoption.findOne({ pet_id: pet.pet_id });

    if (hasAdoptions) {
        return res.redirect(`/pets?error=${encodeURIComponent('Pet has adoption records and cannot be deleted')}`);
    }

    await Pet.findByIdAndDelete(req.params.id);
    res.redirect('/pets');
});

module.exports = router;
