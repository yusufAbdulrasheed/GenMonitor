const mongoose = require("mongoose");

const generatorSchema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    siteCode: { type: String, required: true, trim: true, uppercase: true },
    generatorId: { type: String, required: true, unique: true },
    serialNumber: { type: String }, // keeping as optional secondary identifier
    make: { type: String, required: true },
    model: { type: String, required: true },
    capacityKVA: { type: Number, required: true },
    fuelTankSize: { type: Number, required: true }, // in Liters
    installationDate: { type: Date, required: true },
    isDecommissioned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Running", "Standby", "Fault", "UnderMaintenance"],
      default: "Standby",
    },
    fuelLevel: { type: Number, min: 0, max: 100 }, // Percentage
    batteryVoltage: { type: Number },
    temperature: { type: Number }, // Celsius
    runtimeHours: { type: Number, default: 0, min: 0 },
    lastReadingAt: { type: Date },
    lastMaintenance: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Generator", generatorSchema);
