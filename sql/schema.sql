IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'EjendomsInvest')
BEGIN
    EXEC('CREATE SCHEMA EjendomsInvest');
END
GO

CREATE TABLE EjendomsInvest.Bruger (
    bruger_id INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    adgangskode_hash VARCHAR(255) NOT NULL,
    brugernavn VARCHAR(50) NOT NULL,
    CONSTRAINT PK_Bruger PRIMARY KEY (bruger_id),
    CONSTRAINT UQ_Bruger_Brugernavn UNIQUE (brugernavn),
    CONSTRAINT UQ_Bruger_Email UNIQUE (email)
);
GO

CREATE TABLE EjendomsInvest.Ejendomsprofil (
    profil_id INT IDENTITY(1,1) NOT NULL,
    bruger_id INT NOT NULL,
    adresse VARCHAR(200) NOT NULL,
    ejendomstype VARCHAR(50) NULL,
    byggeaar INT NULL,
    boligareal DECIMAL(10,2) NULL,
    grundareal DECIMAL(10,2) NULL,
    antal_vaerelser INT NULL,
    oprettet_dato DATETIME2 NOT NULL
        CONSTRAINT DF_Ejendomsprofil_oprettet_dato DEFAULT (sysdatetime()),
    sidst_indhentet_dato DATETIME2 NULL,
    CONSTRAINT PK_Ejendomsprofil PRIMARY KEY (profil_id),
    CONSTRAINT FK_Ejendomsprofil_Bruger
        FOREIGN KEY (bruger_id)
        REFERENCES EjendomsInvest.Bruger(bruger_id)
);
GO

CREATE TABLE EjendomsInvest.Investeringscase (
    case_id INT IDENTITY(1,1) NOT NULL,
    profil_id INT NOT NULL,
    casenavn VARCHAR(100) NOT NULL,
    koebspris DECIMAL(18,2) NOT NULL,
    oprettet_dato DATETIME2 NOT NULL
        CONSTRAINT DF_Investeringscase_oprettet_dato DEFAULT (sysdatetime()),
    beskrivelse VARCHAR(500) NULL,
    koebsomkostninger DECIMAL(18,2) NULL,
    CONSTRAINT PK_Investeringscase PRIMARY KEY (case_id),
    CONSTRAINT FK_Investeringscase_Ejendomsprofil
        FOREIGN KEY (profil_id)
        REFERENCES EjendomsInvest.Ejendomsprofil(profil_id),
    CONSTRAINT CHK_Investeringscase_Koebsomkostninger
        CHECK (koebsomkostninger >= 0),
    CONSTRAINT CHK_Investeringscase_Koebspris
        CHECK (koebspris > 0)
);
GO

CREATE TABLE EjendomsInvest.Laan (
    laan_id INT IDENTITY(1,1) NOT NULL,
    case_id INT NOT NULL,
    laanebeloeb DECIMAL(18,2) NOT NULL,
    rente DECIMAL(5,2) NOT NULL,
    loebetid_aar INT NOT NULL,
    afdragsfri_periode INT NULL,
    laanetype VARCHAR(50) NULL,
    CONSTRAINT PK_Laan PRIMARY KEY (laan_id),
    CONSTRAINT FK_Laan_Investeringscase
        FOREIGN KEY (case_id)
        REFERENCES EjendomsInvest.Investeringscase(case_id),
    CONSTRAINT CHK_Laan_AfdragsfriPeriode
        CHECK (
            afdragsfri_periode IS NULL
            OR (afdragsfri_periode >= 0 AND afdragsfri_periode <= loebetid_aar)
    ),
    CONSTRAINT CHK_Laan_Beloeb
        CHECK (laanebeloeb >= 0),
    CONSTRAINT CHK_Laan_Rente
        CHECK (rente >= 0),
    CONSTRAINT CHK_Laan_Loebetid
        CHECK (loebetid_aar > 0)
);
GO

CREATE TABLE EjendomsInvest.Renovering (
    renovering_id INT IDENTITY(1,1) NOT NULL,
    case_id INT NOT NULL,
    beskrivelse VARCHAR(200) NOT NULL,
    udgift DECIMAL(18,2) NOT NULL,
    aarstal INT NULL,
    CONSTRAINT PK_Renovering PRIMARY KEY (renovering_id),
    CONSTRAINT FK_Renovering_Investeringscase
        FOREIGN KEY (case_id)
        REFERENCES EjendomsInvest.Investeringscase(case_id),
    CONSTRAINT CHK_Renovering_Udgift
        CHECK (udgift >= 0)
);
GO

CREATE TABLE EjendomsInvest.Driftsudgift (
    udgift_id INT IDENTITY(1,1) NOT NULL,
    case_id INT NOT NULL,
    beskrivelse VARCHAR(200) NOT NULL,
    beloeb DECIMAL(18,2) NOT NULL,
    frekvens VARCHAR(20) NOT NULL
        CONSTRAINT DF_Driftsudgift_frekvens DEFAULT ('Aarlig'),
    CONSTRAINT PK_Driftsudgift PRIMARY KEY (udgift_id),
    CONSTRAINT FK_Driftsudgift_Investeringscase
        FOREIGN KEY (case_id)
        REFERENCES EjendomsInvest.Investeringscase(case_id),
    CONSTRAINT CHK_Driftsudgift_Beloeb
        CHECK (beloeb >= 0),
    CONSTRAINT CHK_Driftsudgift_Frekvens
        CHECK (
            frekvens IN ('Maanedlig', 'Kvartalsvis', 'Halvaarlig', 'Aarlig')
        )
);
GO

CREATE TABLE EjendomsInvest.Udlejning (
    udlejning_id INT IDENTITY(1,1) NOT NULL,
    case_id INT NOT NULL,
    lejeindtaegt DECIMAL(18,2) NOT NULL,
    udlejningsudgifter DECIMAL(18,2) NULL,
    CONSTRAINT PK_Udlejning PRIMARY KEY (udlejning_id),
    CONSTRAINT FK_Udlejning_Investeringscase
        FOREIGN KEY (case_id)
        REFERENCES EjendomsInvest.Investeringscase(case_id),
    CONSTRAINT UQ_Udlejning_case_id UNIQUE (case_id),
    CONSTRAINT CHK_Udlejning_Udlejningsudgifter
        CHECK (udlejningsudgifter >= 0),
    CONSTRAINT CHK_Udlejning_Lejeindtaegt
        CHECK (lejeindtaegt >= 0)
);
GO
