/**
 * Presentation Layer — Internationalization (i18n) Dictionaries (`en`, `fr`, `de`, `es`).
 * Covers EU MiCA CASP, AMLR, Transfer of Funds Regulation (IVMS101), GDPR Art. 17,
 * and Midnight Compact (`KycAttestationV1` / Jubjub Schnorr) terminology.
 */

export type SupportedLocale = 'en' | 'fr' | 'de' | 'es';

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export interface TranslationDictionary {
  banner: {
    testOnlyBadge: string;
    syntheticNotice: string;
  };
  header: {
    title: string;
    subtitle: string;
    backendMode: string;
    embeddedMode: string;
    externalMode: string;
    clockLabel: string;
    advance7Days: string;
    advance5Years: string;
  };
  wallet: {
    title: string;
    simulatedMode: string;
    laceMode: string;
    connectLace: string;
    presetBuyer: string;
    presetSeller: string;
    presetInstitutional: string;
    walletKeyLabel: string;
    subjectRoleIdLabel: string;
    networkLabel: string;
  };
  tabs: {
    onboarding: string;
    attestation: string;
    complianceConsole: string;
  };
  onboarding: {
    personaGalleryTitle: string;
    personaGallerySubtitle: string;
    runOneShot: string;
    loadIntoForm: string;
    customProfileTitle: string;
    customerType: string;
    naturalPerson: string;
    legalEntity: string;
    givenName: string;
    familyName: string;
    nationality: string;
    countryOfResidence: string;
    legalName: string;
    lei: string;
    pepFlag: string;
    identityVerified: string;
    addressVerified: string;
    sourceOfFundsDeclared: string;
    sourceOfFundsDocumented: string;
    expectedVolumeEur: string;
    eddCompleted: string;
    submitOnboarding: string;
    assessmentTitle: string;
    decisionApprove: string;
    decisionRefer: string;
    decisionReject: string;
    amlRiskScore: string;
    kycLevel: string;
    sanctionsHit: string;
    eddRequired: string;
    riskFactors: string;
    gdprTitle: string;
    gdprSubtitle: string;
    requestErasureBtn: string;
  };
  attestation: {
    ownershipTitle: string;
    ownershipSubtitle: string;
    createChallengeBtn: string;
    submitProofBtn: string;
    walletVerifiedBadge: string;
    issueTitle: string;
    issueSubtitle: string;
    roleOriginator: string;
    roleBeneficiary: string;
    validityDays: string;
    issueBundleBtn: string;
    circuitVerifiedBadge: string;
    circuitFailedBadge: string;
    witnessSnippetTitle: string;
    bundleJsonTitle: string;
    copyBtn: string;
    copiedBtn: string;
  };
  compliance: {
    eddReviewTitle: string;
    eddReviewSubtitle: string;
    inspectCustomerBtn: string;
    completeEddBtn: string;
    keyManagementTitle: string;
    rotateKeyBtn: string;
    revokeKeyBtn: string;
    revocationTitle: string;
    revokeAttestationBtn: string;
    travelRuleTitle: string;
    travelRuleSubtitle: string;
    discloseTravelRuleBtn: string;
    commitmentMatchBadge: string;
    auditChainTitle: string;
    auditChainSubtitle: string;
    verifyChainBtn: string;
    chainValidBadge: string;
    chainBrokenBadge: string;
  };
}

