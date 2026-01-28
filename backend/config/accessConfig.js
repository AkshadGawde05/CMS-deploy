// Centralized access configuration for RBAC
// Easy to extend later with permissions arrays per route/module

export const accessConfig = {
  SuperAdmin: { all: true, routes: ["*"] },
  Admin: { all: true, routes: ["*"] },
  Teacher: {
    all: false,
    routes: ["/lectures", "/exam", "/teacher", "/attendance"],
  },
  Student: {
    all: false,
    routes: [
      "/lectures",
      "/exam",
      "/attendance",
      "/material",
      "/announcements",
      "/reports",
    ],
  },
  Parent: {
    all: false,
    routes: ["/attendance", "/exam", "/reports"],
  },
};

export default accessConfig;
