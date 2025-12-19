// Import Express library to create routes
const express = require('express');
// Create a router object to define modular routes for pets
const router = express.Router();

// Import the Pet model to perform database operations on Pet collection
const Pet = require('../models/Pet');
// Import Adoption model to check if pets are involved in adoption records
const Adoption = require('../models/AdoptionRecord');

// Helper function to generate the next Pet ID (like P001, P002...)
async function getNextPetId() {
    // Find the pet with the highest pet_id
    const lastPet = await Pet.findOne().sort({ pet_id: -1 });
    // If no pets exist yet, start with "P001"
    if (!lastPet) return "P001";
    // Extract numeric part, increment by 1
    const num = parseInt(lastPet.pet_id.slice(1)) + 1;
    // Return new ID padded with zeros (e.g., P006)
    return `P${num.toString().padStart(3, "0")}`;
}

// Route: List all pets
router.get('/', async (req, res) => {
    // Fetch all pets from database
    const pets = await Pet.find();

    // Create a sorted list of unique species for filter dropdown
    const speciesList = pets.length
        ? [...new Set(pets.map(p => p.species).filter(Boolean))].sort()
        : [];

    // Render the 'pets' template and pass necessary data
    res.render('pets', {
        page: 'pets',              // Current page identifier
        pets,                      // Array of pet objects
        speciesList,               // Species filter options
        error: req.query.error || null,  // Error messages from query string
        // Helper function to format age in years and months
        formatAge: function(months) {
            if (months == null || months < 0) return "-";  // Handle invalid age
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;

            let result = "";
            if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
            if (years > 0 && remainingMonths > 0) result += " and ";
            if (remainingMonths > 0) result += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
            if (!result) result = "0 months";  // Default if age is 0

            return result;
        }
    });
});

// Route: Show Add Pet Form
router.get('/add', async (req, res) => {
    // Generate the next available Pet ID
    const nextId = await getNextPetId();
    // Render 'pet-form' with empty pet data
    res.render('pet-form', {
        page: 'pets',
        pet: null,                 // No existing pet data
        nextId,                    // Pre-fill ID in form
        error: req.query.error || null
    });
});

// Route: Handle Add Pet Form Submission
router.post('/add', async (req, res) => {
    try {
        // Extract form input values from req.body
        const { pet_id, name, species, breed, age, available, microchip } = req.body;

        // Validate age: must be a non-negative number
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 0) {
            return res.redirect(`/pets/add?error=${encodeURIComponent('Age cannot be negative')}`);
        }

        // Trim microchip input and check uniqueness if provided
        const trimmedChip = microchip?.trim();
        if (trimmedChip) {
            const existing = await Pet.findOne({ microchip: trimmedChip });
            if (existing) {
                return res.redirect(`/pets/add?error=${encodeURIComponent('Microchip already exists')}`);
            }
        }

        // Create a new pet document in MongoDB (.create is equivalent to .insertOne in MongoDB)
        await Pet.create({
            pet_id,
            name,
            species,
            breed,
            age: parsedAge,
            available: available === 'on',  // Convert checkbox to boolean
            microchip: trimmedChip || ""     // Store empty string if no microchip
        });

        // Redirect to pet list after successful creation
        res.redirect('/pets');
    } catch (err) {
        console.error(err);  // Log errors for debugging
        res.redirect(`/pets/add?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Route: Show Edit Pet Form
router.get('/edit/:id', async (req, res) => {
    // Find the pet by its MongoDB _id
    const pet = await Pet.findById(req.params.id);
    // Check if this pet has any adoption records
    const hasAdoptions = await Adoption.exists({ pet_id: pet.pet_id });

    // Render 'pet-form' with existing pet data
    res.render('pet-form', {
        page: 'pets',
        pet: { ...pet.toObject(), hasAdoptions },  // Merge adoption info
        nextId: null,  // No new ID needed for edit
        error: req.query.error || null
    });
});

// Route: Handle Edit Pet Form Submission
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, species, breed, age, available, microchip } = req.body;
        const petId = req.params.id;  // Get the pet's MongoDB _id

        const pet = await Pet.findById(petId);
        const hasAdoptions = await Adoption.exists({ pet_id: pet.pet_id });

        // Validate age
        const parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 0) {
            return res.redirect(`/pets/edit/${petId}?error=${encodeURIComponent('Age cannot be negative')}`);
        }

        // Check microchip uniqueness, ignoring current pet
        const trimmedChip = microchip?.trim();
        if (trimmedChip) {
            const existing = await Pet.findOne({ microchip: trimmedChip, _id: { $ne: petId } });
            if (existing) {
                return res.redirect(`/pets/edit/${petId}?error=${encodeURIComponent('Microchip already exists')}`);
            }
        }

        // Update pet document in MongoDB
        await Pet.findByIdAndUpdate(petId, {
            name,
            species,
            breed,
            age: parsedAge,
            microchip: trimmedChip || "",
            available: hasAdoptions ? false : (available === 'on')  // Prevent unavailability if adopted
        });

        // Redirect to pet list after successful update
        res.redirect('/pets');
    } catch (err) {
        console.error(err);
        res.redirect(`/pets/edit/${req.params.id}?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Route: Delete Pet
router.post('/delete/:id', async (req, res) => {
    // Find the pet by _id
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.redirect('/pets');  // If pet doesn't exist, redirect

    // Check if the pet has any adoption records
    const hasAdoptions = await Adoption.findOne({ pet_id: pet.pet_id });
    if (hasAdoptions) {
        return res.redirect(`/pets?error=${encodeURIComponent('Pet has adoption records and cannot be deleted')}`);
    }

    // Delete pet from MongoDB
    await Pet.findByIdAndDelete(req.params.id);

    // Redirect to pet list after deletion
    res.redirect('/pets');
});

// Export the router to be used in server.js
module.exports = router;
