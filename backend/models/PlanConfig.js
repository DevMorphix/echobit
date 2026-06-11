import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  text:     { type: String, required: true },
  included: { type: Boolean, default: true },
}, { _id: false });

const gatesSchema = new mongoose.Schema({
  meetingMinutes:     { type: Boolean, default: null },
  actionItems:        { type: Boolean, default: null },
  pdfExport:          { type: Boolean, default: null },
  indianLanguages:    { type: Boolean, default: null },
  recordingsPerMonth: { type: Number,  default: null }, // null = use plan default; 0 = unlimited
  maxDurationMins:    { type: Number,  default: null }, // minutes; null = use plan default
  maxStorageGB:       { type: Number,  default: null }, // GB; null = use plan default
}, { _id: false });

const planConfigSchema = new mongoose.Schema({
  plan:          { type: String, required: true, unique: true },
  features:      { type: [featureSchema], default: [] },
  monthlyPrice:  { type: String, default: '' },
  annualMonthly: { type: String, default: '' },
  annualTotal:   { type: String, default: '' },
  monthlyPaise:  { type: Number, default: 0  },
  gates:         { type: gatesSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model('PlanConfig', planConfigSchema);
