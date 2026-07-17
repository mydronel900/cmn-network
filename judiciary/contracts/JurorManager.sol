// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICMNToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract JurorManager {
    ICMNToken public token;
    uint256 public minStake = 10000 * 10**18; // 10k CMN minimum stake
    
    address[] public activeJurors;
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public jurorIndex;
    mapping(address => bool) public isJuror;

    event JurorStaked(address indexed juror, uint256 amount);
    event JurorUnstaked(address indexed juror, uint256 amount);

    constructor(address _token) {
        token = ICMNToken(_token);
    }

    function stakeAsJuror(uint256 _amount) external {
        require(_amount >= minStake, "Below minimum stake requirement");
        require(token.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");

        stakes[msg.sender] += _amount;

        if (!isJuror[msg.sender]) {
            isJuror[msg.sender] = true;
            jurorIndex[msg.sender] = activeJurors.length;
            activeJurors.push(msg.sender);
        }

        emit JurorStaked(msg.sender, _amount);
    }

    // Selects a panel of unique jurors pseudo-randomly based on a seed
    function drawJurors(uint256 _disputeId, uint256 _count) external view returns (address[] memory) {
        require(activeJurors.length >= _count, "Insufficient global juror pool");
        
        address[] memory chosenPanel = new address[](_count);
        uint256 poolSize = activeJurors.length;
        
        // Pseudo-random generation from block constants
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _disputeId)));

        for (uint256 i = 0; i < _count; i++) {
            uint256 index = uint256(keccak256(abi.encodePacked(seed, i))) % poolSize;
            chosenPanel[i] = activeJurors[index];
        }

        return chosenPanel;
    }

    function rewardJuror(address _juror, uint256 _amount) external {
        // In real execution restricted to JudiciaryEngine access
        token.transfer(_juror, _amount);
    }

    function slashJuror(address _juror, uint256 _amount) external {
        require(stakes[_juror] >= _amount, "Insufficient stake to slash");
        stakes[_juror] -= _amount;
        token.transfer(msg.sender, _amount); // Sends slashed tokens to Court/Burn
    }
}
