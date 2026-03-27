require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const blogRoutes = require('./routes/blogRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/blogs', blogRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Blog service running on port ${PORT}`));
});
