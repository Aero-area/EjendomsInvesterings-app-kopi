-- 1. Henter lånedetaljer for en specifik case

SELECT
    laan_id,
    laanebeloeb,
    rente,
    loebetid_aar,
    afdragsfri_periode,
    laanetype
FROM EjendomsInvest.Laan
WHERE case_id = 1001;


-- 2. Henter en komplet investeringscase med alle underentiteter via LEFT JOIN

SELECT 
    I.case_id,
    I.profil_id,
    I.casenavn,
    I.beskrivelse,
    I.koebspris,
    I.koebsomkostninger,
    I.oprettet_dato,
    L.laan_id,
    L.laanebeloeb,
    L.rente,
    L.loebetid_aar,
    L.afdragsfri_periode,
    L.laanetype,
    R.renovering_id,
    R.beskrivelse AS renovering_beskrivelse,
    R.udgift AS renovering_udgift,
    R.aarstal AS renovering_aarstal,
    D.udgift_id,
    D.beskrivelse AS drift_beskrivelse,
    D.beloeb AS drift_beloeb,
    D.frekvens,
    U.udlejning_id,
    U.lejeindtaegt,
    U.udlejningsudgifter
FROM EjendomsInvest.Investeringscase AS I
LEFT JOIN EjendomsInvest.Laan AS L
    ON I.case_id = L.case_id
LEFT JOIN EjendomsInvest.Renovering AS R
    ON I.case_id = R.case_id
LEFT JOIN EjendomsInvest.Driftsudgift AS D
    ON I.case_id = D.case_id
LEFT JOIN EjendomsInvest.Udlejning AS U
    ON I.case_id = U.case_id
WHERE I.case_id = 1001;


-- 3. Tæller antallet af tilknyttede cases pr. ejendomsprofil

SELECT
    E.profil_id,
    E.adresse,
    COUNT(I.case_id) AS antal_investeringscases
FROM EjendomsInvest.Ejendomsprofil AS E
LEFT JOIN EjendomsInvest.Investeringscase AS I
    ON E.profil_id = I.profil_id
WHERE E.bruger_id = 1
GROUP BY E.profil_id, E.adresse;


-- 4. Fremsøger ejendomsprofil via delvis adresse-match

SELECT
    profil_id,
    adresse,
    ejendomstype,
    byggeaar
FROM EjendomsInvest.Ejendomsprofil
WHERE adresse LIKE '%Noerrebro%';