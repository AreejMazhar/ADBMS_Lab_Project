const mongoose = require('mongoose');

const adopterSchema = new mongoose.Schema({
    adopter_id: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /^A\d{3}$/  
    },
    name: { type: String, required: true },
    contact: String,
    adopted_pet_count: { type: Number, default: 0 },
    notes: { type: String }           // optional
});

module.exports = mongoose.model('Adopter', adopterSchema);