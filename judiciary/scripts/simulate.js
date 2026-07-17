import { network } from "hardhat";

async function main() {
  const { ethers, networkName } = await network.create();
  
  console.log("\n==================================================");
  console.log(`🛒 OPTION 1 INTEGRATION: MARKETPLACE & COURT SIMULATION`);
  console.log("==================================================\n");

  const [owner, appraiser, juror1, juror2, juror3, client] = await ethers.getSigners();
  const STAKE_100K = ethers.parseEther("100000");
  const STAKE_5K = ethers.parseEther("5000");
  const JOB_FEE = ethers.parseEther("2500");

  // 1. Deploy Core Architecture
  const Token = await ethers.getContractFactory("CMNToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const Registry = await ethers.getContractFactory("AppraiserRegistry");
  const registry = await Registry.deploy(tokenAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();

  const Judiciary = await ethers.getContractFactory("JudiciaryEngine");
  const judiciary = await Judiciary.deploy(tokenAddress, registryAddress);
  await judiciary.waitForDeployment();
  const judiciaryAddress = await judiciary.getAddress();

  await registry.setJudiciaryEngine(judiciaryAddress);

  // 2. Deploy the New Marketplace Module
  console.log("📦 Deploying AppraisalMarketplace...");
  const Marketplace = await ethers.getContractFactory("AppraisalMarketplace");
  const marketplace = await Marketplace.deploy(tokenAddress, registryAddress, judiciaryAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`   ✔ Marketplace active at: ${marketplaceAddress}\n`);

  // 3. Setup Allocations
  await token.transfer(appraiser.address, ethers.parseEther("150000"));
  await token.transfer(client.address, ethers.parseEther("20000"));
  await token.transfer(juror1.address, ethers.parseEther("10000"));
  await token.transfer(juror2.address, ethers.parseEther("10000"));
  await token.transfer(juror3.address, ethers.parseEther("10000"));

  // 4. Onboard Appraiser
  await token.connect(appraiser).approve(registryAddress, STAKE_100K);
  await registry.connect(appraiser).registerAppraiser();
  console.log("👤 Appraiser registered and staked 100k CMN.");

  // ================= MARKETPLACE WORKFLOW =================
  console.log("\n--- STARTING MARKETPLACE OPERATIONS ---");
  
  // Client creates work request
  await token.connect(client).approve(marketplaceAddress, JOB_FEE);
  await marketplace.connect(client).createJob(7402, JOB_FEE);
  console.log(`📥 Client listed appraisal request for Item 7402. Escrowed: 2,500 CMN.`);

  // Appraiser accepts assignment
  await marketplace.connect(appraiser).claimJob(1);
  console.log("✍️  Appraiser claimed Job #1 from marketplace.");

  // Appraiser uploads report hash proof
  const reportHash = ethers.id("EXPERT_VALUATION_REPORT_DATA_V1");
  await marketplace.connect(appraiser).submitReport(1, reportHash);
  console.log(`📄 Appraiser compiled valuation and committed report hash to chain.`);

  // Client issues a formal grievance challenge
  console.log("⚠️  Client disputes report validation! Redirecting job to Court System...");
  await marketplace.connect(client).challengeReport(1);

  // Verify Marketplace updated status internally to 'Disputed' (Index 3)
  const jobState = await marketplace.jobs(1);
  const statusLabels = ["Created", "Claimed", "Submitted", "Disputed", "Resolved"];
  console.log(`   📊 Marketplace Job #1 State updated to: ${statusLabels[jobState.status]}`);

  // ================= COURT TRIAL LAUNCHED UPSTREAM =================
  console.log("\n--- COURT TRIAL RESOLUTION ---");
  const salt1 = ethers.id("juror1");
  const salt2 = ethers.id("juror2");
  const salt3 = ethers.id("juror3");

  const hash1 = ethers.solidityPackedKeccak256(["uint8", "bytes32", "address"], [1, salt1, juror1.address]);
  const hash2 = ethers.solidityPackedKeccak256(["uint8", "bytes32", "address"], [1, salt2, juror2.address]);
  const hash3 = ethers.solidityPackedKeccak256(["uint8", "bytes32", "address"], [2, salt3, juror3.address]);

  await token.connect(juror1).approve(judiciaryAddress, STAKE_5K);
  await judiciary.connect(juror1).commitVote(1, hash1);
  await token.connect(juror2).approve(judiciaryAddress, STAKE_5K);
  await judiciary.connect(juror2).commitVote(1, hash2);
  await token.connect(juror3).approve(judiciaryAddress, STAKE_5K);
  await judiciary.connect(juror3).commitVote(1, hash3);

  // Time Warp to Reveal
  await owner.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
  await owner.provider.send("evm_mine");
  await judiciary.connect(juror1).revealVote(1, 1, salt1);
  await judiciary.connect(juror2).revealVote(1, 1, salt2);
  await judiciary.connect(juror3).revealVote(1, 2, salt3);

  // Time Warp to Resolution
  await owner.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
  await owner.provider.send("evm_mine");
  await judiciary.resolveDispute(1);

  // Check Final Results
  const appInfo = await registry.appraisers(appraiser.address);
  const marketEscrowBalance = await token.balanceOf(marketplaceAddress);
  
  console.log("\n==================================================");
  console.log("📊 INTEGRATED TRANSACTION RESULTS:");
  console.log(`   👉 Appraiser Slashed Status: ${appInfo.blacklisted}`);
  console.log(`   👉 Marketplace Escrow Balance: ${ethers.formatEther(marketEscrowBalance)} CMN`);
  console.log("==================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
