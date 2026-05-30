const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase-service-account.json"); // Provide path if exists, else we can use firestore simulator REST API if it's local
