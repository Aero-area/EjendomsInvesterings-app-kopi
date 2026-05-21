require('dotenv').config();
const express = require('express');
const caseRoutes = require('./routes/caseRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('frontend'));
// Chart.js serveres lokalt fra node_modules frem for CDN, så pakken er deklareret i package.json.
app.use('/vendor/chart.js', express.static('node_modules/chart.js/dist'));

app.use('/api', caseRoutes);

app.listen(PORT, () => {
    console.log(`Serveren kører på port ${PORT}`);
});