export const TRANSLATIONS: Record<SupportedLocale, TranslationDictionary> = {
  en: {
    banner: {
      testOnlyBadge: 'TEST ONLY • SYNTHETIC DATA',
      syntheticNotice:
        'MiCA CASP Counterparty Simulator for Midnight dApp E2E testing. Never enter real personal data or live sanctions records.',
    },
    header: {
      title: 'EU Counterparty Simulator',
      subtitle: 'MiCA CASP • KYC/AML • IVMS101 Travel Rule • Jubjub Schnorr KycAttestationV1',
      backendMode: 'Backend Target',
      embeddedMode: 'Embedded Next.js CASP',
      externalMode: 'External Server (:8787)',
      clockLabel: 'Simulated Clock',
      advance7Days: '+8 Days (Expiry)',
      advance5Years: '+5 Years (AML Retention)',
    },
    wallet: {
      title: 'Midnight Wallet & Subject Role Context',
      simulatedMode: 'Simulated Test Keys',
      laceMode: 'Lace DApp Connector v4',
      connectLace: 'Connect Lace Extension',
      presetBuyer: 'Buyer Preset (0x65..)',
      presetSeller: 'Seller Preset (0x66..)',
      presetInstitutional: 'SPV Preset (0x67..)',
      walletKeyLabel: 'Shielded Coin Public Key (32-byte hex)',
      subjectRoleIdLabel: 'Contract Subject Role ID (32-byte hex)',
      networkLabel: 'Network',
    },
    tabs: {
      onboarding: '1. Customer Onboarding & CDD/EDD',
      attestation: '2. Wallet Proof & ZK Attestation Workbench',
      complianceConsole: '3. Officer, Notary & Audit Console',
    },
    onboarding: {
      personaGalleryTitle: 'Synthetic Fixture Personas',
      personaGallerySubtitle:
        'Select any EU regulatory persona to run one-shot onboarding + wallet verification + KycAttestationV1 signing, or load into the custom builder.',
      runOneShot: 'One-Shot Onboard & Attest',
      loadIntoForm: 'Load Profile',
      customProfileTitle: 'Custom Customer Due Diligence (CDD / EDD) Builder',
      customerType: 'Entity Type',
      naturalPerson: 'Natural Person',
      legalEntity: 'Legal Person (SPV / Corporate)',
      givenName: 'Given Name',
      familyName: 'Family Name',
      nationality: 'Nationality (ISO-2)',
      countryOfResidence: 'Residence (ISO-2, e.g. FR, XA)',
      legalName: 'Legal Entity Name',
      lei: 'LEI Identifier',
      pepFlag: 'Politically Exposed Person (PEP)',
      identityVerified: 'Identity Verified (EUDI PID / Passport)',
      addressVerified: 'Proof of Address Verified',
      sourceOfFundsDeclared: 'Declared Source of Funds',
      sourceOfFundsDocumented: 'Source of Funds Documented',
      expectedVolumeEur: 'Expected Transaction Volume (EUR)',
      eddCompleted: 'Enhanced Due Diligence (EDD) Approved',
      submitOnboarding: 'Run CDD/EDD Risk Assessment',
      assessmentTitle: 'CASP Risk Assessment & KYC Decision',
      decisionApprove: 'APPROVED',
      decisionRefer: 'REFERRED (MANUAL EDD)',
      decisionReject: 'REJECTED',
      amlRiskScore: 'AML Risk Score (0–255)',
      kycLevel: 'Assigned KYC Level',
      sanctionsHit: 'EU Sanctions Screening Hit',
      eddRequired: 'Enhanced Due Diligence Required',
      riskFactors: 'Triggered Risk Factors',
      gdprTitle: 'GDPR Art. 17 Erasure vs. AMLR 5-Year Retention',
      gdprSubtitle:
        'Test the interplay between GDPR right to erasure and AML 5-year record-keeping. Advance the simulated clock by +5 years to purge PII while keeping the hash-chained audit log intact.',
      requestErasureBtn: 'Request GDPR Erasure',
    },
    attestation: {
      ownershipTitle: 'Step 1: Self-Hosted Wallet Ownership Check (TFR > €1,000)',
      ownershipSubtitle:
        'Under EU Transfer of Funds Regulation (EU) 2023/1113, the CASP verifies control of the customer’s self-hosted shielded wallet before binding it to an attestation.',
      createChallengeBtn: '1. Issue Ownership Challenge',
      submitProofBtn: '2. Submit Ownership Proof',
      walletVerifiedBadge: 'Wallet Ownership Verified',
      issueTitle: 'Step 2: Sign KycAttestationV1 & Verify in Compact Circuit',
      issueSubtitle:
        'Generates the IVMS101 Travel Rule commitment, signs the KycAttestationV1 claims with Schnorr over Jubjub, and verifies the signature inside the compiled kyc-harness.compact circuit.',
      roleOriginator: 'Originator (Buyer / Payer)',
      roleBeneficiary: 'Beneficiary (Seller / Payee)',
      validityDays: 'Validity Window (Days)',
      issueBundleBtn: 'Sign & Issue KycAttestationV1',
      circuitVerifiedBadge: 'Verified In-Circuit (kyc-harness.compact)',
      circuitFailedBadge: 'Circuit Verification Failed',
      witnessSnippetTitle: 'Relying Contract Witness Snippet (bundleToWitness)',
      bundleJsonTitle: 'Signed AttestationBundle Wire JSON',
      copyBtn: 'Copy',
      copiedBtn: 'Copied!',
    },
    compliance: {
      eddReviewTitle: 'Officer Customer Inspection & EDD Approval',
      eddReviewSubtitle:
        'Inspect a referred customer (e.g., buyer-pep-no-edd) and mark Enhanced Due Diligence completed to upgrade them to Approved (L3).',
      inspectCustomerBtn: 'Inspect Customer',
      completeEddBtn: 'Approve EDD & Re-assess (Upgrade to L3)',
      keyManagementTitle: 'CASP Issuer Key Store (/.well-known/casp-keys)',
      rotateKeyBtn: 'Rotate Active Signing Key',
      revokeKeyBtn: 'Sign Self-Revocation',
      revocationTitle: 'Attestation Revocation (kycRevocationMessage)',
      revokeAttestationBtn: 'Sign Attestation Revocation',
      travelRuleTitle: 'Notary / Counterparty Travel Rule (IVMS101) Disclosure',
      travelRuleSubtitle:
        'Authorized recipients retrieve the off-chain IVMS101 payload and salt, then recompute sha256(tag || canonicalJson(record) || salt) to verify against the on-chain travelRuleRef.',
      discloseTravelRuleBtn: 'Disclose & Verify IVMS101 Record',
      commitmentMatchBadge: 'SHA-256 Commitment Matches On-Chain travelRuleRef',
      auditChainTitle: 'Tamper-Evident Hash-Chained Audit Log (AMLR)',
      auditChainSubtitle:
        'Every state transition is chained with sha256(prevHash || canonicalJson(entry)). Contains zero personal data so it survives GDPR erasure.',
      verifyChainBtn: 'Refresh & Verify Hash Chain',
      chainValidBadge: 'Audit Hash Chain Integrity Verified',
      chainBrokenBadge: 'Audit Chain Tampering Detected',
    },
  },
  fr: {
    banner: {
      testOnlyBadge: 'TEST UNIQUEMENT • DONNÉES SYNTHÉTIQUES',
      syntheticNotice:
        'Simulateur de contrepartie CASP MiCA pour tests E2E Midnight. Ne saisissez jamais de données personnelles réelles.',
    },
    header: {
      title: 'Simulateur de Contrepartie UE',
      subtitle: 'CASP MiCA • KYC/LCB-FT • Règle de Voyage IVMS101 • Schnorr Jubjub KycAttestationV1',
      backendMode: 'Cible Backend',
      embeddedMode: 'CASP Next.js Intégré',
      externalMode: 'Serveur Externe (:8787)',
      clockLabel: 'Horloge Simulée',
      advance7Days: '+8 Jours (Expiration)',
      advance5Years: '+5 Ans (Rétention LCB-FT)',
    },
    wallet: {
      title: 'Portefeuille Midnight & Rôle du Sujet',
      simulatedMode: 'Clés de Test Simulées',
      laceMode: 'Connecteur Lace DApp v4',
      connectLace: 'Connecter Lace',
      presetBuyer: 'Préréglage Acheteur (0x65..)',
      presetSeller: 'Préréglage Vendeur (0x66..)',
      presetInstitutional: 'Préréglage SPV (0x67..)',
      walletKeyLabel: 'Clé Publique Shielded Coin (32 octets hex)',
      subjectRoleIdLabel: 'Identifiant de Rôle du Sujet (32 octets hex)',
      networkLabel: 'Réseau',
    },
    tabs: {
      onboarding: '1. Entrée en Relation & Vigilance (CDD/EDD)',
      attestation: '2. Preuve Portefeuille & Attestation ZK',
      complianceConsole: '3. Console Conformité, Notaire & Audit',
    },
    onboarding: {
      personaGalleryTitle: 'Personas Synthétiques de Test',
      personaGallerySubtitle:
        'Sélectionnez un profil réglementaire européen pour exécuter l’évaluation et signer une attestation KycAttestationV1 en un clic.',
      runOneShot: 'Exécution 1-Clic & Attestation',
      loadIntoForm: 'Charger le Profil',
      customProfileTitle: 'Formulaire de Vigilance Client (CDD / EDD)',
      customerType: 'Type d’Entité',
      naturalPerson: 'Personne Physique',
      legalEntity: 'Personne Morale (SPV / Société)',
      givenName: 'Prénom',
      familyName: 'Nom de Famille',
      nationality: 'Nationalité (ISO-2)',
      countryOfResidence: 'Résidence (ISO-2, ex. FR, XA)',
      legalName: 'Raison Sociale',
      lei: 'Identifiant LEI',
      pepFlag: 'Personne Politiquement Exposée (PPE)',
      identityVerified: 'Identité Vérifiée (PID EUDI / Passeport)',
      addressVerified: 'Justificatif de Domicile Vérifié',
      sourceOfFundsDeclared: 'Origine des Fonds Déclarée',
      sourceOfFundsDocumented: 'Origine des Fonds Documentée',
      expectedVolumeEur: 'Volume de Transaction Prévu (EUR)',
      eddCompleted: 'Vigilance Renforcée (EDD) Approuvée',
      submitOnboarding: 'Évaluer le Risque LCB-FT',
      assessmentTitle: 'Évaluation des Risques CASP & Décision KYC',
      decisionApprove: 'APPROUVÉ',
      decisionRefer: 'RÉFÉRÉ (EDD REQUISE)',
      decisionReject: 'REJETÉ',
      amlRiskScore: 'Score de Risque LCB-FT (0–255)',
      kycLevel: 'Niveau KYC Attribué',
      sanctionsHit: 'Alerte Liste de Sanctions UE',
      eddRequired: 'Vigilance Renforcée Requise',
      riskFactors: 'Facteurs de Risque Détectés',
      gdprTitle: 'Effacement RGPD Art. 17 vs Conservation LCB-FT (5 ans)',
      gdprSubtitle:
        'Testez la restriction pendant la période légale de conservation de 5 ans puis la purge des données personnelles après avancement de l’horloge.',
      requestErasureBtn: 'Demander l’Effacement RGPD',
    },
    attestation: {
      ownershipTitle: 'Étape 1 : Preuve de Détention du Portefeuille Auto-Hébergé',
      ownershipSubtitle:
        'Conformément au Règlement sur les transferts de fonds (UE) 2023/1113, le CASP vérifie le contrôle du portefeuille avant d’émettre une attestation.',
      createChallengeBtn: '1. Créer le Défi',
      submitProofBtn: '2. Soumettre la Preuve',
      walletVerifiedBadge: 'Portefeuille Vérifié',
      issueTitle: 'Étape 2 : Signer KycAttestationV1 & Vérifier dans le Circuit Compact',
      issueSubtitle:
        'Génère l’engagement IVMS101 salé, signe avec Schnorr sur Jubjub et vérifie la signature dans le circuit compilé kyc-harness.compact.',
      roleOriginator: 'Donneur d’ordre (Acheteur)',
      roleBeneficiary: 'Bénéficiaire (Vendeur)',
      validityDays: 'Durée de Validité (Jours)',
      issueBundleBtn: 'Signer & Émettre KycAttestationV1',
      circuitVerifiedBadge: 'Vérifié dans le Circuit (kyc-harness.compact)',
      circuitFailedBadge: 'Échec de Vérification Circuit',
      witnessSnippetTitle: 'Extrait Witness TypeScript (bundleToWitness)',
      bundleJsonTitle: 'Paquet JSON AttestationBundle Signé',
      copyBtn: 'Copier',
      copiedBtn: 'Copié !',
    },
    compliance: {
      eddReviewTitle: 'Inspection Conformité & Validation EDD',
      eddReviewSubtitle:
        'Inspectez un dossier référé (ex. buyer-pep-no-edd) et validez la vigilance renforcée pour débloquer le niveau L3.',
      inspectCustomerBtn: 'Inspecter le Client',
      completeEddBtn: 'Valider EDD & Réévaluer (Niveau L3)',
      keyManagementTitle: 'Clés d’Émetteur CASP (/.well-known/casp-keys)',
      rotateKeyBtn: 'Effectuer une Rotation de Clé',
      revokeKeyBtn: 'Signer Auto-Révocation',
      revocationTitle: 'Révocation d’Attestation (kycRevocationMessage)',
      revokeAttestationBtn: 'Signer la Révocation',
      travelRuleTitle: 'Divulgation Règle de Voyage (IVMS101) — Notaire / Officier',
      travelRuleSubtitle:
        'Révèle l’enregistrement IVMS101 hors chaîne et son sel, puis recalcule l’empreinte SHA-256 pour vérifier travelRuleRef.',
      discloseTravelRuleBtn: 'Divulguer & Vérifier IVMS101',
      commitmentMatchBadge: 'Empreinte SHA-256 Conforme au travelRuleRef On-Chain',
      auditChainTitle: 'Journal d’Audit Chaîné par Hachage (LCB-FT)',
      auditChainSubtitle:
        'Chaque événement est chaîné par sha256(prevHash || canonicalJson(entry)) sans aucune donnée personnelle.',
      verifyChainBtn: 'Rafraîchir & Vérifier la Chaîne',
      chainValidBadge: 'Intégrité de la Chaîne d’Audit Vérifiée',
      chainBrokenBadge: 'Altération Détectée',
    },
  },
  de: {
    banner: {
      testOnlyBadge: 'NUR FÜR TESTS • SYNTHETISCHE DATEN',
      syntheticNotice:
        'MiCA-CASP-Gegenparteisimulator für Midnight-dApp-Tests. Geben Sie niemals echte personenbezogene Daten ein.',
    },
    header: {
      title: 'EU-Gegenpartei-Simulator',
      subtitle: 'MiCA CASP • KYC/AML • IVMS101 Travel Rule • Jubjub Schnorr KycAttestationV1',
      backendMode: 'Backend-Ziel',
      embeddedMode: 'Integrierter Next.js CASP',
      externalMode: 'Externer Server (:8787)',
      clockLabel: 'Simulierte Uhr',
      advance7Days: '+8 Tage (Ablauf)',
      advance5Years: '+5 Jahre (AML-Aufbewahrung)',
    },
    wallet: {
      title: 'Midnight-Wallet & Subjekt-Rollenkontext',
      simulatedMode: 'Simulierte Testschlüssel',
      laceMode: 'Lace DApp Connector v4',
      connectLace: 'Lace Verbinden',
      presetBuyer: 'Käufer-Preset (0x65..)',
      presetSeller: 'Verkäufer-Preset (0x66..)',
      presetInstitutional: 'SPV-Preset (0x67..)',
      walletKeyLabel: 'Shielded Coin Public Key (32-Byte Hex)',
      subjectRoleIdLabel: 'Subjekt-Rollen-ID (32-Byte Hex)',
      networkLabel: 'Netzwerk',
    },
    tabs: {
      onboarding: '1. Kunden-Onboarding & Sorgfaltspflicht (CDD/EDD)',
      attestation: '2. Wallet-Nachweis & ZK-Attestierung',
      complianceConsole: '3. Compliance-, Notar- & Audit-Konsole',
    },
    onboarding: {
      personaGalleryTitle: 'Synthetische Test-Personas',
      personaGallerySubtitle:
        'Wählen Sie eine Persona für das 1-Klick-Onboarding mit KycAttestationV1-Signierung oder laden Sie das Profil in das Formular.',
      runOneShot: '1-Klick Onboarding & Attest',
      loadIntoForm: 'Profil Laden',
      customProfileTitle: 'Kundensorgfaltspflicht-Konfigurator (CDD / EDD)',
      customerType: 'Rechtsform',
      naturalPerson: 'Natürliche Person',
      legalEntity: 'Juristische Person (SPV / GmbH)',
      givenName: 'Vorname',
      familyName: 'Nachname',
      nationality: 'Staatsangehörigkeit (ISO-2)',
      countryOfResidence: 'Wohnsitzland (ISO-2, z.B. DE, XA)',
      legalName: 'Firmenname',
      lei: 'LEI-Kennung',
      pepFlag: 'Politisch exponierte Person (PEP)',
      identityVerified: 'Identität geprüft (EUDI-PID / Reisepass)',
      addressVerified: 'Adressnachweis geprüft',
      sourceOfFundsDeclared: 'Deklarierte Mittelherkunft',
      sourceOfFundsDocumented: 'Mittelherkunft dokumentiert',
      expectedVolumeEur: 'Erwartetes Volumen (EUR)',
      eddCompleted: 'Verstärkte Sorgfaltspflicht (EDD) abgeschlossen',
      submitOnboarding: 'CDD/EDD-Risikoprüfung starten',
      assessmentTitle: 'CASP-Risikobewertung & KYC-Entscheidung',
      decisionApprove: 'GENEHMIGT',
      decisionRefer: 'ZURÜCKGESTELLT (EDD ERFORDERLICH)',
      decisionReject: 'ABGELEHNT',
      amlRiskScore: 'AML-Risikowert (0–255)',
      kycLevel: 'KYC-Stufe',
      sanctionsHit: 'EU-Sanktionslistentreffer',
      eddRequired: 'Verstärkte Sorgfaltspflicht (EDD) nötig',
      riskFactors: 'Ausgelöste Risikofaktoren',
      gdprTitle: 'DSGVO Art. 17 Löschung vs. 5 Jahre AML-Aufbewahrung',
      gdprSubtitle:
        'Prüfen Sie die Sperrung während der 5-jährigen Aufbewahrungsfrist und die anschließende Löschung personenbezogener Daten.',
      requestErasureBtn: 'DSGVO-Löschung anfordern',
    },
    attestation: {
      ownershipTitle: 'Schritt 1: Inhaberschaftsnachweis für Self-Hosted Wallet',
      ownershipSubtitle:
        'Gemäß EU-Geldtransferverordnung (EU) 2023/1113 prüft der CASP die Kontrolle über die Wallet vor der Attestierung.',
      createChallengeBtn: '1. Challenge anfordern',
      submitProofBtn: '2. Nachweis senden',
      walletVerifiedBadge: 'Wallet-Inhaberschaft bestätigt',
      issueTitle: 'Schritt 2: KycAttestationV1 signieren & im Compact-Circuit prüfen',
      issueSubtitle:
        'Erzeugt den IVMS101-Anker, signiert mit Schnorr über Jubjub und verifiziert die Signatur im kompilierten kyc-harness.compact-Circuit.',
      roleOriginator: 'Auftraggeber (Käufer)',
      roleBeneficiary: 'Begünstigter (Verkäufer)',
      validityDays: 'Gültigkeit (Tage)',
      issueBundleBtn: 'KycAttestationV1 signieren & ausstellen',
      circuitVerifiedBadge: 'Im Circuit verifiziert (kyc-harness.compact)',
      circuitFailedBadge: 'Circuit-Prüfung fehlgeschlagen',
      witnessSnippetTitle: 'Witness-Codeausschnitt (bundleToWitness)',
      bundleJsonTitle: 'Signiertes AttestationBundle JSON',
      copyBtn: 'Kopieren',
      copiedBtn: 'Kopiert!',
    },
    compliance: {
      eddReviewTitle: 'Compliance-Prüfung & EDD-Freigabe',
      eddReviewSubtitle:
        'Überprüfen Sie zurückgestellte Kunden (z.B. buyer-pep-no-edd) und schalten Sie nach EDD-Prüfung Stufe L3 frei.',
      inspectCustomerBtn: 'Kundenakte laden',
      completeEddBtn: 'EDD freigeben & neu bewerten (Stufe L3)',
      keyManagementTitle: 'CASP-Ausstellerschlüssel (/.well-known/casp-keys)',
      rotateKeyBtn: 'Aktiven Schlüssel rotieren',
      revokeKeyBtn: 'Selbstwiderruf signieren',
      revocationTitle: 'Attestierungswiderruf (kycRevocationMessage)',
      revokeAttestationBtn: 'Widerruf signieren',
      travelRuleTitle: 'Travel Rule (IVMS101) Offenlegung für Notar / Aufsicht',
      travelRuleSubtitle:
        'Offenlegung des IVMS101-Datensatzes nebst Salt und clientseitige SHA-256-Gegenprüfung gegen travelRuleRef.',
      discloseTravelRuleBtn: 'IVMS101 offenlegen & prüfen',
      commitmentMatchBadge: 'SHA-256-Commitment stimmt mit travelRuleRef überein',
      auditChainTitle: 'Manipulationssicheres Hash-Chain-Audit-Log (AMLR)',
      auditChainSubtitle:
        'Jeder Eintrag ist über sha256(prevHash || canonicalJson(entry)) verkettet und frei von personenbezogenen Daten.',
      verifyChainBtn: 'Audit-Kette laden & verifizieren',
      chainValidBadge: 'Integrität der Audit-Hash-Kette bestätigt',
      chainBrokenBadge: 'Manipulation erkannt',
    },
  },
  es: {
    banner: {
      testOnlyBadge: 'SOLO PRUEBAS • DATOS SINTÉTICOS',
      syntheticNotice:
        'Simulador de contraparte CASP MiCA para pruebas E2E en Midnight. Nunca introduzca datos personales reales.',
    },
    header: {
      title: 'Simulador de Contraparte UE',
      subtitle: 'CASP MiCA • KYC/AML • Regla de Viaje IVMS101 • Schnorr Jubjub KycAttestationV1',
      backendMode: 'Destino Backend',
      embeddedMode: 'CASP Next.js Integrado',
      externalMode: 'Servidor Externo (:8787)',
      clockLabel: 'Reloj Simulado',
      advance7Days: '+8 Días (Expiración)',
      advance5Years: '+5 Años (Retención AML)',
    },
    wallet: {
      title: 'Billetera Midnight y Rol del Sujeto',
      simulatedMode: 'Claves de Prueba Simuladas',
      laceMode: 'Conector Lace DApp v4',
      connectLace: 'Conectar Lace',
      presetBuyer: 'Preajuste Comprador (0x65..)',
      presetSeller: 'Preajuste Vendedor (0x66..)',
      presetInstitutional: 'Preajuste SPV (0x67..)',
      walletKeyLabel: 'Clave Pública Shielded Coin (32 bytes hex)',
      subjectRoleIdLabel: 'ID de Rol del Sujeto (32 bytes hex)',
      networkLabel: 'Red',
    },
    tabs: {
      onboarding: '1. Alta de Cliente y Diligencia Debida (CDD/EDD)',
      attestation: '2. Prueba de Billetera y Atestación ZK',
      complianceConsole: '3. Consola de Cumplimiento, Notario y Auditoría',
    },
    onboarding: {
      personaGalleryTitle: 'Personas Sintéticas de Prueba',
      personaGallerySubtitle:
        'Seleccione una persona regulada de la UE para ejecutar el alta en un clic y firmar KycAttestationV1, o cárguela en el formulario.',
      runOneShot: 'Alta 1-Clic y Atestación',
      loadIntoForm: 'Cargar Perfil',
      customProfileTitle: 'Constructor de Diligencia Debida (CDD / EDD)',
      customerType: 'Tipo de Entidad',
      naturalPerson: 'Persona Física',
      legalEntity: 'Persona Jurídica (SPV / Sociedad)',
      givenName: 'Nombre',
      familyName: 'Apellidos',
      nationality: 'Nacionalidad (ISO-2)',
      countryOfResidence: 'Residencia (ISO-2, ej. ES, XA)',
      legalName: 'Denominación Social',
      lei: 'Código LEI',
      pepFlag: 'Persona Políticamente Expuesta (PEP)',
      identityVerified: 'Identidad Verificada (PID EUDI / Pasaporte)',
      addressVerified: 'Domicilio Verificado',
      sourceOfFundsDeclared: 'Origen de Fondos Declarado',
      sourceOfFundsDocumented: 'Origen de Fondos Documentado',
      expectedVolumeEur: 'Volumen Esperado (EUR)',
      eddCompleted: 'Diligencia Debida Reforzada (EDD) Completada',
      submitOnboarding: 'Ejecutar Evaluación de Riesgo AML',
      assessmentTitle: 'Evaluación de Riesgo CASP y Decisión KYC',
      decisionApprove: 'APROBADO',
      decisionRefer: 'DERIVADO (REQUIERE EDD)',
      decisionReject: 'RECHAZADO',
      amlRiskScore: 'Puntuación de Riesgo AML (0–255)',
      kycLevel: 'Nivel KYC Asignado',
      sanctionsHit: 'Coincidencia en Lista de Sanciones UE',
      eddRequired: 'Diligencia Reforzada Requerida',
      riskFactors: 'Factores de Riesgo Detectados',
      gdprTitle: 'Supresión RGPD Art. 17 vs. Retención AML de 5 Años',
      gdprSubtitle:
        'Pruebe la restricción durante los 5 años de retención legal y el borrado definitivo tras avanzar el reloj simulado.',
      requestErasureBtn: 'Solicitar Supresión RGPD',
    },
    attestation: {
      ownershipTitle: 'Paso 1: Verificación de Titularidad de Billetera Autoalojada',
      ownershipSubtitle:
        'Bajo el Reglamento de Transferencia de Fondos (UE) 2023/1113, el CASP verifica el control de la billetera antes de emitir la atestación.',
      createChallengeBtn: '1. Emitir Desafío',
      submitProofBtn: '2. Enviar Prueba',
      walletVerifiedBadge: 'Titularidad de Billetera Verificada',
      issueTitle: 'Paso 2: Firmar KycAttestationV1 y Verificar en Circuito Compact',
      issueSubtitle:
        'Genera el compromiso IVMS101 con sal, firma con Schnorr sobre Jubjub y verifica la firma dentro del circuito compilado kyc-harness.compact.',
      roleOriginator: 'Ordenante (Comprador)',
      roleBeneficiary: 'Beneficiario (Vendedor)',
      validityDays: 'Días de Validez',
      issueBundleBtn: 'Firmar y Emitir KycAttestationV1',
      circuitVerifiedBadge: 'Verificado en Circuito (kyc-harness.compact)',
      circuitFailedBadge: 'Fallo de Verificación en Circuito',
      witnessSnippetTitle: 'Fragmento Witness TypeScript (bundleToWitness)',
      bundleJsonTitle: 'JSON de AttestationBundle Firmado',
      copyBtn: 'Copiar',
      copiedBtn: '¡Copiado!',
    },
    compliance: {
      eddReviewTitle: 'Inspección de Oficial y Aprobación EDD',
      eddReviewSubtitle:
        'Inspeccione un cliente derivado (ej. buyer-pep-no-edd) y apruebe la EDD para elevarlo a Nivel L3.',
      inspectCustomerBtn: 'Inspeccionar Cliente',
      completeEddBtn: 'Aprobar EDD y Reevaluar (Nivel L3)',
      keyManagementTitle: 'Claves de Emisor CASP (/.well-known/casp-keys)',
      rotateKeyBtn: 'Rotar Clave Activa',
      revokeKeyBtn: 'Firmar Autorrevocación',
      revocationTitle: 'Revocación de Atestación (kycRevocationMessage)',
      revokeAttestationBtn: 'Firmar Revocación de Atestación',
      travelRuleTitle: 'Divulgación de Regla de Viaje (IVMS101) — Notario / Oficial',
      travelRuleSubtitle:
        'Recupera el registro IVMS101 y su sal, y recalcula el hash SHA-256 para comprobarlo frente a travelRuleRef.',
      discloseTravelRuleBtn: 'Divulgar y Verificar IVMS101',
      commitmentMatchBadge: 'Compromiso SHA-256 Coincide con travelRuleRef On-Chain',
      auditChainTitle: 'Registro de Auditoría Encadenado por Hash (AMLR)',
      auditChainSubtitle:
        'Cada evento se encadena con sha256(prevHash || canonicalJson(entry)) sin datos personales.',
      verifyChainBtn: 'Actualizar y Verificar Cadena',
      chainValidBadge: 'Integridad de la Cadena de Auditoría Verificada',
      chainBrokenBadge: 'Manipulación Detectada',
    },
  },
};
