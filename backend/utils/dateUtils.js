/**
 * Date formatting utilities for consistent dd/mm/yyyy format across the CMS
 */

/**
 * Format date to dd/mm/yyyy format
 * @param {Date|string|number} date - Date object or date string or timestamp
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
function formatDateDDMMYYYY(date) {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

export { formatDateDDMMYYYY };
