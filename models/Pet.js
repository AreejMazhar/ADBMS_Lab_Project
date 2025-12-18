const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    pet_id: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /^P\d{3}$/ 
    },
    name: { type: String, required: true },
    species: {
        type: String,
        required: true,
        enum: [
            'Dog',
            'Cat',
            'Rabbit',
            'Bird',
            'Hamster',
            'Guinea Pig',
            'Rat',
            'Ferret',
            'Snake',
            'Lizard',
            'Fish',
            'Turtle'
        ]
    },
    breed: String,
    age: Number,
    available: { type: Boolean, default: true },
    microchip: { type: String }       // optional
});

module.exports = mongoose.model('Pet', petSchema);