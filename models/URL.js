const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  url: { type: String, required: true },
  short_id: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('URL', urlSchema);