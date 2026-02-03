import Lecture from "../models/Lecture.js";
import Course from "../models/Course.js";
import Batches from "../models/Batches.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Parent from "../models/Parent.js";
import Syllabus from "../models/Syllabus.js";
import Topic from "../models/Topic.js";

// Get unique subjects for a given course
export const getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Pull subjects from syllabus items so the dropdown reflects syllabus data
    const syllabusDocs = await Syllabus.find({ course_id: courseId }).select("items");
    const subjectSet = new Set();
    syllabusDocs.forEach((doc) => {
      (doc.items || []).forEach((item) => {
        if (item.subject) {
          subjectSet.add(item.subject);
        }
      });
    });

    // Fallback to Topic collection if syllabus has no entries
    if (!subjectSet.size) {
      const topicDocs = await Topic.find({
        course_id: courseId,
        archived: false,
      }).select("subject");
      topicDocs.forEach((t) => {
        if (t.subject) subjectSet.add(t.subject);
      });
    }

    // Final fallback: derive distinct subjects from existing lectures
    if (!subjectSet.size) {
      const lectureSubjects = await Lecture.find({
        course_id: courseId,
        archived: { $ne: true },
      })
        .select("subject")
        .distinct("subject");
      lectureSubjects.forEach((s) => {
        if (s) subjectSet.add(s);
      });
    }

    // Dummy subject to avoid empty dropdown during initial setup
    if (!subjectSet.size) {
      subjectSet.add("Sample Subject");
    }

    res.json({
      success: true,
      subjects: Array.from(subjectSet).sort(),
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message,
    });
  }
};

