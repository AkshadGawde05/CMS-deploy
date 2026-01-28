// Example: Marks Module Implementation with Permission Matrix
// This is a reference implementation showing how to integrate permissions

// ============================================
// Backend: routes/marks.js
// ============================================
import express from "express";
import { verifyAuth } from "../middlewares/jwtAuth.js";
import { verifyPermission } from "../middlewares/permissionAuth.js";
import Marks from "../models/Marks.js"; // Assuming you'll create this model

const router = express.Router();

// GET /api/marks - View all marks
router.get(
  "/marks",
  verifyAuth,
  verifyPermission(["canViewMarks"]),
  async (req, res) => {
    try {
      // Filter based on user role
      let query = {};

      if (req.user.role === "Student") {
        query.studentId = req.user.id;
      } else if (req.user.role === "Teacher") {
        query.teacherId = req.user.id;
      }
      // Admin/SuperAdmin can see all marks

      const marks = await Marks.find(query).populate("studentId examId");
      res.json({ success: true, marks });
    } catch (error) {
      console.error("Error fetching marks:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch marks" });
    }
  }
);

// POST /api/marks - Create mark
router.post(
  "/marks",
  verifyAuth,
  verifyPermission(["canEditMarks"]),
  async (req, res) => {
    try {
      const { studentId, examId, marks, totalMarks, remarks } = req.body;

      const newMark = await Marks.create({
        studentId,
        examId,
        marks,
        totalMarks,
        remarks,
        createdBy: req.user.id,
      });

      res.status(201).json({ success: true, mark: newMark });
    } catch (error) {
      console.error("Error creating mark:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create mark" });
    }
  }
);

// PUT /api/marks/:id - Update mark
router.put(
  "/marks/:id",
  verifyAuth,
  verifyPermission(["canEditMarks"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { marks, totalMarks, remarks } = req.body;

      const updatedMark = await Marks.findByIdAndUpdate(
        id,
        { marks, totalMarks, remarks, updatedBy: req.user.id },
        { new: true }
      );

      if (!updatedMark) {
        return res
          .status(404)
          .json({ success: false, message: "Mark not found" });
      }

      res.json({ success: true, mark: updatedMark });
    } catch (error) {
      console.error("Error updating mark:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update mark" });
    }
  }
);

// DELETE /api/marks/:id - Delete mark
router.delete(
  "/marks/:id",
  verifyAuth,
  verifyPermission(["canEditMarks"]), // Using same permission for delete
  async (req, res) => {
    try {
      const { id } = req.params;

      const deletedMark = await Marks.findByIdAndDelete(id);

      if (!deletedMark) {
        return res
          .status(404)
          .json({ success: false, message: "Mark not found" });
      }

      res.json({ success: true, message: "Mark deleted successfully" });
    } catch (error) {
      console.error("Error deleting mark:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete mark" });
    }
  }
);

export default router;

// ============================================
// Backend: server.js (Add this line)
// ============================================
// import marksRouter from "./routes/marks.js";
// app.use("/api", marksRouter);

// ============================================
// Frontend: app/marks/page.tsx
// ============================================
/*
"use client";
import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/components/auth/AuthProvider";

interface Mark {
  _id: string;
  studentId: { _id: string; f_name: string; l_name: string };
  examId: { _id: string; name: string };
  marks: number;
  totalMarks: number;
  remarks?: string;
}

export default function MarksPage() {
  const { hasPermission } = useAuth();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marks`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch marks");
      const data = await response.json();
      setMarks(data.marks || []);
    } catch (error) {
      console.error("Error fetching marks:", error);
      alert("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (markId: string) => {
    if (!confirm("Are you sure you want to delete this mark?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/marks/${markId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to delete mark");

      setMarks(marks.filter(m => m._id !== markId));
      alert("Mark deleted successfully");
    } catch (error) {
      console.error("Error deleting mark:", error);
      alert("Failed to delete mark");
    }
  };

  return (
    <ProtectedRoute 
      allowedRoles={["Teacher", "Admin", "SuperAdmin"]} 
      requiredPermission="canViewMarks"
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Marks Management</h1>
                {hasPermission("canEditMarks") && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add New Mark
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">Loading marks...</div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Exam
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Marks
                        </th>
                        {hasPermission("canEditMarks") && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {marks.map((mark) => (
                        <tr key={mark._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {mark.studentId.f_name} {mark.studentId.l_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {mark.examId.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {mark.marks} / {mark.totalMarks}
                          </td>
                          {hasPermission("canEditMarks") && (
                            <td className="px-6 py-4 whitespace-nowrap space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(mark._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {marks.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No marks found
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
*/

// ============================================
// Testing Scenarios
// ============================================

/*
1. Test with SuperAdmin:
   - Should see all marks
   - Should be able to add/edit/delete marks
   - Permission checks automatically pass

2. Test with Teacher (with canViewMarks only):
   - Should see marks they created
   - Should NOT see Add/Edit/Delete buttons
   - Direct API calls to POST/PUT/DELETE should return 403

3. Test with Teacher (with both canViewMarks and canEditMarks):
   - Should see marks
   - Should see Add/Edit/Delete buttons
   - Should be able to perform all operations

4. Test with Teacher (no permissions):
   - Should be redirected to /403 when accessing /marks
   - Direct API calls should return 403

5. Test permission toggling:
   - Login as SuperAdmin
   - Go to /superadmin/permissions
   - Toggle teacher's canEditMarks off
   - As teacher, refresh /marks page
   - Edit buttons should disappear
*/
