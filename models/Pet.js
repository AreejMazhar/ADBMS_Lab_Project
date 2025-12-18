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
    age: { 
        type: Number, 
        min: [0, 'Age cannot be negative'], 
        required: true 
    },
    available: { type: Boolean, default: true },
    microchip: { 
        type: String,
        unique: true, 
        match: /^$|^MC-\d{9}$/
    }
});

module.exports = mongoose.model('Pet', petSchema);