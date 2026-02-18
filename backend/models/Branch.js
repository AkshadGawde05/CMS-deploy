import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            maxlength: 10,
        },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: { type: String, default: "India" },
        },
        contactEmail: {
            type: String,
            lowercase: true,
            trim: true,
            validate: {
                validator: function (v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: "Invalid email format",
            },
        },
        contactPhone: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    return !v || /^\d{10}$/.test(v);
                },
                message: "Phone must be 10 digits",
            },
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Update timestamp on save
BranchSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for quick lookups
BranchSchema.index({ status: 1 });

const Branch = mongoose.model("Branch", BranchSchema);
export default Branch;
