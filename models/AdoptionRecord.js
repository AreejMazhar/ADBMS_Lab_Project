const mongoose = require('mongoose');

const adoptionRecordSchema = new mongoose.Schema({
    record_id: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /^R\d{3}$/  
    },
    pet_id: { type: String, required: true },
    adopter_id: { type: String, required: true },
    adoption_date: { type: Date, default: Date.now },
    comments: { type: String }        // optional
});

module.exports = mongoose.model('AdoptionRecord', adoptionRecordSchema);