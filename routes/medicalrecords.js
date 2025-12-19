const express = require('express');
const router = express.Router(); // Create a router instance for this module
const MedicalRecord = require('../models/MedicalRecord'); // Import MedicalRecord model
const Pet = require('../models/Pet'); // Import Pet model to link records to pets

// Helper: generate next Medical Record ID (MR001, MR002...)
async function getNextRecordId() {
    const lastRecord = await MedicalRecord.findOne().sort({ record_id: -1 }); // Find last record by ID
    if (!lastRecord) return "MR001"; // If none exist, start with MR001
    const num = parseInt(lastRecord.record_id.slice(2)) + 1; // Extract number part and increment
    return `MR${num.toString().padStart(3, "0")}`; // Format with leading zeros
}

// List all medical records (with optional pet filter)
router.get('/', async (req, res) => {
    const petId = req.query.pet_id || null; // Get pet filter from query string if present

    const query = petId ? { pet_id: petId } : {}; // Build query object
    const records = await MedicalRecord.find(query).lean(); // Fetch records from DB as plain JS objects

    // Populate pet names for each record
    const populated = await Promise.all(records.map(async rec => {
        const pet = await Pet.findOne({ pet_id: rec.pet_id }); // Get pet info
        return {
            _id: rec._id,
            record_id: rec.record_id,
            pet_id: rec.pet_id, 
            pet_name: pet ? pet.name : "-", // Display pet name or "-" if not found
            type: rec.type,
            vaccination_name: rec.vaccination_name || "-",
            diagnosis: rec.diagnosis || "-",
            treatment: rec.treatment || "-",
            notes: rec.notes || "-",
            createdAt: rec.createdAt ? new Date(rec.createdAt) : null,
            updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : null
        };
    }));

    // Render medical-records view with populated data
    res.render('medical-records', {
        page: 'medicalrecords',
        records: populated,
        error: req.query.error || null,
        selectedPetId: req.query.pet_id || null
    });
})

// Show Add Medical Record Form
router.get('/add', async (req, res) => {
    const pets = await Pet.find().lean(); // Get all pets to select from
    const nextId = await getNextRecordId(); // Generate next record ID

    res.render('medical-record-form', { 
        record: null, // No existing record (adding new)
        pets, 
        nextId,
        page: 'medicalrecords' 
    });
});

// Handle Add POST
router.post('/add', async (req, res) => {
    const { record_id, pet_id, type, vaccination_name, diagnosis, treatment, notes } = req.body;

    // Create a new medical record in DB
    await MedicalRecord.create({
        record_id,
        pet_id,
        type,
        vaccination_name: vaccination_name || "",
        diagnosis: diagnosis || "",
        treatment: treatment || "",
        notes: notes || ""
    });

    res.redirect('/medicalrecords'); // Redirect to list page
});

// Show Edit Medical Record Form
router.get('/edit/:id', async (req, res) => {
    const record = await MedicalRecord.findById(req.params.id).lean(); // Find record by ID
    const pets = await Pet.find().lean(); // Get all pets for selection

    res.render('medical-record-form', { 
        record, // Pass existing record to pre-fill form
        pets,
        page: 'medicalrecords' 
    });
});

// Handle Edit POST
router.post('/edit/:id', async (req, res) => {
    const { pet_id, type, vaccination_name, diagnosis, treatment, notes } = req.body;

    // Update existing record in DB
    await MedicalRecord.findByIdAndUpdate(req.params.id, {
        pet_id,
        type,
        vaccination_name: vaccination_name || "",
        diagnosis: diagnosis || "",
        treatment: treatment || "",
        notes: notes || ""
    });

    res.redirect('/medicalrecords'); // Redirect to list page
});

// Delete Medical Record
router.post('/delete/:id', async (req, res) => {
    const medrecord = await MedicalRecord.findById(req.params.id); // Find medical record by MongoDB _id
    if (!medrecord) return res.redirect('/medicalrecords'); // Redirect if not found

    await MedicalRecord.findByIdAndDelete(req.params.id); // Remove record by ID
    res.redirect('/medicalrecords'); // Redirect to list page
});

module.exports = router; // Export router for use in server.js
