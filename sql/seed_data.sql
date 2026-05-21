-- 1. Opretter demo-bruger
INSERT INTO EjendomsInvest.Bruger
    (bruger_id, navn, email, adgangskode_hash, brugernavn)
VALUES
    (1, 'Demo Bruger', 'demo@cbs.dk', 'scope_cut_auth_not_used', 'demo');
GO


-- 2. Opretter Ejendomsprofiler
-- Alle profiler kobles til demo-bruger 1, som bruges af backendens prototype-flow.
SET IDENTITY_INSERT EjendomsInvest.Ejendomsprofil ON;

INSERT INTO EjendomsInvest.Ejendomsprofil
    (profil_id, bruger_id, adresse, ejendomstype, byggeaar, boligareal, grundareal, antal_vaerelser, oprettet_dato, sidst_indhentet_dato)
VALUES
    (100, 1, 'Noerrebrogade 1, 2200 Koebenhavn N', 'Lejlighed', 1920, 85.00, NULL, 3, '2026-04-10 09:00:00', '2026-04-10 09:15:00'),
    (101, 1, 'Oesterbrogade 2, 2100 Koebenhavn O', 'Lejlighed', 1905, 110.00, NULL, 4, '2026-04-10 10:00:00', '2026-04-10 10:12:00'),
    (102, 1, 'Vesterbrogade 10, 1620 Koebenhavn V', 'Lejlighed', 1950, 90.00, NULL, 3, '2026-04-11 11:00:00', '2026-04-11 11:20:00'),
    (103, 1, 'Strandvejen 50, 2900 Hellerup', 'Raekkehus', 2010, 150.00, 300.00, 5, '2026-04-12 12:00:00', '2026-04-12 12:18:00'),
    (104, 1, 'Amagerbrogade 200, 2300 Koebenhavn S', 'Lejlighed', 1970, 75.00, NULL, 2, '2026-04-13 13:00:00', '2026-04-13 13:09:00'),
    (105, 1, 'Paradisaeblevej 111, 2800 Kongens Lyngby', 'Enfamiliehus', 1930, 120.00, 800.00, 4, '2026-04-14 14:00:00', '2026-04-14 14:25:00');

SET IDENTITY_INSERT EjendomsInvest.Ejendomsprofil OFF;
GO


-- 3. Opretter Investeringscases
SET IDENTITY_INSERT EjendomsInvest.Investeringscase ON;

INSERT INTO EjendomsInvest.Investeringscase
    (case_id, profil_id, casenavn, koebspris, oprettet_dato, beskrivelse, koebsomkostninger)
VALUES
    (1000, 100, 'Min foerste lejlighed', 3500000.00, '2026-04-10 09:30:00', 'Udlejning med fokus paa stabilt cashflow', 85000.00),
    (1001, 101, 'Pensionsopsparing Oesterbro', 4200000.00, '2026-04-10 10:30:00', 'Langsigtet investering med lav risiko', 95000.00),
    (1002, 102, 'Vesterbro Flip', 3000000.00, '2026-04-11 11:45:00', 'Case med renovering og videresalgspotentiale', 70000.00),
    (1003, 103, 'Familiebolig Strandvejen', 6500000.00, '2026-04-12 12:30:00', 'Stor bolig med mulighed for delvis udlejning', 125000.00),
    (1004, 104, 'Amager Udlejning', 2000000.00, '2026-04-13 13:30:00', 'Kompakt udlejningscase med lav entry-pris', 50000.00),
    (1005, 105, 'Koeb af Lyngby-huset', 2500000.00, '2026-04-14 14:40:00', 'Case til eget brug og langsigtet vaerdiudvikling', 60000.00);

SET IDENTITY_INSERT EjendomsInvest.Investeringscase OFF;
GO


-- 4. Opretter Laan
SET IDENTITY_INSERT EjendomsInvest.Laan ON;

INSERT INTO EjendomsInvest.Laan
    (laan_id, case_id, laanebeloeb, rente, loebetid_aar, afdragsfri_periode, laanetype)
VALUES
    (10000, 1000, 2800000.00, 4.50, 30, 10, 'Realkredit'),
    (10001, 1000, 500000.00, 6.50, 10, 0, 'Banklaan'),
    (10002, 1001, 3360000.00, 3.50, 30, 5, 'Realkredit'),
    (10003, 1002, 2400000.00, 4.25, 20, 0, 'Banklaan'),
    (10004, 1003, 5200000.00, 4.00, 30, 10, 'Realkredit'),
    (10005, 1004, 1600000.00, 5.00, 20, 0, 'Banklaan'),
    (10006, 1005, 2000000.00, 4.00, 30, 0, 'Realkredit');

SET IDENTITY_INSERT EjendomsInvest.Laan OFF;
GO


-- 5. Opretter Udlejning
-- Der oprettes maksimalt én udlejning pr. case, så UNIQUE-constrainten på case_id overholdes.
SET IDENTITY_INSERT EjendomsInvest.Udlejning ON;

INSERT INTO EjendomsInvest.Udlejning
    (udlejning_id, case_id, lejeindtaegt, udlejningsudgifter)
VALUES
    (40000, 1000, 12500.00, 1200.00),
    (40001, 1001, 15000.00, 1500.00),
    (40002, 1002, 11000.00, 1000.00),
    (40003, 1003, 25000.00, 3000.00),
    (40004, 1004, 8000.00, 900.00),
    (40005, 1005, 10000.00, 1000.00);

SET IDENTITY_INSERT EjendomsInvest.Udlejning OFF;
GO


-- 6. Opretter Renovering
SET IDENTITY_INSERT EjendomsInvest.Renovering ON;

INSERT INTO EjendomsInvest.Renovering
    (renovering_id, case_id, beskrivelse, udgift, aarstal)
VALUES
    (20000, 1000, 'Nyt koekken', 85000.00, 2026),
    (20001, 1000, 'Maling og gulve', 25000.00, 2026),
    (20002, 1002, 'Badevaerelsesrenovering', 120000.00, 2026),
    (20003, 1003, 'Energiforbedring af vinduer', 95000.00, 2027),
    (20004, 1005, 'Tagreparation', 150000.00, 2026);

SET IDENTITY_INSERT EjendomsInvest.Renovering OFF;
GO


-- 7. Opretter Driftsudgifter
SET IDENTITY_INSERT EjendomsInvest.Driftsudgift ON;

INSERT INTO EjendomsInvest.Driftsudgift
    (udgift_id, case_id, beskrivelse, beloeb, frekvens)
VALUES
    (30000, 1000, 'Forsikring', 6500.00, 'Aarlig'),
    (30001, 1000, 'Vedligeholdelse', 1200.00, 'Maanedlig'),
    (30002, 1000, 'Ejendomsskat', 9800.00, 'Aarlig'),
    (30003, 1001, 'Administration', 1500.00, 'Maanedlig'),
    (30004, 1002, 'Vedligeholdelse', 1000.00, 'Maanedlig'),
    (30005, 1003, 'Vedligeholdelse', 2500.00, 'Maanedlig'),
    (30006, 1004, 'Faellesudgifter', 900.00, 'Maanedlig'),
    (30007, 1005, 'Forsikring', 7000.00, 'Aarlig');

SET IDENTITY_INSERT EjendomsInvest.Driftsudgift OFF;
GO