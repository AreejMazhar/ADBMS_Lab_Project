const express = require('express');
const router = express.Router();
const Adopter = require('../models/Adopter');

// Helper: generate next Adopter ID (A001, A002...)
async function getNextAdopterId() {
    const lastAdopter = await Adopter.findOne().sort({ adopter_id: -1 });
    if (!lastAdopter) return "A001";
    const num = parseInt(lastAdopter.adopter_id.slice(1)) + 1;
    return `A${num.toString().padStart(3, "0")}`;
}

// List all adopters
router.get('/', async (req, res) => {
    const adopters = await Adopter.find();
    res.render('adopters', {
        page: 'adopters',
        adopters,
        error: req.query.error || null
    });
});

// Show Add Adopter Form
router.get('/add', async (req, res) => {
    const nextId = await getNextAdopterId();
    res.render('adopter-form', { adopter: null, nextId });
});

// Handle Add Adopter POST
router.post('/add', async (req, res) => {
    const { adopter_id, name, phone, email, adopted_pet_count, notes } = req.body;
    await Adopter.create({
        adopter_id,
        name,
        phone,
        email: email || "",
        adopted_pet_count: adopted_pet_count || 0,
        notes: notes || ""
    });
    res.redirect('/adopters');
});

// Show Edit Adopter Form
router.get('/edit/:id', async (req, res) => {
    const adopter = await Adopter.findById(req.params.id);
    res.render('adopter-form', { adopter, nextId: null });
});

// Handle Edit Adopter POST
router.post('/edit/:id', async (req, res) => {
    const { name, phone, email, adopted_pet_count, notes } = req.body;
    await Adopter.findByIdAndUpdate(req.params.id, {
        name,
        phone,
        email: email || "",
        adopted_pet_count,
        notes: notes || ""
    });
    res.redirect('/adopters');
});

// Delete Adopter
const Adoption = require('../models/AdoptionRecord');

router.post('/delete/:id', async (req, res) => {
    const adopter = await Adopter.findById(req.params.id);
    if (!adopter) return res.redirect('/adopters');

    // Check if adopter has adoption records
    const hasAdoptions = await Adoption.findOne({ adopter_id: adopter.adopter_id });

    if (hasAdoptions) {
        return res.redirect('/adopters?error=Adopter has adoption records and cannot be deleted');
    }

    await Adopter.findByIdAndDelete(req.params.id);
    res.redirect('/adopters');
});


module.exports = router;