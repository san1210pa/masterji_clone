import mongoose from 'mongoose';

const youtubeXpTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: String, enum: ['JEE', 'NEET', 'UPSC', 'SSC'], required: true },
  sourceKey: { type: String, required: true },
  reason: { type: String, enum: ['lecture', 'daily-goal', 'seven-day-streak', 'weekly-goal'], required: true },
  points: { type: Number, required: true, min: 1, max: 100 },
  date: { type: String, required: true }
}, { timestamps: true, versionKey: false });

youtubeXpTransactionSchema.index({ userId: 1, exam: 1, sourceKey: 1 }, { unique: true });
export default mongoose.models.YoutubeXpTransaction || mongoose.model('YoutubeXpTransaction', youtubeXpTransactionSchema);
