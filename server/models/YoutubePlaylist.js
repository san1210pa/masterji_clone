import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  durationSeconds: { type: Number, required: true, min: 0 },
  thumbnail: { type: String, default: '' },
  studyDate: { type: String, default: '' },
  done: { type: Boolean, default: false }
}, { _id: false });

const playlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: String, enum: ['JEE', 'NEET', 'UPSC', 'SSC'], required: true },
  playlistId: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  channelTitle: { type: String, default: '' },
  videos: { type: [videoSchema], default: [] },
  startLecture: { type: Number, default: 1, min: 1 },
  endLecture: { type: Number, default: 1, min: 1 },
  speed: { type: Number, enum: [1, 1.25, 1.5, 1.75, 2], default: 1 },
  lecturesPerDay: { type: Number, min: 1, max: 50, default: 2 },
  expectedCompletionDate: { type: String, default: '' },
  sourceMode: { type: String, enum: ['youtube-api', 'manual-fallback'], default: 'youtube-api' },
  isPaused: { type: Boolean, default: false },
  pausedAt: { type: String, default: '' },
  studyDate: { type: String, required: true }
}, { timestamps: true, versionKey: false });

playlistSchema.index({ userId: 1, exam: 1, playlistId: 1 }, { unique: true });
export default mongoose.models.YoutubePlaylist || mongoose.model('YoutubePlaylist', playlistSchema);
