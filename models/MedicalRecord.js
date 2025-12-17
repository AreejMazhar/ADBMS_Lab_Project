const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  record_id: { type: String, required: true, unique: true }, // MR001, MR002...
  pet_id: { type: String, required: true },                  // link to Pet.pet_id
  type: { type: String, enum: ['Vaccination', 'Check-up', 'Other'], required: true },
  
  // Conditional fields
  vaccination_name: { type: String },  // only for 'vaccination'
  diagnosis: { type: String },         // only for 'checkup'
  treatment: { type: String },         // only for 'checkup'
  
  notes: { type: String }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } // explicitly name fields
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
