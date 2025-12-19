const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const Pet = require('../models/Pet');

// Helper: generate next Medical Record ID (MR001, MR002...)
async function getNextRecordId() {
    const lastRecord = await MedicalRecord.findOne().sort({ record_id: -1 });
    if (!lastRecord) return "MR001";
    const num = parseInt(lastRecord.record_id.slice(2)) + 1;
    return `MR${num.toString().padStart(3, "0")}`;
}

// List all medical records (with optional pet filter)
router.get('/', async (req, res) => {
    const petId = req.query.pet_id || null;

    const query = petId ? { pet_id: petId } : {};
    const records = await MedicalRecord.find(query).lean();

    const populated = await Promise.all(records.map(async rec => {
        const pet = await Pet.findOne({ pet_id: rec.pet_id });
        return {
            _id: rec._id,
            record_id: rec.record_id,
            pet_id: rec.pet_id, 
            pet_name: pet ? pet.name : "-",
            type: rec.type,
            vaccination_name: rec.vaccination_name || "-",
            diagnosis: rec.diagnosis || "-",
            treatment: rec.treatment || "-",
            notes: rec.notes || "-",
            createdAt: rec.createdAt ? new Date(rec.createdAt) : null,
            updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : null
        };
    }));

    res.render('medical-records', {
        page: 'medicalrecords',
        records: populated,
        error: req.query.error || null,
        selectedPetId: req.query.pet_id || null
    });
})

// Show Add Medical Record Form
router.get('/add', async (req, res) => {
    const pets = await Pet.find().lean();
    const nextId = await getNextRecordId();

    res.render('medical-record-form', { 
        record: null, 
        pets, 
        nextId,
        page: 'medicalrecords' 
    });
});

// Handle Add POST
router.post('/add', async (req, res) => {
    const { record_id, pet_id, type, vaccination_name, diagnosis, treatment, notes } = req.body;
    await MedicalRecord.create({
        record_id,
        pet_id,
        type,
        vaccination_name: vaccination_name || "",
        diagnosis: diagnosis || "",
        treatment: treatment || "",
        notes: notes || ""
    });
    res.redirect('/medicalrecords');
});

// Show Edit Medical Record Form
router.get('/edit/:id', async (req, res) => {
    const record = await MedicalRecord.findById(req.params.id).lean();
    const pets = await Pet.find().lean();

    res.render('medical-record-form', { 
        record, 
        pets,
        page: 'medicalrecords' 
    });
});

// Handle Edit POST
router.post('/edit/:id', async (req, res) => {
    const { pet_id, type, vaccination_name, diagnosis, treatment, notes } = req.body;
    await MedicalRecord.findByIdAndUpdate(req.params.id, {
        pet_id,
        type,
        vaccination_name: vaccination_name || "",
        diagnosis: diagnosis || "",
        treatment: treatment || "",
        notes: notes || ""
    });
    res.redirect('/medicalrecords');
});

// Delete Medical Record
router.post('/delete/:id', async (req, res) => {
    const medrecord = await MedicalRecord.findById(req.params.id);
    if (!medrecord) return res.redirect('/medicalrecords');

    await MedicalRecord.findByIdAndDelete(req.params.id);
    res.redirect('/medicalrecords');
});

module.exports = router;