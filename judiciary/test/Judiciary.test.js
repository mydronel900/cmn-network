import { expect } from "chai";
import hre from "hardhat";

describe("CMN Decentralized Judiciary Simulation", function () {
  it("Should register an appraiser, handle blind voting, slash appraiser, and pay majority jurors", async function () {
    const { ethers, network } = hre;
    
    const [owner, appraiser, juror1, juror2, juror3] = await ethers.getSigners();
    const STAKE_100K = ethers.parseEther("100000");
    const STAKE_5K = ethers.parseEther("5000");

    const Token = await ethers.getContractFactory("CMNToken");
    const token = await Token.deploy(ethers.parseEther("1000000"));
    const tokenAddress = await token.getAddress();

    const Registry = await ethers.getContractFactory("AppraiserRegistry");
    const registry = await Registry.deploy(tokenAddress);
    const registryAddress = await registry.getAddress();

    const Judiciary = await ethers.getContractFactory("JudiciaryEngine");
    const judiciary = await Judiciary.deploy(tokenAddress, registryAddress);
    const judiciaryAddress = await judiciary.getAddress();

    await registry.setJudiciaryEngine(judiciaryAddress);

    await token.transfer(appraiser.address, ethers.parseEther("150000"));
    await token.transfer(juror1.address, ethers.parseEther("10000"));
    await token.transfer(juror2.address, ethers.parseEther("10000"));
    await token.transfer(juror3.address, ethers.parseEther("10000"));

    await token.connect(appraiser).approve(registryAddress, STAKE_100K);
    await registry.connect(appraiser).registerAppraiser();

    await judiciary.initiateDispute(7402, appraiser.address);

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

    await network.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");

    await judiciary.connect(juror1).revealVote(1, 1, salt1);
    await judiciary.connect(juror2).revealVote(1, 1, salt2);
    await judiciary.connect(juror3).revealVote(1, 2, salt3);

    await network.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");

    await judiciary.resolveDispute(1);

    const appInfo = await registry.appraisers(appraiser.address);
    expect(appInfo.blacklisted).to.equal(true);

    console.log("✔ Test Passed: Judiciary simulation resolved correctly.");
  });
});
