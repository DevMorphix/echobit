import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
  type:        { type: String, required: true }, // e.g. 'transcription_failed'
  message:     { type: String, required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recordingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recording', default: null },
  meta:        { type: Object, default: {} },
}, { timestamps: true });

errorLogSchema.index({ createdAt: -1 });

export default mongoose.model('ErrorLog', errorLogSchema);
