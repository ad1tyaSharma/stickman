const mongoose = require("mongoose");
const Schema = mongoose.Schema;

(dataSchema = new Schema({
   
  name: { type: String, required: true, default: null },
  numbers: { type: [], required: true, default: null },
  modifiedBy: { type: String, required: true, default: null },
  modifiedAt: {
    type: Date,
    default: Date.now,
  },
})),
  (Data = mongoose.model("Data", dataSchema));

module.exports = Data;
