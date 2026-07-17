// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICMNToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(address account, uint256 amount) external;
}

contract AppraiserRegistry {
    ICMNToken public immutable cmnToken;
    address public judiciaryEngine;

    struct Appraiser {
        uint256 stake;
        bool active;
        bool blacklisted;
    }

    mapping(address => Appraiser) public appraisers;

    event AppraiserRegistered(address indexed appraiser, uint256 stake);
    event AppraiserSlashed(address indexed appraiser, uint256 amount);

    modifier onlyJudiciary() {
        require(msg.sender == judiciaryEngine, "Only Judiciary Engine");
        _;
    }

    constructor(address _cmnToken) {
        cmnToken = ICMNToken(_cmnToken);
    }

    function setJudiciaryEngine(address _judiciaryEngine) external {
        require(judiciaryEngine == address(0), "Judiciary already set");
        judiciaryEngine = _judiciaryEngine;
    }

    function registerAppraiser() external {
        uint256 stakeAmount = 100000 * 10**18; // 100k CMN
        require(cmnToken.transferFrom(msg.sender, address(this), stakeAmount), "Staking failed");
        appraisers[msg.sender] = Appraiser({
            stake: stakeAmount,
            active: true,
            blacklisted: false
        });
        emit AppraiserRegistered(msg.sender, stakeAmount);
    }

    function slashAppraiser(address _appraiser) external onlyJudiciary {
        Appraiser storage appraiser = appraisers[_appraiser];
        require(appraiser.active, "Appraiser not active");
        uint256 stakedAmount = appraiser.stake;
        appraiser.stake = 0;
        appraiser.active = false;
        appraiser.blacklisted = true;

        // Burn the locked collateral
        cmnToken.burn(address(this), stakedAmount);
        emit AppraiserSlashed(_appraiser, stakedAmount);
    }
}
