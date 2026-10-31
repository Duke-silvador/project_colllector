const express = require('express');
const path = require('path');
const config = require('./config/appconfig');
const logger = require('./middlewares/logger');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || config.port;

// Set View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pasang Middleware Logger Custom (Pencatat Request)
app.use(logger);

// Pasang Routes Web dan API
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Jalankan Server
app.listen(PORT, () => {
    console.log(`[Server] ${config.appName} sedang berjalan di http://localhost:${PORT}`);
});