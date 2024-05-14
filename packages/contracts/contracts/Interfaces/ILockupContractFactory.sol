// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
    
interface ILockupContractFactory {
    
    // --- Events ---

    event ANTMTokenAddressSet(address _antmTokenAddress);
    event LockupContractDeployedThroughFactory(address _lockupContractAddress, address _beneficiary, uint _unlockTime, address _deployer);

    // --- Functions ---

    function setANTMTokenAddress(address _antmTokenAddress) external;

    function deployLockupContract(address _beneficiary, uint _unlockTime) external;

    function isRegisteredLockup(address _addr) external view returns (bool);
}
