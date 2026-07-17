import { expect } from "chai";
import hre from "hardhat"; // Import the Hardhat Runtime Environment

const { ethers, network } = hre; // Extract ethers from hre

describe("CMN Decentralized Judiciary Simulation", function () {
  it("Should register an appraiser...", async function () {
    // Your code continues here...
    const [owner, appraiser] = await ethers.getSigners();
    // ... rest of your existing logic
  });
});
