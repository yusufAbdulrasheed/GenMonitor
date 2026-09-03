const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  siteCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: { type: String, enum: ['Operational', 'Maintenance', 'Offline'], default: 'Operational' },
}, { timestamps: true });

module.exports = mongoose.model('Site', siteSchema);
