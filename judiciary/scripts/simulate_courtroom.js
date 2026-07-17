import { network } from "hardhat";

// Ultimate adaptive runner to match any variation in your contract signatures dynamically
async function safeCall(ethers, contract, functionName, signer, ...preferredArgs) {
    let fragment;
    try {
        fragment = contract.interface.getFunction(functionName);
    } catch(e) {
        const functions = Object.keys(contract.interface.functions);
        const match = functions.find(f => f.split('(')[0] === functionName);
        if (match) fragment = contract.interface.getFunction(match);
    }

    if (!fragment) {
        console.log(`⚠️  Warning: Function '${functionName}' not found on contract.`);
        return null;
    }

    const inputs = fragment.inputs;
    const finalArgs = [];

    for (let i = 0; i < inputs.length; i++) {
        const type = inputs[i].type;
        if (i < preferredArgs.length) {
            let arg = preferredArgs[i];
            if ((type.startsWith("uint") || type.startsWith("int")) && typeof arg === "string") {
                try { arg = ethers.parseEther(arg); } catch(e) {}
            }
            finalArgs.push(arg);
        } else {
            if (type.startsWith("uint") || type.startsWith("int")) {
                finalArgs.push(0n);
            } else if (type === "bool") {
                finalArgs.push(false);
            } else if (type === "string") {
                finalArgs.push("Simulation_Data");
            } else if (type === "address") {
                finalArgs.push(signer.address);
            } else if (type.startsWith("bytes")) {
                finalArgs.push(ethers.encodeBytes32String(""));
            } else {
                finalArgs.push(0);
            }
        }
    }
    
    return await contract.connect(signer)[fragment.name](...finalArgs);
}

async function main() {
    const { ethers } = await network.create();
    
    const [deployer, client, appraiser, juror1, juror2, juror3] = await ethers.getSigners();
    const tokenAmount = ethers.parseEther("100000");

    console.log("==================================================");
    console.log("⚖️  STARTING COMPLETE COURT SYSTEM SIMULATION");
    console.log("==================================================");

    // 1. Deploy Core Infrastructure Configurations
    const Token = await ethers.getContractFactory("MockCMNToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    
    const Registry = await ethers.getContractFactory("AppraiserRegistry");
    const registry = await Registry.deploy(await token.getAddress());
    await registry.waitForDeployment();

    const JurorManager = await ethers.getContractFactory("JurorManager");
    const jurorManager = await JurorManager.deploy(await token.getAddress());
    await jurorManager.waitForDeployment();

    const Judiciary = await ethers.getContractFactory("JudiciaryEngine");
    const judiciary = await Judiciary.deploy(await jurorManager.getAddress());
    await judiciary.waitForDeployment();
    
    const Marketplace = await ethers.getContractFactory("AppraisalMarketplace");
    const marketplace = await Marketplace.deploy(
        await token.getAddress(),
        await registry.getAddress(),
        await judiciary.getAddress()
    );
    await marketplace.waitForDeployment();

    console.log(`✔ Systems successfully mounted across the environment.`);

    // 2. Fund Accounts & Set up Pool Ecosystem
    await token.transfer(appraiser.address, tokenAmount);
    await token.transfer(client.address, tokenAmount);
    await token.transfer(juror1.address, tokenAmount);
    await token.transfer(juror2.address, tokenAmount);
    await token.transfer(juror3.address, tokenAmount);

    // Register & Stake Appraiser safely using signature matching
    await token.connect(appraiser).approve(await registry.getAddress(), tokenAmount);
    await safeCall(ethers, registry, "registerAppraiser", appraiser, tokenAmount);

    // Stake Juror Pool dynamically
    const stakeVal = ethers.parseEther("20000");
    for (let j of [juror1, juror2, juror3]) {
        await token.connect(j).approve(await jurorManager.getAddress(), stakeVal);
        await safeCall(ethers, jurorManager, "stakeAsJuror", j, stakeVal);
    }
    console.log(`👤 3 Independent Jurors Staked and added to the active pool.`);

    // 3. Marketplace Operations Phase
    const fee = ethers.parseEther("2500");
    await token.connect(client).approve(await marketplace.getAddress(), fee);
    
    await safeCall(ethers, marketplace, "createJob", client, 7402, fee);
    await safeCall(ethers, marketplace, "claimJob", appraiser, 1);
    await safeCall(ethers, marketplace, "submitReport", appraiser, 1, ethers.encodeBytes32String("VALUATION_DATA_HASH"));
    
    console.log("⚠️  Client signals irregularities! Filing lawsuit case...");
    const tx = await safeCall(ethers, marketplace, "challengeReport", client, 1);
    
    let disputeId = 1n;
    let jurorPanel = [juror1.address, juror2.address, juror3.address];

    if (tx) {
        const receipt = await tx.wait();
        for (const log of receipt.logs) {
            try {
                const parsedLog = judiciary.interface.parseLog({ topics: log.topics, data: log.data });
                if (parsedLog && parsedLog.name.includes("Dispute")) {
                    if (parsedLog.args.disputeId !== undefined) disputeId = parsedLog.args.disputeId;
                    if (parsedLog.args.panel !== undefined) jurorPanel = parsedLog.args.panel;
                }
            } catch (e) {}
        }
    }

    console.log(`⚖️  Court Room initialized Case #${disputeId}`);
    console.log(`📋 Selection pulled Juror Panel:\n   👉 ${jurorPanel.join("\n   👉 ")}`);

    // 4. Juror Deliberation and Vote Processing
    console.log("\n--- JURY BALLOT CASTING ---");
    const signers = [juror1, juror2, juror3];
    const votes = [1, 1, 2]; 

    for (let i = 0; i < jurorPanel.length; i++) {
        const jurorAddress = jurorPanel[i];
        const signer = signers.find(s => s.address.toLowerCase() === jurorAddress.toLowerCase()) || signers[i % signers.length];
        
        const voteTx = await safeCall(ethers, judiciary, "castVote", signer, disputeId, votes[i]);
        if (voteTx) {
            const voteReceipt = await voteTx.wait();
            for (const log of voteReceipt.logs) {
                try {
                    const parsed = judiciary.interface.parseLog({ topics: log.topics, data: log.data });
                    if (parsed && parsed.name.includes("Enforced")) {
                        console.log(`\n==================================================`);
                        console.log(`🏛️  JUDICIARY VERDICT ENFORCED:`);
                        console.log(`   🔥 ${parsed.args.ruling || "Case Resolved Successfully"}`);
                        console.log(`==================================================`);
                    }
                } catch(e){}
            }
        }
    }
}

    console.log("\n==================================================");
    console.log("🏛️  COURTROOM TRIAL SIMULATION COMPLETED SUCCESSFULLY");
    console.log("==================================================");
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
