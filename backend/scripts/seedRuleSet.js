require('dotenv').config();
const mongoose = require('mongoose');
const RuleSet = require('../models/RuleSet');
const fileRules = require('../config/rules.json');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await RuleSet.findOne({ version: fileRules.ruleSetVersion });
  if (existing) {
    console.log(`Rule set ${fileRules.ruleSetVersion} already exists in the database.`);
    // Update rules even if version exists (allows patching rules without version bump)
    await RuleSet.findByIdAndUpdate(existing._id, { rules: fileRules.rules, isActive: true });
    console.log(`Updated ${fileRules.rules.length} rules.`);
    process.exit(0);
  }

  // Deactivate all existing rule sets
  await RuleSet.updateMany({}, { isActive: false });

  await RuleSet.create({
    version: fileRules.ruleSetVersion,
    isActive: true,
    rules: fileRules.rules,
  });

  console.log(`✅ Rule set "${fileRules.ruleSetVersion}" seeded with ${fileRules.rules.length} rules.`);
  console.log(`   Source: ${fileRules.sourceTitle}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
