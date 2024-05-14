// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ANTM/ANTMStaking.sol";


contract ANTMStakingTester is ANTMStaking {
    function requireCallerIsTroveManager() external view {
        _requireCallerIsTroveManager();
    }
}
