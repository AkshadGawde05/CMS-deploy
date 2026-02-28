import Enquiry from "../models/Enquiry.js";

/**
 * Delete all enquiries from the collection
 * Temporary development-only route – remove before production
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and deletedCount
 */
export async function deleteAllEnquiries(req, res) {
  try {
    console.log("🗑️  Deleting all enquiries from database...");

    const result = await Enquiry.deleteMany({});

    console.log(`✅ Successfully deleted ${result.deletedCount} enquiries`);

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: "All enquiries deleted successfully.",
    });
  } catch (error) {
    console.error("❌ Error deleting enquiries:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete enquiries.",
      error: error.message,
    });
  }
}
