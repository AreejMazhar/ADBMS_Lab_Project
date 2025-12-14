const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    pet_id: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /^P\d{3}$/ 
    },
    name: { type: String, required: true },
    species: String,
    breed: String,
    age: Number,
    available: { type: Boolean, default: true },
    vaccinations: [String],           // optional
    medical_notes: { type: String },  // optional
    microchip: { type: String }       // optional
});

module.exports = mongoose.model('Pet', petSchema);