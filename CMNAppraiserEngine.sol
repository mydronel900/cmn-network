// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CMN Appraiser & Vested Trust Engine
 * @notice Handles decentralized staking, linear fee vesting, and judiciary slashing mechanisms.
 */
contract CMNAppraiserEngine is AccessControl {
    bytes32 public constant JUDICIARY_ROLE = keccak256("JUDICIARY_ROLE");
    bytes32 public constant CORE_ENGINE_ROLE = keccak256("CORE_ENGINE_ROLE");

    IERC20 public immutable cmnToken;

    uint256 public constant MIN_STAKE = 100000 * 10**18; // 100,000 CMN
    uint256 public constant VESTING_DURATION = 365 days; // 12 Months linear vesting
    uint256 public constant APPRAISAL_FEE_BPS = 250;     // 2.5% (Basis Points)

    enum AppraiserStatus { NonExistent, Active, Suspended, Blacklisted }

    struct AppraiserProfile {
        uint256 stakedCollateral;
        uint256 trustRating;        // Baseline 10,000 (100.00%)
        AppraiserStatus status;
        uint256 totalAppraisalsHandled;
    }

    struct VestingSchedule {
        uint256 totalFeeAllocated;
        uint256 amountClaimed;
        uint32 startTime;
        uint32 endTime;
        bool isSlashed;
    }

    // Storage Mappings
    mapping(address => AppraiserProfile) public appraisers;
    // Appraiser Address => Asset ID => Vesting Data
    mapping(address => mapping(uint256 => VestingSchedule)) public vestingSchedules;
    // Asset ID => Assigned Appraiser Address
    mapping(uint256 => address) public assetToAppraiser;

    // Events
    event AppraiserRegistered(address indexed appraiser, uint256 stake);
    event AppraisalVestingInitialized(address indexed appraiser, uint256 indexed assetId, uint256 totalFee);
    event FeesClaimed(address indexed appraiser, uint256 indexed assetId, uint256 amount);
    event AppraiserSlashed(address indexed appraiser, uint256 indexed assetId, uint256 burnedStake, uint256 reclaimedFees);

    constructor(address _cmnToken) {
        cmnToken = IERC20(_cmnToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Allows an external node to lock 100k CMN and enter the active appraiser pool.
     */
    function stakeAndRegister() external {
        require(appraisers[msg.sender].status == AppraiserStatus.NonExistent, "Already registered");
        
        appraisers[msg.sender] = AppraiserProfile({
            stakedCollateral: MIN_STAKE,
            trustRating: 10000,
            status: AppraiserStatus.Active,
            totalAppraisalsHandled: 0
        });

        emit AppraiserRegistered(msg.sender, MIN_STAKE);
        require(cmnToken.transferFrom(msg.sender, address(this), MIN_STAKE), "Stake transfer failed");
    }

    /**
     * @notice Triggered by the Core Engine when an RWA asset valuation passes network consensus.
     * @dev Calculates the 2.5% fee and locks it into a temporal vesting matrix.
     */
    function initiateAppraisalVesting(address _appraiser, uint256 _assetId, uint256 _appraisedValue) 
        external 
        onlyRole(CORE_ENGINE_ROLE) 
    {
        AppraiserProfile storage profile = appraisers[_appraiser];
        require(profile.status == AppraiserStatus.Active, "Appraiser not active");

        uint256 totalFee = (_appraisedValue * APPRAISAL_FEE_BPS) / 10000;
        
        vestingSchedules[_appraiser][_assetId] = VestingSchedule({
            totalFeeAllocated: totalFee,
            amountClaimed: 0,
            startTime: uint32(block.timestamp),
            endTime: uint32(block.timestamp + VESTING_DURATION),
            isSlashed: false
        });

        assetToAppraiser[_assetId] = _appraiser;
        profile.totalAppraisalsHandled++;

        emit AppraisalVestingInitialized(_appraiser, _assetId, totalFee);
    }

    /**
     * @notice Read-only tracker calculating precise linear fee allocation down to the block timestamp.
     */
    function claimableAmount(address _appraiser, uint256 _assetId) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[_appraiser][_assetId];
        if (schedule.isSlashed || block.timestamp <= schedule.startTime) return 0;
        if (block.timestamp >= schedule.endTime) return schedule.totalFeeAllocated - schedule.amountClaimed;

        uint256 timeElapsed = block.timestamp - schedule.startTime;
        uint256 totalVested = (schedule.totalFeeAllocated * timeElapsed) / VESTING_DURATION;
        return totalVested - schedule.amountClaimed;
    }

    /**
     * @notice Allows appraisers to safely extract their accrued fees at any point during the 12-month window.
     */
    function claimVestedFees(uint256 _assetId) external {
        uint256 reward = claimableAmount(msg.sender, _assetId);
        require(reward > 0, "No rewards claimable");

        vestingSchedules[msg.sender][_assetId].amountClaimed += reward;
        
        emit FeesClaimed(msg.sender, _assetId, reward);
        require(cmnToken.transfer(msg.sender, reward), "Token payout failed");
    }

    /**
     * @notice The Slashing Hammer. Invoked strictly by the Decentralized Judiciary cluster.
     * @dev Permanently burns the locked 100k CMN stake and channels unvested rewards back to the pool.
     */
    function slashAppraiser(uint256 _assetId, address _communityPool) external onlyRole(JUDICIARY_ROLE) {
        address maliciousAppraiser = assetToAppraiser[_assetId];
        AppraiserProfile storage profile = appraisers[maliciousAppraiser];
        VestingSchedule storage schedule = vestingSchedules[maliciousAppraiser][_assetId];

        require(profile.status != AppraiserStatus.Blacklisted, "Already blacklisted");
        require(!schedule.isSlashed, "Schedule already slashed");

        uint256 rawStakeToBurn = profile.stakedCollateral;
        uint256 unvestedFeesToReclaim = schedule.totalFeeAllocated - schedule.amountClaimed;

        // Hard cryptoeconomic state wipe
        profile.stakedCollateral = 0;
        profile.status = AppraiserStatus.Blacklisted;
        profile.trustRating = 0;
        schedule.isSlashed = true;

        emit AppraiserSlashed(maliciousAppraiser, _assetId, rawStakeToBurn, unvestedFeesToReclaim);

        // Send collateral stake directly to the 0x0...dEaD address to permanently remove from circulation
        require(cmnToken.transfer(address(0x000000000000000000000000000000000000dEaD), rawStakeToBurn), "Stake burn failed");
        
        // Reclaim unvested rewards back into the community ecosystem pool
        require(cmnToken.transfer(_communityPool, unvestedFeesToReclaim), "Reclamation to community pool failed");
    }
}
