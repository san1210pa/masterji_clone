import mongoose from 'mongoose';

const youtubeDailyGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: String, enum: ['JEE', 'NEET', 'UPSC', 'SSC'], required: true },
  date: { type: String, required: true },
  target: { type: Number, required: true, min: 1, max: 50, default: 2 }
}, { timestamps: true, versionKey: false });

youtubeDailyGoalSchema.index({ userId: 1, exam: 1, date: 1 }, { unique: true });
export default mongoose.models.YoutubeDailyGoal || mongoose.model('YoutubeDailyGoal', youtubeDailyGoalSchema);
