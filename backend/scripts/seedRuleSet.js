require('dotenv').config();
const mongoose = require('mongoose');
const RuleSet = require('../models/RuleSet');
const fileRules = require('../config/rules.json');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await RuleSet.findOne({ version: fileRules.ruleSetVersion });
  if (existing) {
    console.log(`Rule set ${fileRules.ruleSetVersion} already exists in the database.`);
    process.exit(0);
  }

  await RuleSet.updateMany({}, { isActive: false });
  await RuleSet.create({
    version: fileRules.ruleSetVersion,
    isActive: true,
    rules: fileRules.rules,
  });

  console.log(`Rule set ${fileRules.ruleSetVersion} seeded and set active.`);
  process.exit(0);
}
seed();
