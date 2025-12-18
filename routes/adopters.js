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
    res.render('adopter-form', { 
        page: 'adopters', 
        adopter: null, 
        nextId,
        error: req.query.error || null
    });
});

// Handle Add Adopter POST
router.post('/add', async (req, res) => {
    try {
        const { adopter_id, name, phone, email, notes } = req.body;

        // Check if phone already exists
        const phoneExists = await Adopter.findOne({ phone });
        if (phoneExists) {
            return res.redirect(`/adopters/add?error=${encodeURIComponent('Phone number already exists')}`);
        }

        // Check if email already exists (if provided)
        if (email) {
            const emailExists = await Adopter.findOne({ email });
            if (emailExists) {
                return res.redirect(`/adopters/add?error=${encodeURIComponent('Email already exists')}`);
            }
        }

        await Adopter.create({
            adopter_id,
            name,
            phone,
            email: email || "",
            adopted_pet_count: 0, // always 0 when adding
            notes: notes || ""
        });

        res.redirect('/adopters');
    } catch (err) {
        console.error(err);
        res.redirect(`/adopters/add?error=${encodeURIComponent('Something went wrong')}`);
    }
});

// Show Edit Adopter Form
router.get('/edit/:id', async (req, res) => {
    const adopter = await Adopter.findById(req.params.id);
    res.render('adopter-form', { 
        page: 'adopters', 
        adopter, 
        nextId: null,
        error: req.query.error || null
    });
});

// Handle Edit Adopter POST
router.post('/edit/:id', async (req, res) => {
    try {
        const { name, phone, email, notes } = req.body;
        const adopterId = req.params.id;

        // Check phone uniqueness excluding this adopter
        const phoneExists = await Adopter.findOne({ phone, _id: { $ne: adopterId } });
        if (phoneExists) {
            return res.redirect(`/adopters/edit/${adopterId}?error=${encodeURIComponent('Phone number already exists')}`);
        }

        // Check email uniqueness if provided, excluding this adopter
        if (email) {
            const emailExists = await Adopter.findOne({ email, _id: { $ne: adopterId } });
            if (emailExists) {
                return res.redirect(`/adopters/edit/${adopterId}?error=${encodeURIComponent('Email already exists')}`);
            }
        }

        await Adopter.findByIdAndUpdate(adopterId, {
            name,
            phone,
            email: email || "",
            notes: notes || ""
        });

        res.redirect('/adopters');
    } catch (err) {
        console.error(err);
        res.redirect(`/adopters/edit/${req.params.id}?error=${encodeURIComponent('Something went wrong')}`);
    }
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