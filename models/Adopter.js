const mongoose = require('mongoose');

const adopterSchema = new mongoose.Schema({
    adopter_id: { type: String, required: true, unique: true, match: /^A\d{3}$/ },
    name: { type: String, required: true },
    phone: { type: String,required: true,unique: true, match: /^03\d{2}-\d{7}$/ }, // valid Pakistani phone format
    email: { type: String, required: false, lowercase: true, unique: true, 
        match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ }, // valid email format
    adopted_pet_count: { type: Number, default: 0 },
    notes: { type: String }
});

module.exports = mongoose.model('Adopter', adopterSchema);