// Get all lectures with pagination
export const getLectures = async (req, res) => {
  try {
    console.log("🔍 [LECTURES DEBUG] Starting getLectures");
    console.log(
      "🔍 [LECTURES DEBUG] User:",
      req.user
        ? {
            _id: req.user._id,
            role: req.user.role,
            email: req.user.email,
          }
        : "No user found"
    );

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query filter based on user role
    let lectureFilter = { archived: { $ne: true } };
    console.log("🔍 [LECTURES DEBUG] Initial filter:", lectureFilter);

    // If user is a Student, filter by their batch
    if (req.user && req.user.role === "Student") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Student, finding Student record..."
      );
      // Find the student record to get their batch_id
      const student = await Student.findOne({ user_id: req.user._id });
      console.log(
        "🔍 [LECTURES DEBUG] Student record found:",
        student
          ? {
              _id: student._id,
              student_id: student.student_id,
              batch_id: student.batch_id,
              f_name: student.f_name,
              l_name: student.l_name,
            }
          : "No Student record found"
      );

      if (student && student.batch_id) {
        lectureFilter.batch_id = student.batch_id;
        console.log(
          "🔍 [LECTURES DEBUG] Filtering by batch_id:",
          student.batch_id
        );
      } else {
        // If student has no batch assigned, return empty result
        console.log(
          "❌ [LECTURES DEBUG] Student has no Student record or batch_id, returning empty"
        );
        return res.json({
          success: true,
          lectures: [],
          total: 0,
          page,
          totalPages: 0,
          message: student
            ? "Student not assigned to any batch"
            : "No Student record found for this user",
        });
      }
    }
    // If user is a Teacher, filter by their assigned lectures only
    else if (req.user && req.user.role === "Teacher") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Teacher, filtering by teacher_id..."
      );
      // Teacher can only see lectures they are assigned to teach
      lectureFilter.teacher_id = req.user._id;
      console.log(
        "🔍 [LECTURES DEBUG] Filtering by teacher_id:",
        req.user._id
      );
    }
    // If user is a Parent, filter by their linked student's batch
    else if (req.user && req.user.role === "Parent") {
      // Find the parent record to get their student_id
      const parent = await Parent.findOne({ user_id: req.user._id }).populate(
        "student_id"
      );
      if (parent && parent.student_id && parent.student_id.batch_id) {
        lectureFilter.batch_id = parent.student_id.batch_id;
      } else {
        // If parent has no linked student or student has no batch, return empty result
        return res.json({
          success: true,
          lectures: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    // Get lectures with populated references
    console.log("🔍 [LECTURES DEBUG] Final filter:", lectureFilter);
    const lectures = await Lecture.find(lectureFilter)
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Lecture.countDocuments(lectureFilter);

    console.log("🔍 [LECTURES DEBUG] Found lectures:", lectures.length);
    console.log("🔍 [LECTURES DEBUG] Total count:", total);
    console.log(
      "🔍 [LECTURES DEBUG] Lectures preview:",
      lectures.map((l) => ({
        _id: l._id,
        topic: l.topic,
        subject: l.subject,
        batch: l.batch_id?.name,
        course: l.course_id?.name,
      }))
    );

    res.json({
      success: true,
      lectures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching lectures:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lectures",
      error: error.message,
    });
  }
};

// Get archived lectures
export const getArchivedLectures = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query filter based on user role
    let lectureFilter = { archived: true };

    // Filter based on user role
    if (req.user && req.user.role === "Student") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Student, finding student record..."
      );
      // Students: filter by their batch
      const student = await Student.findOne({ user_id: req.user._id });
      console.log(
        "🔍 [LECTURES DEBUG] Found student:",
        student
          ? {
              _id: student._id,
              f_name: student.f_name,
              l_name: student.l_name,
              batch_id: student.batch_id,
            }
          : "null"
      );

      if (student && student.batch_id) {
        lectureFilter.batch_id = student.batch_id;
        console.log(
          "🔍 [LECTURES DEBUG] Updated filter for student:",
          lectureFilter
        );
      } else {
        console.log(
          "🔍 [LECTURES DEBUG] Student has no batch, returning empty result"
        );
        return res.json({
          success: true,
          lectures: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    } else if (req.user && req.user.role === "Teacher") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Teacher, filtering by teacher_id..."
      );
      // Teachers: filter by their assigned lectures only
      lectureFilter.teacher_id = req.user._id;
      console.log(
        "🔍 [LECTURES DEBUG] Updated filter for teacher:",
        lectureFilter
      );
    } else if (req.user && req.user.role === "Parent") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Parent, finding parent record..."
      );
      // Parents: filter by their linked student's batch
      const parent = await Parent.findOne({ user_id: req.user._id }).populate(
        "student_id"
      );
      console.log(
        "🔍 [LECTURES DEBUG] Found parent:",
        parent
          ? {
              _id: parent._id,
              student_id: parent.student_id,
            }
          : "null"
      );

      if (parent && parent.student_id && parent.student_id.batch_id) {
        lectureFilter.batch_id = parent.student_id.batch_id;
        console.log(
          "🔍 [LECTURES DEBUG] Updated filter for parent:",
          lectureFilter
        );
      } else {
        console.log(
          "🔍 [LECTURES DEBUG] Parent has no linked student or student has no batch, returning empty result"
        );
        return res.json({
          success: true,
          lectures: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    } else if (req.user && req.user.role === "Teacher") {
      console.log(
        "🔍 [LECTURES DEBUG] User is Teacher, filtering by teacher_id"
      );
      // Teachers: filter by lectures they are assigned to teach
      lectureFilter.teacher_id = req.user._id;
      console.log(
        "🔍 [LECTURES DEBUG] Updated filter for teacher:",
        lectureFilter
      );
    } else {
      console.log(
        "🔍 [LECTURES DEBUG] User is Admin/SuperAdmin or no specific role, showing all lectures"
      );
    }
    // Admin and SuperAdmin see all lectures (no additional filter)

    const lectures = await Lecture.find(lectureFilter)
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Lecture.countDocuments(lectureFilter);

    res.json({
      success: true,
      lectures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching archived lectures:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch archived lectures",
      error: error.message,
    });
  }
};

// Get lecture by ID
export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email");

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if user has access to this lecture based on role
    if (req.user && req.user.role === "Student") {
      const student = await Student.findOne({ user_id: req.user._id });
      if (
        !student ||
        !student.batch_id ||
        student.batch_id.toString() !== lecture.batch_id._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Lecture not in your batch",
        });
      }
    } else if (req.user && req.user.role === "Parent") {
      const parent = await Parent.findOne({ user_id: req.user._id }).populate(
        "student_id"
      );
      if (
        !parent ||
        !parent.student_id ||
        !parent.student_id.batch_id ||
        parent.student_id.batch_id.toString() !==
          lecture.batch_id._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Lecture not in your student's batch",
        });
      }
    } else if (req.user && req.user.role === "Teacher") {
      if (lecture.teacher_id._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to teach this lecture",
        });
      }
    }
    // Admin and SuperAdmin have full access

    res.json({
      success: true,
      lecture,
    });
  } catch (error) {
    console.error("Error fetching lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lecture",
      error: error.message,
    });
  }
};

