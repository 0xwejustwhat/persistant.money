// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event ANTMTokenAddressSet(address _antmTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event TotalANTMIssuedUpdated(uint _totalANTMIssued);

    // --- Functions ---

    function setAddresses(address _antmTokenAddress, address _stabilityPoolAddress) external;

    function issueANTM() external returns (uint);

    function sendANTM(address _account, uint _ANTMamount) external;
}
