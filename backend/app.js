/* Applikationens indgangspunkt. Konfigurerer og starter selve Express-webserveren. 
Opsætter de globale regler, som serveren skal følge
Forbinder serveren til ruterne (API-endpoints) og de statiske frontend-filer*/

// Indlæser din .env-fil
require('dotenv').config();
// Indlæser Express-frameworket
const express = require('express');
// Indlæser din egen eksterne rutefil
const caseRoutes = require('./routes/caseRoutes');
// Opretter en instans af en Express-applikation. Variablen app er nu din egentlige webserver.
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Præsentationslaget (klienten)
app.use(express.static('frontend'));
// Chart.js serveres lokalt fra node_modules frem for CDN, så pakken er deklareret i package.json.
app.use('/vendor/chart.js', express.static('node_modules/chart.js/dist'));
// Applikationslaget (logik/server)
app.use('/api', caseRoutes);

app.listen(PORT, () => {
    console.log(`Serveren kører på port ${PORT}`);
});