// Create new lecture
export const createLecture = async (req, res) => {
  try {
    const {
      course_id,
      batch_id,
      teacher_id,
      subject,
      topic,
      subtopic,
      date,
      lecture_start,
      lecture_end,
      note,
    } = req.body;

    // Validate required fields
    if (
      !course_id ||
      !batch_id ||
      !teacher_id ||
      !subject ||
      !topic ||
      !date ||
      !lecture_start ||
      !lecture_end
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate that course, batch, and teacher exist
    const course = await Course.findById(course_id);
    const batch = await Batches.findById(batch_id);
    const teacher = await User.findById(teacher_id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Validate subject/topic/subtopic against syllabus items for this course & batch
    const syllabus = await Syllabus.findOne({ course_id, batch_id }).lean();
    if (!syllabus || !Array.isArray(syllabus.items) || syllabus.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No syllabus found for this course and batch. Please add topics/subtopics in the syllabus first.",
      });
    }

    const normSubject = String(subject || "").trim();
    const normTopic = String(topic || "").trim();
    const normSubtopic = (subtopic || "").trim();

    const syllabusItems = Array.isArray(syllabus.items) ? syllabus.items : [];
    const topicMatches = syllabusItems.filter((item) => {
      if (!item) return false;
      const subjOk = String(item.subject || "").trim().toLowerCase() === normSubject.toLowerCase();
      const topicOk = String(item.topic || "").trim().toLowerCase() === normTopic.toLowerCase();
      return subjOk && topicOk;
    });

    const subtopicMatch = normSubtopic
      ? topicMatches.find(
          (item) =>
            String(item.subtopic || "")
              .trim()
              .toLowerCase() === normSubtopic.toLowerCase()
        )
      : topicMatches[0];

    let validatedSubtopic = normSubtopic;

    if (!topicMatches.length) {
      // Fallback: allow topics that exist in Topic collection (used by dropdown fallback) to avoid blocking saves
      const topicDoc = await Topic.findOne({
        course_id,
        subject: normSubject,
        topic_name: { $regex: `^${normTopic}$`, $options: "i" },
        archived: false,
      });

      if (!topicDoc) {
        // As a final lenient fallback, allow creation but log a warning; this keeps UX unblocked if dropdown provided a fallback value
        console.warn(
          "⚠️ Lecture creation with topic not found in syllabus or topics collection",
          { course_id, batch_id, subject: normSubject, topic: normTopic, subtopic: normSubtopic }
        );
      }
    }

    // If topic exists but subtopic does not, allow creation (lenient) to avoid blocking; frontend should still prefer syllabus options.

    const lecture = new Lecture({
      course_id,
      batch_id,
      teacher_id,
      subject: normSubject,
      topic: normTopic,
      subtopic: validatedSubtopic,
      date: new Date(date),
      lecture_start: new Date(lecture_start),
      lecture_end: new Date(lecture_end),
      note: note || "",
      status: "scheduled",
    });

    await lecture.save();

    // Populate the created lecture before returning
    const populatedLecture = await Lecture.findById(lecture._id)
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email");

    res.status(201).json({
      success: true,
      lecture: populatedLecture,
    });
  } catch (error) {
    console.error("Error creating lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create lecture",
      error: error.message,
    });
  }
};

// Update lecture
export const updateLecture = async (req, res) => {
  try {
    const lectureId = req.params.id;
    const updateData = req.body;

    // First, fetch the existing lecture to check authorization
    const lecture = await Lecture.findById(lectureId);
    
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if teacher is authorized to update this lecture
    if (req.user && req.user.role === "Teacher") {
      if (lecture.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to teach this lecture",
        });
      }
    }
    // Admin and SuperAdmin can update any lecture

    // Convert date strings to Date objects if present
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    if (updateData.lecture_start) {
      updateData.lecture_start = new Date(updateData.lecture_start);
    }
    if (updateData.lecture_end) {
      updateData.lecture_end = new Date(updateData.lecture_end);
    }

    const updatedLecture = await Lecture.findByIdAndUpdate(lectureId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email");

    res.json({
      success: true,
      lecture: updatedLecture,
    });
  } catch (error) {
    console.error("Error updating lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lecture",
      error: error.message,
    });
  }
};

// Delete lecture
export const deleteLecture = async (req, res) => {
  try {
    // First, fetch the lecture to check authorization
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if teacher is authorized to delete this lecture
    if (req.user && req.user.role === "Teacher") {
      if (lecture.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to teach this lecture",
        });
      }
    }
    // Admin and SuperAdmin can delete any lecture

    const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Lecture deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lecture",
      error: error.message,
    });
  }
};

