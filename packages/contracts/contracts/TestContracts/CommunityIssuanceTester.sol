// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ANTM/CommunityIssuance.sol"; 

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainANTM(uint _amount) external {
        antmToken.transfer(msg.sender, _amount);
    }

    function getCumulativeIssuanceFraction() external view returns (uint) {
       return _getCumulativeIssuanceFraction();
    }

    function unprotectedIssueANTM() external returns (uint) {
        // No checks on caller address
       
        uint latestTotalANTMIssued = ANTMSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalANTMIssued.sub(totalANTMIssued);
      
        totalANTMIssued = latestTotalANTMIssued;
        return issuance;
    }
}
