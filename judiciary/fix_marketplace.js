import fs from 'fs';

const artifactPath = 'artifacts/contracts/AppraiserRegistry.sol/AppraiserRegistry.json';

if (!fs.existsSync(artifactPath)) {
  console.error("❌ Registry artifact missing! Run 'npx hardhat compile' first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const func = artifact.abi.find(x => x.name === 'appraisers');

if (!func || !func.outputs) {
  console.error("❌ Could not find public 'appraisers' mapping inside ABI.");
  process.exit(1);
}

console.log("🔍 Detected Appraiser Struct fields from your registry:");
func.outputs.forEach((o, i) => {
  console.log(`   Field ${i}: Name="${o.name}", Type="${o.type}"`);
});

// Extract all outputs and create the variable names
const returnTypes = func.outputs.map(o => o.type).join(', ');
const decls = func.outputs.map((o, i) => `${o.type} val${i}`);
const destructuring = `(${decls.join(', ')}) = registry.appraisers(msg.sender);`;

// Dynamically locate the boolean fields by type instead of name strings
const boolIndices = [];
func.outputs.forEach((o, i) => {
  if (o.type === 'bool') {
    boolIndices.push(i);
  }
});

if (boolIndices.length < 2) {
  console.error("❌ Expected at least 2 boolean fields (isRegistered, blacklisted) in your appraisers mapping.");
  process.exit(1);
}

// Map the variables strictly to verified boolean fields
const registeredVar = `val${boolIndices[0]}`;
const blacklistedVar = `val${boolIndices[1]}`;

// Re-generate the fixed contract
const marketplaceContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICMNToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IAppraiserRegistry {
    function appraisers(address account) external view returns (${returnTypes});
}

interface IJudiciaryEngine {
    function initiateDispute(uint256 itemId, address appraiser) external;
}

contract AppraisalMarketplace {
    ICMNToken public token;
    IAppraiserRegistry public registry;
    IJudiciaryEngine public judiciary;

    enum JobStatus { Created, Claimed, Submitted, Disputed, Resolved }

    struct Job {
        uint256 id;
        uint256 itemId;
        address client;
        address appraiser;
        uint256 fee;
        bytes32 reportHash;
        JobStatus status;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, uint256 itemId, address indexed client, uint256 fee);
    event JobClaimed(uint256 indexed jobId, address indexed appraiser);
    event ReportSubmitted(uint256 indexed jobId, bytes32 reportHash);
    event JobChallenged(uint256 indexed jobId, uint256 itemId, address indexed appraiser);
    event JobCompleted(uint256 indexed jobId, address indexed appraiser, uint256 payout);

    constructor(address _token, address _registry, address _judiciary) {
        token = ICMNToken(_token);
        registry = IAppraiserRegistry(_registry);
        judiciary = IJudiciaryEngine(_judiciary);
    }

    function createJob(uint256 _itemId, uint256 _fee) external {
        require(_fee > 0, "Fee must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), _fee), "Escrow deposit failed");

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            itemId: _itemId,
            client: msg.sender,
            appraiser: address(0),
            fee: _fee,
            reportHash: bytes32(0),
            status: JobStatus.Created
        });

        emit JobCreated(jobCount, _itemId, msg.sender, _fee);
    }

    function claimJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Created, "Job not available");
        
        ${destructuring}
        require(${registeredVar}, "Appraiser not verified in registry");
        require(!${blacklistedVar}, "Appraiser is blacklisted");

        job.appraiser = msg.sender;
        job.status = JobStatus.Claimed;

        emit JobClaimed(_jobId, msg.sender);
    }

    function submitReport(uint256 _jobId, bytes32 _reportHash) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Claimed, "Job must be claimed first");
        require(msg.sender == job.appraiser, "Only assigned appraiser can submit");
        require(_reportHash != bytes32(0), "Invalid report hash");

        job.reportHash = _reportHash;
        job.status = JobStatus.Submitted;

        emit ReportSubmitted(_jobId, _reportHash);
    }

    function completeJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Submitted, "Report not submitted yet");
        require(msg.sender == job.client, "Only client can accept report");

        job.status = JobStatus.Resolved;
        require(token.transfer(job.appraiser, job.fee), "Payout failed");

        emit JobCompleted(_jobId, job.appraiser, job.fee);
    }

    function challengeReport(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Submitted, "No report to challenge");
        require(msg.sender == job.client, "Only client can challenge");

        job.status = JobStatus.Disputed;

        judiciary.initiateDispute(job.itemId, job.appraiser);

        emit JobChallenged(_jobId, job.itemId, job.appraiser);
    }
}
`;

fs.writeFileSync('contracts/AppraisalMarketplace.sol', marketplaceContract);
console.log("🛠️  Marketplace contract updated using strict type matching!");
