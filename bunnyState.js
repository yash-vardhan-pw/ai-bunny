import mongoose from 'mongoose';

const bunnyStateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  bunnyName: { type: String, default: 'Bunny', maxlength: 30 },
  bunnyColor: { type: String, default: 'white', enum: ['white', 'grey', 'brown', 'black', 'custom'] },
  happinessScore: { type: Number, default: 50, min: 0, max: 100 },
  emotionalState: { type: String, default: 'NEUTRAL', enum: ['EXCITED', 'HAPPY', 'NEUTRAL', 'TIRED', 'SAD'] },
  evolutionStage: { type: String, default: 'BABY_BUNNY', enum: ['BABY_BUNNY', 'ACTIVE_BUNNY', 'SUPER_BUNNY'] },
  daysInCurrentStage: { type: Number, default: 0 },
  carrotsTotal: { type: Number, default: 0 },
  carrotsToday: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date },
  accessoriesOwned: { type: [String], default: [] },
  accessoriesEquipped: { type: [String], default: [] },
  happinessLog: {
    type: [{
      event:     String,
      delta:     Number,
      timestamp: Date,
      context:   String,
    }],
    default: [],
  },
}, { timestamps: true, collection: 'bunny_states' });

bunnyStateSchema.index({ studentId: 1 }, { unique: true });

const BunnyState = mongoose.model('BunnyState', bunnyStateSchema);

export { BunnyState };