import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      unique: true,
      sparse: true, // Allow multiple null values
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    // Computed full name for backward compatibility and search
    fullName: {
      type: String,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      match: /^\d{10}$/,
      unique: true, // Ensure phone numbers are unique
      index: true,
    },
    phone2: {
      type: String,
      match: /^\d{10}$/,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allow multiple null values but unique non-null values
      validate: {
        validator: function (v) {
          // Allow empty/null values, but validate format if provided
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    dateOfBirth: {
      type: Date,
    },
    source: {
      type: String,
      required: true,
      enum: [
        "Website",
        "Facebook",
        "Google Ads",
        "Referral",
        "Walk-in",
        "Phone Call",
      ],
    },
    interest: {
      type: String,
      required: true,
      enum: [
        "Full Stack",
        "Data Science",
        "Digital Marketing",
        "UI/UX",
        "Python",
        "Java",
      ],
    },
    courseInterested: {
      type: String,
      trim: true,
    },
    gradeClass: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    schoolName: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    building: {
      type: String,
      trim: true,
    },
    flatRoom: {
      type: String,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "raw",
        "cold_lead",
        "warm_lead",
        "hot_lead",
        "contacted",
        "interested",
        "not_interested",
        "enrolled",
        "lost",
      ],
      default: "raw",
      index: true,
    },
    // Contact tracking
    contactAttempts: [
      {
        date: { type: Date, default: Date.now },
        method: {
          type: String,
          enum: ["phone", "email", "whatsapp", "in_person"],
        },
        response: {
          type: String,
          enum: ["answered", "no_answer", "busy", "invalid_number"],
        },
        notes: String,
        nextFollowUp: Date,
      },
    ],

    // Lead scoring
    leadScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Conversion tracking
    convertedDate: Date,
    conversionValue: Number,
    lostReason: String,

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastContactedAt: Date,
    nextFollowUpDate: Date,
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
enquirySchema.index({ phone: 1, email: 1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ assignedTo: 1, status: 1 });
enquirySchema.index({ leadScore: -1 });

// Pre-save middleware to compute full name and generate serial number
enquirySchema.pre("save", async function (next) {
  // Compute full name
  this.fullName = `${this.firstName} ${this.lastName}`.trim();

  // Generate serial number if not provided
  if (!this.srNo && this.isNew) {
    const lastEnquiry = await this.constructor.findOne(
      {},
      {},
      { sort: { srNo: -1 } }
    );
    this.srNo = lastEnquiry ? (lastEnquiry.srNo || 0) + 1 : 1;
  }

  next();
});

// Virtual for backward compatibility
enquirySchema.virtual("name").get(function () {
  return this.fullName;
});

// Method to update lead score based on interactions
enquirySchema.methods.calculateLeadScore = function () {
  let score = 0;

  // Base score by source
  const sourceScores = {
    Website: 20,
    Referral: 40,
    "Walk-in": 50,
    "Phone Call": 30,
    Facebook: 15,
    "Google Ads": 25,
  };

  score += sourceScores[this.source] || 10;

  // Contact attempts scoring
  const contactScore = Math.min(this.contactAttempts.length * 10, 30);
  score += contactScore;

  // Response quality
  const answeredContacts = this.contactAttempts.filter(
    (c) => c.response === "answered"
  ).length;
  score += answeredContacts * 15;

  // Recency bonus
  if (this.lastContactedAt) {
    const daysSinceContact =
      (Date.now() - this.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact <= 7) score += 10;
    else if (daysSinceContact <= 30) score += 5;
  }

  this.leadScore = Math.min(score, 100);
  return this.leadScore;
};

export default mongoose.model("Enquiry", enquirySchema);
