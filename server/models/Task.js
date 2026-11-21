import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: String, enum: ['JEE', 'NEET', 'UPSC', 'SSC'], required: true },
  seedIndex: { type: Number, default: undefined },
  time: { type: String, default: '18:00', maxlength: 5 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  tag: { type: String, default: 'Personal', trim: true, maxlength: 50 },
  done: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

taskSchema.index({ userId: 1, exam: 1, seedIndex: 1 }, { unique: true, partialFilterExpression: { seedIndex: { $type: 'number' } } });
taskSchema.index({ userId: 1, exam: 1, createdAt: 1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export default Task;