// Archive lecture
export const archiveLecture = async (req, res) => {
  try {
    // First, fetch the lecture to check authorization
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if teacher is authorized to archive this lecture
    if (req.user && req.user.role === "Teacher") {
      if (lecture.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to teach this lecture",
        });
      }
    }
    // Admin and SuperAdmin can archive any lecture

    const archivedLecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    )
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email");

    res.json({
      success: true,
      message: "Lecture archived successfully",
      lecture: archivedLecture,
    });
  } catch (error) {
    console.error("Error archiving lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive lecture",
      error: error.message,
    });
  }
};

// Restore lecture from archive
export const restoreLecture = async (req, res) => {
  try {
    // First, fetch the lecture to check authorization
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if teacher is authorized to restore this lecture
    if (req.user && req.user.role === "Teacher") {
      if (lecture.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to teach this lecture",
        });
      }
    }
    // Admin and SuperAdmin can restore any lecture

    const restoredLecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { archived: false },
      { new: true }
    )
      .populate("course_id", "name")
      .populate("batch_id", "name course_id")
      .populate("teacher_id", "fname lname email");

    res.json({
      success: true,
      message: "Lecture restored successfully",
      lecture: restoredLecture,
    });
  } catch (error) {
    console.error("Error restoring lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore lecture",
      error: error.message,
    });
  }
};

// Get unique topics by course and subject
export const getTopicsByCourseAndSubject = async (req, res) => {
  try {
    const { course_id, subject, batch_id } = req.query;

    if (!course_id || !subject) {
      return res.status(400).json({
        success: false,
        message: "Course ID and subject are required",
      });
    }

    // Pull topics from syllabus items so the dropdown reflects syllabus data
    const syllabusFilter = { course_id };
    if (batch_id) syllabusFilter.batch_id = batch_id;

    const syllabusDocs = await Syllabus.find(syllabusFilter).select("items");
    const topicSet = new Set();
    syllabusDocs.forEach((doc) => {
      (doc.items || []).forEach((item) => {
        if (item.subject === subject && item.topic) {
          topicSet.add(item.topic);
        }
      });
    });

    // Fallback to Topic collection if syllabus has no entries
    if (!topicSet.size) {
      const topicDocs = await Topic.find({
        course_id,
        subject,
        archived: false,
      }).select("topic_name");
      topicDocs.forEach((t) => {
        if (t.topic_name) topicSet.add(t.topic_name);
      });
    }

    // Final fallback: derive distinct topics from existing lectures
    if (!topicSet.size) {
      const lectureTopics = await Lecture.find({
        course_id,
        subject,
        archived: { $ne: true },
      })
        .select("topic")
        .distinct("topic");
      lectureTopics.forEach((t) => {
        if (t) topicSet.add(t);
      });
    }

    // Dummy topic to avoid empty dropdown during initial setup
    if (!topicSet.size) {
      topicSet.add("Sample Topic");
    }

    res.json({
      success: true,
      topics: Array.from(topicSet).sort(),
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch topics",
      error: error.message,
    });
  }
};

// Get unique subtopics by course, subject, and topic
export const getSubtopicsByTopic = async (req, res) => {
  try {
    const { course_id, subject, topic, batch_id } = req.query;

    if (!course_id || !subject || !topic) {
      return res.status(400).json({
        success: false,
        message: "Course ID, subject, and topic are required",
      });
    }

    // Pull subtopics from syllabus items so dropdown is driven by syllabus entries
    const syllabusFilter = { course_id };
    if (batch_id) syllabusFilter.batch_id = batch_id;

    const syllabusDocs = await Syllabus.find(syllabusFilter).select("items");
    const subtopicSet = new Set();
    syllabusDocs.forEach((doc) => {
      (doc.items || []).forEach((item) => {
        if (item.subject === subject && item.topic === topic && item.subtopic) {
          subtopicSet.add(item.subtopic);
        }
      });
    });

    // Fallback to existing lectures for subtopics
    if (!subtopicSet.size) {
      const lectureSubtopics = await Lecture.find({
        course_id,
        subject,
        topic,
        archived: { $ne: true },
        subtopic: { $exists: true, $ne: "" },
      })
        .select("subtopic")
        .distinct("subtopic");
      lectureSubtopics.forEach((s) => {
        if (s) subtopicSet.add(s);
      });
    }

    // Dummy subtopic to avoid empty dropdown during initial setup
    if (!subtopicSet.size) {
      subtopicSet.add("General");
    }

    res.json({
      success: true,
      subtopics: Array.from(subtopicSet).sort(),
    });
  } catch (error) {
    console.error("Error fetching subtopics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subtopics",
      error: error.message,
    });
  }
};
