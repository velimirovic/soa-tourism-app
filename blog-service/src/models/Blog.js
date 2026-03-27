const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    comments: [commentSchema],
    likes: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
