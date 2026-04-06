import mongoose from 'mongoose';


const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  examTarget: { type: String, enum: ['JEE_MAIN', 'JEE_ADVANCED', 'NEET', 'FOUNDATION'] },
  examDate: { type: String, },
  dailyHours: { type: Number, default: 4, min: 1, max: 16 },
  language: { type: String, default: 'en' },
  pwBatchId: { type: String },
  pwLinked: { type: Boolean, default: false },
  parentPhone: { type: String },
  preferences: {
    type: {
      notificationsEnabled: { type: Boolean, default: true },
      whatsappReports:      { type: Boolean, default: false },
      bunnyName:            { type: String,  default: 'Bunny' },
      bunnyColor:           { type: String,  default: 'white' },
      messageTone:          { type: String,  default: 'normal' },
      taskDurationPref:     { type: String,  default: 'medium' },
      restDay:              { type: String,  default: 'SUNDAY' },
    },
    default: {},
  },
  onboardingComplete: { type: Boolean, default: false },
}, { timestamps: true, collection: 'students' });

studentSchema.index({ phone: 1 });

const Student = mongoose.model('Student', studentSchema);

export { Student };