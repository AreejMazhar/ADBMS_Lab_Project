const mongoose = require('mongoose');

const adopterSchema = new mongoose.Schema({
    adopter_id: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /^A\d{3}$/  
    },
    name: { type: String, required: true },
    phone: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: false,
        lowercase: true
    },                                 // optional

    adopted_pet_count: { type: Number, default: 0 },
    notes: { type: String }           // optional
});

module.exports = mongoose.model('Adopter', adopterSchema);