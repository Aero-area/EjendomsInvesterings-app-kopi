/*
Definerer API'ets routing-tabel ved at mappe HTTP-metoder (GET, POST, PUT) 
og URL-stier til de specifikke metoder i CaseController
*/
// Modularisering
const express = require('express'); 
const router = express.Router(); // Bruger Express' indbyggede router-objekt til at definere ruter, som senere kobles på hoved-applikationen i app.js
const CaseController = require('../controllers/CaseController'); // Importerer controlleren, da det er her, den faktiske logik for hver rute bor.

// router.get: Definerer HTTP-metoden (GET betyder "hent data").
// Adresseopslag
router.get('/adresser/soeg', CaseController.soegAdresse);

// Læsning og simulering
router.get('/cases/sammenlign', CaseController.sammenlignCases);
router.get('/cases/:id/simulering', CaseController.getSimulation); // Dynamiske parametre
router.get('/cases/:id', CaseController.getCaseById);

// Case-oprettelse og grunddata
router.post('/cases/init', CaseController.initCase);
router.post('/cases/:id/dupliker', CaseController.duplikerCase);
router.put('/cases/:id', CaseController.opdaterCase);

// Tilføjelse af relationer
router.post('/cases/:id/laan', CaseController.tilfoejLaan);
router.post('/cases/:id/renovering', CaseController.tilfoejRenovering);
router.post('/cases/:id/driftsudgift', CaseController.tilfoejDriftsudgift);
router.post('/cases/:id/udlejning', CaseController.gemUdlejning);

// BBR og Kort-opslag
router.get('/ejendomme/bbr/:dawaId', CaseController.getBbrByDawaId);
router.get('/ejendomme/kort/:dawaId', CaseController.getKortByDawaId);

// Ejendomsprofiler
router.get('/ejendomsprofiler', CaseController.getMineEjendomsprofiler);
router.post('/ejendomsprofiler', CaseController.opretEjendomsprofil);
router.put('/ejendomsprofiler/:id', CaseController.opdaterEjendomsprofil);
router.delete('/ejendomsprofiler/:id', CaseController.sletEjendomsprofil);

module.exports = router;