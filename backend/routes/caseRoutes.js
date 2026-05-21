const express = require('express');
const router = express.Router();
const CaseController = require('../controllers/CaseController');

// Adresseopslag
router.get('/adresser/soeg', CaseController.soegAdresse);

// Læsning og simulering
router.get('/cases/sammenlign', CaseController.sammenlignCases);
router.get('/cases/:id/simulering', CaseController.getSimulation);
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