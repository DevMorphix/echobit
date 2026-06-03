import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  text:     { type: String, required: true },
  included: { type: Boolean, default: true },
}, { _id: false });

const planConfigSchema = new mongoose.Schema({
  plan:     { type: String, required: true, unique: true },
  features: { type: [featureSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('PlanConfig', planConfigSchema);
