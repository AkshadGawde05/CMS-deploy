// Centralized feature flags (server-side)
// You can control via environment variables in production.

const flags = {
  enableUserRoleManagement: process.env.FEATURE_USER_ROLE_MGMT !== 'false',
  enableLinkedStudentsUI: process.env.FEATURE_LINKED_STUDENTS !== 'false',
  enableSessionsUI: process.env.FEATURE_SESSIONS_UI === 'true',
};

export default flags;
