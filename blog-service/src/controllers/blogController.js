const Blog = require('../models/Blog');

const createBlog = async (req, res) => {
  try {
    const { title, description, images } = req.body;
    const blog = await Blog.create({
      title,
      description,
      images: images || [],
      authorId: req.user.id,
      authorUsername: req.user.username,
    });
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    if (blog.authorId !== req.user.id)
      return res.status(403).json({ message: 'Not your blog' });

    const { title, description, images } = req.body;
    if (title !== undefined) blog.title = title;
    if (description !== undefined) blog.description = description;
    if (images !== undefined) blog.images = images;

    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    if (blog.authorId !== req.user.id)
      return res.status(403).json({ message: 'Not your blog' });

    await blog.deleteOne();
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleLike = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    const userId = req.user.id;
    const alreadyLiked = blog.likes.includes(userId);

    if (alreadyLiked) {
      blog.likes = blog.likes.filter((id) => id !== userId);
    } else {
      blog.likes.push(userId);
    }

    await blog.save();
    res.json({ likes: blog.likes.length, liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog, toggleLike };
