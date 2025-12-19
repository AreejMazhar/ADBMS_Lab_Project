const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const Adoption = require('../models/AdoptionRecord');

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

    const speciesList = pets.length
        ? [...new Set(pets.map(p => p.species).filter(Boolean))].sort()
        : [];

    res.render('pets', {
        page: 'pets',
        pets,
        speciesList,
        error: req.query.error || null,
        formatAge: function(months) {
            if (months == null || months < 0) return "-";
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;

            let result = "";
            if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
            if (years > 0 && remainingMonths > 0) result += " and ";
            if (remainingMonths > 0) result += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
            if (!result) result = "0 months";

            return result;
        }
    });
});

// Show Add Pet Form
router.get('/add', async (req, res) => {
    const nextId = await getNextPetId();
    res.render('pet-form', {
        page: 'pets',
        pet: null,
        nextId,
        error: req.query.error || null
    });
});

// Handle Add Pet POST
router.post('/add', async (req, res) => {
    try {
        const { pet_id, name, species, breed, age, available, microchip } = req.body;

        // Age validation
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 0) {
            return res.redirect(`/pets/add?error=${encodeURIComponent('Age cannot be negative')}`);
        }

        // Microchip uniqueness if provided
        const trimmedChip = microchip?.trim();
        if (trimmedChip) {
            const existing = await Pet.findOne({ microchip: trimmedChip });
            if (existing) {
                return res.redirect(`/pets/add?error=${encodeURIComponent('Microchip already exists')}`);
            }
        }

        await Pet.create({
            pet_id,
            name,
            species,
            breed,
            age: parsedAge,
            available: available === 'on',
            microchip: trimmedChip || ""
        });

        res.redirect('/pets');
    } catch (err) {
        console.error(err);
        res.redirect(`/pets/add?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Show Edit Pet Form
router.get('/edit/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    const hasAdoptions = await Adoption.exists({ pet_id: pet.pet_id });

    res.render('pet-form', {
        page: 'pets',
        pet: { ...pet.toObject(), hasAdoptions },
        nextId: null,
        error: req.query.error || null
    });
});

// Handle Edit Pet POST
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, species, breed, age, available, microchip } = req.body;
        const petId = req.params.id;

        const pet = await Pet.findById(petId);
        const hasAdoptions = await Adoption.exists({ pet_id: pet.pet_id });

        // Age validation
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 0) {
            return res.redirect(`/pets/edit/${petId}?error=${encodeURIComponent('Age cannot be negative')}`);
        }

        // Microchip uniqueness if provided
        const trimmedChip = microchip?.trim();
        if (trimmedChip) {
            const existing = await Pet.findOne({ microchip: trimmedChip, _id: { $ne: petId } });
            if (existing) {
                return res.redirect(`/pets/edit/${petId}?error=${encodeURIComponent('Microchip already exists')}`);
            }
        }

        const updatedData = {
            name,
            species,
            breed,
            age: parsedAge,
            microchip: trimmedChip || "",
            available: hasAdoptions ? false : (available === 'on')
        };

        await Pet.findByIdAndUpdate(petId, updatedData);
        res.redirect('/pets');
    } catch (err) {
        console.error(err);
        res.redirect(`/pets/edit/${req.params.id}?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Delete Pet
router.post('/delete/:id', async (req, res) => {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.redirect('/pets');

    const hasAdoptions = await Adoption.findOne({ pet_id: pet.pet_id });
    if (hasAdoptions) {
        return res.redirect(`/pets?error=${encodeURIComponent('Pet has adoption records and cannot be deleted')}`);
    }

    await Pet.findByIdAndDelete(req.params.id);
    res.redirect('/pets');
});

module.exports = router;