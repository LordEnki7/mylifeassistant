#!/usr/bin/env tsx
// Demonstration of the new modular AI architecture with intelligent data discovery

import { dataDiscoveryService } from '../server/ai/dataDiscovery';
import { aiProcessor } from '../server/ai/core';
import { storage } from '../server/storage';

async function demonstrateDataDiscovery() {
  console.log("🌟 SUNSHINE AI - MODULAR ARCHITECTURE DEMONSTRATION");
  console.log("=" .repeat(60));
  
  const testUserId = "demo-user-123";
  
  // Step 1: Create some sample data to discover
  console.log("\n📊 Creating sample data...");
  
  const sampleTask = await storage.createTask({
    userId: testUserId,
    title: "Review C.A.R.E.N. legal compliance requirements",
    description: "Analyze legal tech regulations for roadside assistance apps",
    priority: "high",
    category: "legal",
    status: "pending"
  });
  
  const sampleContact = await storage.createContact({
    userId: testUserId,
    name: "Alex Thompson",
    email: "alex@legaltechfund.org",
    company: "LegalTech Innovation Fund",
    type: "investor",
    notes: "Specializes in consumer protection technology grants"
  });
  
  const sampleGrant = await storage.createGrant({
    userId: testUserId,
    organization: "NSF Tech Innovation",
    title: "AI Safety in Consumer Applications",
    amount: "$500,000",
    deadline: new Date("2024-12-15"),
    status: "researched",
    requirements: "Must demonstrate public safety benefits",
    description: "Funding for AI systems that enhance consumer protection",
    applicationUrl: "https://nsf.gov/grants/ai-safety",
    notes: "Perfect match for C.A.R.E.N. project goals"
  });
  
  console.log(`✓ Created task: "${sampleTask.title}"`);
  console.log(`✓ Created contact: "${sampleContact.name}" at ${sampleContact.company}`);
  console.log(`✓ Created grant: "${sampleGrant.title}" - ${sampleGrant.amount}`);
  
  // Step 2: Test data discovery
  console.log("\n🔍 Testing intelligent data discovery...");
  
  const testQueries = [
    "legal compliance for apps",
    "grant funding for AI safety",
    "contacts in legal tech industry",
    "C.A.R.E.N. project requirements"
  ];
  
  for (const query of testQueries) {
    console.log(`\n   Query: "${query}"`);
    const discoveredData = await dataDiscoveryService.discoverData(query, testUserId);
    
    console.log(`   Found ${discoveredData.length} relevant items:`);
    discoveredData.forEach((item, index) => {
      const name = item.data.title || item.data.name || item.data.organization;
      const relevance = Math.round(item.relevance * 100);
      console.log(`     ${index + 1}. ${item.type}: "${name}" (${relevance}% match)`);
    });
  }
  
  // Step 3: Test full AI processing with modular core
  console.log("\n🧠 Testing modular AI core processing...");
  
  const testMessage = "Help me find grants for legal tech and create a task to apply for the most promising one";
  console.log(`\n   User message: "${testMessage}"`);
  
  const aiResponse = await aiProcessor.processMessage(testMessage, testUserId);
  
  console.log(`\n   AI Response: "${aiResponse.message}"`);
  console.log(`   Confidence: ${Math.round(aiResponse.confidence * 100)}%`);
  console.log(`   Discovered data items: ${aiResponse.discoveredData?.length || 0}`);
  console.log(`   Actions executed: ${aiResponse.actions?.length || 0}`);
  
  if (aiResponse.discoveredData && aiResponse.discoveredData.length > 0) {
    console.log("\n   Relevant discovered data:");
    aiResponse.discoveredData.forEach((item, index) => {
      const name = item.data.title || item.data.name || item.data.organization;
      console.log(`     - ${item.type}: "${name}" (${Math.round(item.relevance * 100)}% relevant)`);
    });
  }
  
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    console.log("\n   AI Actions executed:");
    aiResponse.actions.forEach((action, index) => {
      console.log(`     - ${action.type}: ${action.data.success ? '✓ Success' : '✗ Failed'}`);
      if (action.data.title) console.log(`       "${action.data.title}"`);
    });
  }
  
  // Step 4: Show architecture benefits
  console.log("\n🏗️  MODULAR ARCHITECTURE BENEFITS:");
  console.log("   ✓ Clean separation of concerns");
  console.log("   ✓ Intelligent data discovery across all systems");
  console.log("   ✓ Autonomous task completion");
  console.log("   ✓ Maintainable, testable code structure");
  console.log("   ✓ Enhanced error handling and monitoring");
  
  console.log("\n🌟 Demonstration complete! Sunshine is now powered by clean, modular AI architecture.");
}

// Run demonstration
demonstrateDataDiscovery().catch(console.error);