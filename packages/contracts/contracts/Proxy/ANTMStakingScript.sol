// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IANTMStaking.sol";


contract ANTMStakingScript is CheckContract {
    IANTMStaking immutable ANTMStaking;

    constructor(address _antmStakingAddress) public {
        checkContract(_antmStakingAddress);
        ANTMStaking = IANTMStaking(_antmStakingAddress);
    }

    function stake(uint _ANTMamount) external {
        ANTMStaking.stake(_ANTMamount);
    }
}
