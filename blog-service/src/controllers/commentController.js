const Blog = require('../models/Blog');

const addComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    const comment = {
      userId: req.user.id,
      username: req.user.username,
      text: req.body.text,
    };

    blog.comments.push(comment);
    await blog.save();

    const saved = blog.comments[blog.comments.length - 1];
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId !== req.user.id)
      return res.status(403).json({ message: 'Not your comment' });

    comment.text = req.body.text;
    comment.updatedAt = new Date();
    await blog.save();

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.userId !== req.user.id)
      return res.status(403).json({ message: 'Not your comment' });

    comment.deleteOne();
    await blog.save();

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addComment, updateComment, deleteComment };
