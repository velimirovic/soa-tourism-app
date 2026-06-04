const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const Blog = require('../models/Blog');

const PROTO_PATH = path.join(__dirname, '../../proto/blog.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const blogProto = grpc.loadPackageDefinition(packageDef).blog;

function formatBlog(blog) {
  return {
    id: blog._id.toString(),
    title: blog.title,
    description: blog.description,
    images: blog.images || [],
    author_id: blog.authorId,
    author_username: blog.authorUsername,
    created_at: blog.createdAt.toISOString(),
    updated_at: blog.updatedAt.toISOString(),
    likes: blog.likes || [],
  };
}

async function createBlog(call, callback) {
  try {
    const { title, description, images, author_id, author_username } = call.request;
    const blog = await Blog.create({
      title,
      description,
      images: images || [],
      authorId: author_id,
      authorUsername: author_username,
    });
    callback(null, formatBlog(blog));
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function getBlogById(call, callback) {
  try {
    const blog = await Blog.findById(call.request.id);
    if (!blog) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Blog not found' });
    }
    callback(null, formatBlog(blog));
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

function startGrpcServer(port) {
  const server = new grpc.Server();
  server.addService(blogProto.BlogService.service, { createBlog, getBlogById });
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, actualPort) => {
      if (err) {
        console.error('Blog gRPC server failed to start:', err);
        return;
      }
      console.log(`Blog gRPC server running on port ${actualPort}`);
    }
  );
  return server;
}

module.exports = { startGrpcServer };
