import Topic from "../models/Topic.js";

// Get all topics
export const getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ archived: false }).populate("course_id");
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get topics by course and subject
export const getTopicsByCourseAndSubject = async (req, res) => {
  try {
    const { courseId, subject } = req.params;
    const topics = await Topic.find({
      course_id: courseId,
      subject: subject,
      archived: false,
    }).sort({ topic_number: 1 });
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get topics by course
export const getTopicsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const topics = await Topic.find({
      course_id: courseId,
      archived: false,
    }).sort({ subject: 1, topic_number: 1 });
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new topic
export const createTopic = async (req, res) => {
  try {
    const { course_id, subject, topic_name, topic_number, subtopic_number, description } = req.body;

    // Validate required fields
    if (!course_id || !subject || !topic_name || !topic_number) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if topic number already exists for this course and subject
    const existingTopic = await Topic.findOne({
      course_id,
      subject,
      topic_number,
      archived: false,
    });

    if (existingTopic) {
      return res.status(400).json({ message: "Topic number already exists for this course and subject" });
    }

    const newTopic = new Topic({
      course_id,
      subject,
      topic_name,
      topic_number,
      subtopic_number: subtopic_number || 1,
      description,
    });

    const savedTopic = await newTopic.save();
    res.status(201).json(savedTopic);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Topic number already exists for this course and subject" });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// Update a topic
export const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating course_id and subject as they are part of the unique index
    delete updates.course_id;
    delete updates.subject;

    const updatedTopic = await Topic.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }
    res.status(200).json(updatedTopic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a topic (soft delete by archiving)
export const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTopic = await Topic.findByIdAndUpdate(id, { archived: true }, { new: true });
    if (!deletedTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }
    res.status(200).json({ message: "Topic archived successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
